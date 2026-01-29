
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
        # Try to fetch a user directly from the device
        print("[TEST] Attempting to fetch a user from the device...")
        try:
            zk = ZK(DEVICE_IP, timeout=5)
            conn = zk.connect()
            users = conn.get_users()
            if users:
                user = users[0]
                print(f"[TEST] Sample user: UID={user.uid}, Name={user.name}, Privilege={user.privilege}, Card={user.card}")
            else:
                print("[TEST] No users found on device.")
            conn.disconnect()
        except Exception as ue:
            print(f"[TEST] Could not fetch user from device: {ue}")
    except Exception as e:
        print(f"[TEST] Device connectivity: FAILED\nError: {e}")

if __name__ == "__main__":
    main()
