"""
Enhanced Fingerprint Enrollment Service for Project BEACON
-----------------------------------------------------------
Improved enrollment with proper device interaction and verification
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from zk.base import ZK
from zk import const
import os
import base64
from typing import Optional, List
import uvicorn
from datetime import datetime

try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
except ImportError:
    pass

app = FastAPI(title="BEACON Enrollment Service")

DEVICE_IP = os.getenv('DEVICE_IP', '192.168.1.196')
ZK_PASSWORD = int(os.getenv('ZK_PASSWORD', '0'))

class EnrollRequest(BaseModel):
    biometric_id: int
    name: str
    device_ip: Optional[str] = None

class EnrollResponse(BaseModel):
    success: bool
    biometric_id: int
    fingerprint_template: Optional[str] = None
    message: str
    instructions: Optional[str] = None

class VerifyRequest(BaseModel):
    biometric_id: int
    device_ip: Optional[str] = None

class DeviceInfo(BaseModel):
    ip: str
    name: str
    location: str
    status: str
    users_count: int = 0
    templates_count: int = 0
    device_name: Optional[str] = None
    firmware: Optional[str] = None

def connect_device(device_ip: str):
    """Connect to ZKTeco device"""
    zk = ZK(device_ip, port=4370, timeout=10, password=ZK_PASSWORD, force_udp=False, ommit_ping=True)
    return zk.connect()

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "enrollment", "timestamp": datetime.now().isoformat()}

@app.post("/enroll", response_model=EnrollResponse)
def enroll_fingerprint(request: EnrollRequest):
    """
    Prepare device for fingerprint enrollment
    
    Note: Most ZKTeco devices require manual enrollment through device menu.
    This endpoint creates the user and provides instructions.
    """
    device_ip = request.device_ip or DEVICE_IP
    
    print(f"[ENROLL] Preparing enrollment for ID={request.biometric_id}, Name={request.name} on {device_ip}")
    
    try:
        conn = connect_device(device_ip)
        print(f"[ENROLL] Connected to device at {device_ip}")
        
        # Check if user already exists
        existing_user = None
        try:
            users = conn.get_users()
            for user in users:
                if user.uid == request.biometric_id:
                    existing_user = user
                    print(f"[ENROLL] User ID {request.biometric_id} already exists")
                    break
        except Exception as e:
            print(f"[ENROLL] Warning checking existing users: {e}")
        
        # Create or update user on device
        try:
            conn.set_user(
                uid=request.biometric_id,
                name=request.name[:24],  # ZKTeco name limit
                privilege=const.USER_DEFAULT,
                password='',
                group_id='',
                user_id=str(request.biometric_id),
                card=0
            )
            print(f"[ENROLL] User {request.name} (ID: {request.biometric_id}) created/updated on device")
        except Exception as e:
            print(f"[ENROLL] Error creating user: {e}")
            conn.disconnect()
            raise HTTPException(status_code=500, detail=f"Failed to create user on device: {str(e)}")
        
        # Check if user has fingerprint template
        has_template = False
        template_data = None
        try:
            templates = conn.get_templates()
            for tmpl in templates:
                if tmpl.uid == request.biometric_id:
                    has_template = True
                    template_data = tmpl.template
                    print(f"[ENROLL] Found existing fingerprint template for user {request.biometric_id}")
                    break
        except Exception as e:
            print(f"[ENROLL] Could not retrieve templates: {e}")
        
        conn.disconnect()
        
        if has_template and template_data:
            # Template exists - return it
            encoded_template = base64.b64encode(template_data).decode('utf-8')
            return EnrollResponse(
                success=True,
                biometric_id=request.biometric_id,
                fingerprint_template=encoded_template,
                message=f"User {request.name} already has fingerprint enrolled",
                instructions=None
            )
        else:
            # No template - provide manual enrollment instructions
            instructions = f"""
MANUAL ENROLLMENT REQUIRED:

1. On the ZKTeco device at {device_ip}:
   - Press MENU button
   - Select 'User Mgt' → 'New Enroll' (or 'User' → 'Enroll')
   - Device will show an auto-generated ID (ignore this!)
   - MANUALLY TYPE: {request.biometric_id}
   - Press OK to confirm
   
2. Device will prompt: 'Place finger'
   - Place finger on scanner
   - Lift and place again (3 times total)
   
3. After successful enrollment:
   - Click 'Verify Enrollment' in the dashboard
   - This will retrieve the fingerprint template

⚠️ IMPORTANT: You MUST manually enter User ID {request.biometric_id} on the device.
   Do NOT use the auto-generated ID!

