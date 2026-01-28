
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

DEVICE_IP = os.getenv('DEVICE_IP', '192.168.1.201')
BEACON_NODE_ID = os.getenv('BEACON_NODE_ID', 'test-node')

def main():
    print(f"[TEST] Checking ZKTeco device at {DEVICE_IP}...")
    print("[DEBUG] Instantiating Database()...")
    db = Database()
    harvester = Harvester(db, DEVICE_IP, BEACON_NODE_ID)
    try:
        harvester.fetch_and_store_logs()
        print("[TEST] Device connectivity: OK")
        logs = db.fetch_unsynced_logs(limit=5)
        print(f"[TEST] Sample logs fetched (up to 5): {logs if logs else 'No logs found.'}")
    except Exception as e:
        print(f"[TEST] Device connectivity: FAILED\nError: {e}")

if __name__ == "__main__":
    main()
