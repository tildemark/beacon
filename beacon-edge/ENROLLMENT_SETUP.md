# Project BEACON - Real ZKTeco Enrollment Setup

## Enrollment Service Architecture

The enrollment system consists of two components:

1. **Python Enrollment Service** (`beacon-edge/enrollment_service.py`)
   - FastAPI service running on port 8001
   - Connects to ZKTeco device using `pyzk`
   - Handles actual fingerprint enrollment

2. **Next.js Backend API** (`beacon-cloud/app/api/hr/employees/[id]/enroll`)
   - Calls Python service via HTTP
   - Stores enrollment data in PostgreSQL

---

## Setup Instructions

### 1. Install Python Dependencies

```powershell
cd c:\code\beacon\beacon-edge
pip install -r requirements.txt
```

### 2. Configure Environment Variables

**beacon-edge/.env:**
```env
DEVICE_IP=192.168.1.196  # Your ZKTeco device IP
ZK_PASSWORD=0             # Device password (usually 0)
```

**beacon-cloud/.env:**
```env
# Add this line
ENROLLMENT_SERVICE_URL=http://localhost:8001
DEVICE_IP=192.168.1.196
```

### 3. Start Enrollment Service

Open a new terminal in `beacon-edge`:
```powershell
cd c:\code\beacon\beacon-edge
python enrollment_service.py
```

Service will start on: http://localhost:8001

### 4. Test Enrollment Service

```powershell
# Health check
curl http://localhost:8001/health

# List devices
curl http://localhost:8001/devices
```

---

## Enrollment Flow

1. **HR clicks "Enroll" in dashboard**
2. **Next.js backend** → calls `/api/hr/employees/[id]/enroll`
3. **Python service** → connects to ZKTeco device
4. **Device creates user** with biometric ID
5. **User scans finger** 3 times on device
6. **Python service** → retrieves fingerprint template
7. **Next.js backend** → saves template to database
8. **Success!** Employee can now use fingerprint at gates

### User Linking (Manual Enrollment)
If a user is enrolled directly on the device (bypassing the app):
1. Go to **Device Management** > **View Users**
2. Identify "Not Linked" users (red status)
3. Use the **Link** dropdown to assign the biometric ID to an existing employee
4. This syncs the database with the device data

---

## API Endpoints

### Python Service

**POST /enroll**
```json
{
  "biometric_id": 1001,
  "name": "John Doe",
  "device_ip": "192.168.1.196"
}
```

Response:
```json
{
  "success": true,
  "biometric_id": 1001,
  "fingerprint_template": "base64_encoded_data",
  "message": "Fingerprint enrolled successfully"
}
```

**GET /devices**
```json
{
  "devices": [
    {
      "ip": "192.168.1.196",
      "name": "Office Device",
      "location": "Direct PC Connection"
    }
  ]
}
```

**GET /health**
```json
{
  "status": "ok",
  "service": "enrollment"
}
```

---

## Enrollment Process Details

### What Happens on the Device:

1. Service connects to ZKTeco device
2. Creates/updates user with biometric ID and name
3. Activates enrollment mode
4. **DEVICE ACTION REQUIRED:**
   - Device will beep
   - Employee places finger on scanner
   - Lift and place again (3 times total)
5. Device saves fingerprint template
6. Service retrieves template
7. Returns base64 encoded data

### Important Notes:

- **Manual Interaction Required**: Employee must be present at device
- **Wait Time**: 30 seconds allowed for finger scans
- **Device Feedback**: Device beeps to indicate scan success/failure
- **Re-enrollment**: Existing users can be re-enrolled (old fingerprint is deleted first)

---

## Troubleshooting

### Service Won't Start
```powershell
# Check Python installation
python --version

# Check dependencies
pip list | findstr fastapi

# Reinstall if needed
pip install fastapi uvicorn pydantic
```

### Cannot Connect to Device
```powershell
# Test device connectivity
cd c:\code\beacon\beacon-edge
python test_device.py

# Check device IP is reachable
ping 192.168.1.196
```

### Enrollment Fails
- Ensure device is not in use by another application
- Check device password in .env
- Verify employee ID is unique
- Try manual enrollment on device to test hardware

### Verification Fails (No Template Found)
If you see "No fingerprint template found" even after enrolling:
- **Restart the Service**: Python captures types on startup.
- **Check Device IP**: Ensure you are connecting to the correct device.
- **Type Mismatch**: The service now supports both Integer and String ID matching (Fixed in `enrollment_service.py`). Ensure your version is up to date.

---

## Testing the Complete Flow

1. **Start all services:**
   ```powershell
   # Terminal 1: Python enrollment service
   cd c:\code\beacon\beacon-edge
   python enrollment_service.py

   # Terminal 2: Next.js dev server
   cd c:\code\beacon\beacon-cloud
   pnpm dev
   ```

2. **Login to HR dashboard:**
   - Go to http://localhost:3000
   - Login as hr@test.com / password123

3. **Enroll an employee:**
   - Go to Employees tab
   - Click "Enroll" for employee@test.com
   - Select "Office Device"
   - Click "Start Enrollment"
   - **Go to the ZKTeco device and scan finger 3 times**
4. **Verify:**
   - Check database for fingerprint template
   - Employee should show ✓ Enrolled with ID

---

## Production Deployment

### For Multiple Devices:

Update `enrollment_service.py`:
```python
@app.get("/devices")
def list_devices():
    return {
        "devices": [
            {"ip": "192.168.1.196", "name": "Office Device", "location": "HQ"},
            {"ip": "192.168.1.201", "name": "HR Device", "location": "HR Office"},
            {"ip": "192.168.1.202", "name": "IT Device", "location": "IT Office"},
        ]
    }
```

### Run as Service (Windows):

Use `nssm` or Task Scheduler to run enrollment service on startup.

---

## Next Steps

- [ ] Start enrollment service
- [ ] Test enrollment with real device
- [ ] Enroll test users
- [ ] Configure edge nodes to sync users
- [ ] Test end-to-end fingerprint authentication