Note: User {request.name} has been created with ID {request.biometric_id}
"""
            
            return EnrollResponse(
                success=True,
                biometric_id=request.biometric_id,
                fingerprint_template=None,
                message=f"User created. Manual fingerprint enrollment required on device.",
                instructions=instructions
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ENROLL] Enrollment failed: {e}")
        raise HTTPException(status_code=500, detail=f"Enrollment failed: {str(e)}")

@app.post("/verify")
def verify_enrollment(request: VerifyRequest):
    """
    Verify if fingerprint is enrolled and retrieve template
    """
    device_ip = request.device_ip or DEVICE_IP
    
    print(f"[VERIFY] Checking enrollment for ID={request.biometric_id} on {device_ip}")
    
    try:
        conn = connect_device(device_ip)
        
        # Check if user has fingerprint template
        templates = conn.get_templates()
        print(f"[VERIFY] Found {len(templates)} templates on device")
        
        # Log all templates for debugging
        for tmpl in templates:
            print(f"[VERIFY]   Template UID={tmpl.uid}, FID={tmpl.fid}, Size={tmpl.size}, Valid={tmpl.valid}")
        
        template_data = None
        
        for tmpl in templates:
            # Check match with type flexibility
            if str(tmpl.uid) == str(request.biometric_id):
                template_data = tmpl.template
                print(f"[VERIFY] Found fingerprint template for user {request.biometric_id} (Match: tmpl.uid={tmpl.uid})")
                break
        
        if not template_data:
            print(f"[VERIFY] NO template found for UID {request.biometric_id}. Available UIDs: {[t.uid for t in templates]}")
        
        conn.disconnect()
        
        if template_data:
            encoded_template = base64.b64encode(template_data).decode('utf-8')
            return {
                "enrolled": True,
                "biometric_id": request.biometric_id,
                "fingerprint_template": encoded_template,
                "message": "Fingerprint is enrolled and template retrieved"
            }
        else:
            return {
                "enrolled": False,
                "biometric_id": request.biometric_id,
                "message": "No fingerprint template found. Please enroll via device menu."
            }
            
    except Exception as e:
        print(f"[VERIFY] Verification failed: {e}")
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

@app.get("/devices", response_model=List[DeviceInfo])
def list_devices():
    """List all configured devices with status"""
    # In production, this would come from database
    device_configs = [
        {"ip": DEVICE_IP, "name": "Office Device", "location": "HQ - Direct PC Connection"},
    ]
    
    devices = []
    for config in device_configs:
        device_info = DeviceInfo(
            ip=config["ip"],
            name=config["name"],
            location=config["location"],
            status="unknown",
            users_count=0,
            templates_count=0
        )
        
        try:
            conn = connect_device(config["ip"])
            device_info.status = "online"
            
            # Get device info
            try:
                device_info.device_name = conn.get_device_name()
            except:
                pass
            
            try:
                device_info.firmware = conn.get_firmware_version()
            except:
                pass
            
            # Count users and templates
            try:
                users = conn.get_users()
                device_info.users_count = len(users)
            except:
                pass
            
            try:
                templates = conn.get_templates()
                device_info.templates_count = len(templates)
            except:
                pass
            
            conn.disconnect()
        except Exception as e:
            print(f"[DEVICES] Error connecting to {config['ip']}: {e}")
            device_info.status = "offline"
        
        devices.append(device_info)
    
    return devices

@app.get("/users/{device_ip}")
def list_users(device_ip: str):
    """List all users on a specific device"""
    print(f"[USERS] Raw IP input: {repr(device_ip)}")
    device_ip = device_ip.strip()
    print(f"[USERS] Stripped IP: {repr(device_ip)}")
    try:
        if device_ip == 'undefined' or not device_ip:
            raise ValueError(f"Invalid device IP: {device_ip}")
            
        conn = connect_device(device_ip)
        users = conn.get_users()
        
        # Get templates for comparison
        templates = []
        try:
            templates = conn.get_templates()
        except:
            pass
        
        template_uids = set()
        template_map = {}
        try:
            templates = conn.get_templates()
            print(f"[USERS] Retieved {len(templates)} templates")
            for tmpl in templates:
                # Debug template info
                print(f"[USERS] Tmpl: uid={tmpl.uid} (type={type(tmpl.uid)}), fid={tmpl.fid}, size={tmpl.size}")
                template_uids.add(tmpl.uid)
                template_uids.add(str(tmpl.uid)) # Add string version too just in case
        except Exception as e:
            print(f"[USERS] Error getting templates: {e}")
        
        user_list = []
        for user in users:
            uid_val = user.uid
            # Check both int and string match
            has_fp = (uid_val in template_uids) or (str(uid_val) in template_uids)
            
            print(f"[USERS] User: uid={uid_val} (type={type(uid_val)}), name={user.name}, has_fp={has_fp}")
            
            user_list.append({
                "uid": user.uid,
                "name": user.name,
                "privilege": user.privilege,
                "has_fingerprint": has_fp,
                "card": user.card
            })
        
        conn.disconnect()
        
        return {"device_ip": device_ip, "users": user_list}
        
    except Exception as e:
        print(f"[USERS] Detailed error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list users: {str(e)}")

@app.delete("/users/{device_ip}/{uid}")
def delete_user(device_ip: str, uid: int):
    """Delete a user and their templates from the device"""
    print(f"[DELETE] Deleting user {uid} from device {device_ip}")
    try:
        conn = connect_device(device_ip)
        
        # Enable device if disabled (sometimes happens after error)
        conn.enable_device()
        
        # Delete user
        try:
            conn.delete_user(uid=uid)
            print(f"[DELETE] User {uid} deleted successfully")
        except Exception as e:
            # Check if user actually exists before failing
            users = conn.get_users()
            if any(u.uid == uid for u in users):
                print(f"[DELETE] Failed to delete user {uid}: {e}")
                raise e
            else:
                print(f"[DELETE] User {uid} was already deleted")
        
        conn.disconnect()
        return {"success": True, "message": f"User {uid} deleted successfully"}
        
    except Exception as e:
        print(f"[DELETE] Error deleting user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")

if __name__ == "__main__":
    print(f"[ENROLLMENT SERVICE] Starting server on http://localhost:8001")
    print(f"[ENROLLMENT SERVICE] Device IP: {DEVICE_IP}")
    print(f"[ENROLLMENT SERVICE] Manual enrollment mode enabled")
    uvicorn.run(app, host="0.0.0.0", port=8001)
