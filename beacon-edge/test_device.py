
print("[DEBUG] test_device.py started")
"""
Device Connectivity Tester for Project BEACON Edge Gateway
---------------------------------------------------------
- Checks ZKTeco device connectivity and fetches a sample of attendance logs
- Prints results to console for quick diagnostics
- Usage: python test_device.py
"""


import os
from zk.base import ZK
from beacon_core.harvester import Harvester
from beacon_core.database import Database
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
except ImportError:
    pass  # dotenv is optional, fallback to os.environ

DEVICE_IP = os.getenv('DEVICE_IP', '192.168.1.196')
BEACON_NODE_ID = os.getenv('BEACON_NODE_ID', 'test-node')

def main():
    print(f"[TEST] Checking ZKTeco device at {DEVICE_IP}...")
    # Network ping test
    import subprocess
    try:
        result = subprocess.run(["ping", "-n", "1", DEVICE_IP], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if result.returncode == 0:
            print(f"[TEST] Network ping to {DEVICE_IP}: OK")
        else:
            print(f"[TEST] Network ping to {DEVICE_IP}: FAILED")
            return
    except Exception as e:
        print(f"[TEST] Network ping error: {e}")
        return

    print("[DEBUG] Instantiating Database()...")
    try:
        db = Database()
    except Exception as e:
        print(f"[TEST] Database connection failed: {e}")
        return

    harvester = Harvester(db, BEACON_NODE_ID, DEVICE_IP)
    try:
        # Capture stdout to detect harvester errors
        import io, sys
        old_stdout = sys.stdout
        sys.stdout = mystdout = io.StringIO()
        harvester.fetch_and_store_logs()
        sys.stdout = old_stdout
        harvester_output = mystdout.getvalue()
        print(harvester_output, end="")
        if "Error communicating with" in harvester_output:
            print("[TEST] Device connectivity: FAILED (see above for details)")
            return
        print("[TEST] Device connectivity: OK")
        logs = db.fetch_unsynced_logs(limit=5)
        print(f"[TEST] Sample logs fetched (up to 5): {logs if logs else 'No logs found.'}")

        print("[TEST] Querying device info via pyzk...")
        from zk.base import ZK
        zk_password = int(os.getenv('ZK_PASSWORD', '0'))
        zk = ZK(DEVICE_IP, port=4370, timeout=10, password=zk_password, force_udp=False, ommit_ping=True)
        try:
            conn = zk.connect()
            # Device info
            try:
                print(f"  Device Name: {conn.get_device_name()}")
            except Exception as e:
                print(f"  Device Name: [Unavailable] {e}")
            try:
                print(f"  Platform: {conn.get_platform()}")
            except Exception as e:
                print(f"  Platform: [Unavailable] {e}")
            try:
                print(f"  Serial Number: {conn.get_serialnumber()}")
            except Exception as e:
                print(f"  Serial Number: [Unavailable] {e}")
            try:
                print(f"  Firmware Version: {conn.get_firmware_version()}")
            except Exception as e:
                print(f"  Firmware Version: [Unavailable] {e}")
            try:
                print(f"  MAC Address: {conn.get_mac()}")
            except Exception as e:
                print(f"  MAC Address: [Unavailable] {e}")
            try:
                print(f"  IP Address: {conn.get_ip()}")
            except Exception as e:
                print(f"  IP Address: [Unavailable] {e}")
            try:
                print(f"  Port: {conn.get_port()}")
            except Exception as e:
                print(f"  Port: [Unavailable] {e}")
            try:
                print(f"  Device Time: {conn.get_time()}")
            except Exception as e:
                print(f"  Device Time: [Unavailable] {e}")
            # Capacity info
            try:
                print(f"  User Count: {conn.get_user_count()}")
            except Exception as e:
                print(f"  User Count: [Unavailable] {e}")
            try:
                print(f"  Fingerprint Count: {conn.get_fingerprint_count()}")
            except Exception as e:
                print(f"  Fingerprint Count: [Unavailable] {e}")
            try:
                print(f"  Attendance Record Count: {conn.get_attendance_count()}")
            except Exception as e:
                print(f"  Attendance Record Count: [Unavailable] {e}")
            try:
                print(f"  Free Record Space: {conn.get_free_record_count()}")
            except Exception as e:
                print(f"  Free Record Space: [Unavailable] {e}")
            # Try to fetch a user directly from the device
            print("[TEST] Attempting to fetch a user from the device...")
            try:
                users = conn.get_users()
                if users:
                    user = users[0]
                    print(f"[TEST] Sample user: UID={user.uid}, Name={user.name}, Privilege={user.privilege}, Card={user.card}")
                else:
                    print("[TEST] No users found on device.")
            except Exception as ue:
                print(f"[TEST] Could not fetch user from device: {ue}")
            conn.disconnect()
        except Exception as e:
            print(f"[TEST] Could not connect/query device: {e}")
    except Exception as e:
        print(f"[TEST] Device connectivity: FAILED\nError: {e}")

if __name__ == "__main__":
    main()
