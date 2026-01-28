"""
Harvester module for Project BEACON Edge Gateway
------------------------------------------------
- Connects to ZKTeco device and fetches attendance logs
- Stores logs in local SQLite database (deduplicated)
- Used as a thread in main.py
"""

import os
from datetime import datetime
from typing import List, Dict, Any
from beacon_core.database import Database

# Import ZKTeco driver (add more drivers as needed)
try:
    from pyzk.zkmodules.zkbase import ZK
except ImportError:
    ZK = None

class Harvester:
    """
    Handles communication with multiple biometric devices and log harvesting.
    Supports multiple device types/models (scaffold for future extension).
    """
    def __init__(self, db: Database, beacon_node_id: str):
        self.db = db
        self.beacon_node_id = beacon_node_id
        # Parse DEVICE_LIST from .env (format: ip1:Type1,ip2:Type2,...)
        device_list = os.getenv('DEVICE_LIST', '')
        self.devices = []
        for entry in device_list.split(','):
            if ':' in entry:
                ip, dev_type = entry.split(':', 1)
                self.devices.append({'ip': ip.strip(), 'type': dev_type.strip()})

    def fetch_and_store_logs(self) -> None:
        """
        Loops through all configured devices, fetches logs, and stores them in SQLite.
        Uses correct driver/module per device type (currently only ZKTeco supported).
        """
        for dev in self.devices:
            ip = dev['ip']
            dev_type = dev['type']
            print(f"[Harvester] Checking device {ip} ({dev_type})...")
            if dev_type.lower() == 'zkteco' and ZK:
                try:
                    zk = ZK(ip, port=4370, timeout=10, password=0, force_udp=False, ommit_ping=True)
                    conn = zk.connect()
                    logs = conn.get_attendance()
                    for log in logs:
                        self.db.insert_ignore_duplicates(
                            user_id=str(log.user_id),
                            timestamp=log.timestamp,
                            punch_type=log.punch,
                            beacon_node_id=self.beacon_node_id
                        )
                    print(f"[Harvester] {len(logs)} logs fetched from {ip}")
                except Exception as e:
                    print(f"[Harvester] Error communicating with ZKTeco device {ip}: {e}")
                finally:
                    try:
                        conn.disconnect()
                    except Exception:
                        pass
            else:
                print(f"[Harvester] Device type {dev_type} not supported yet. Skipping {ip}.")
import os
from datetime import datetime
from typing import List, Dict, Any
from beacon_core.database import Database
from pyzk.zkmodules.zkbase import ZK

class Harvester:
    def __init__(self, db: Database, device_ip: str, beacon_node_id: str):
        self.db = db
        self.device_ip = device_ip
        self.beacon_node_id = beacon_node_id

    def fetch_and_store_logs(self) -> None:
        zk = ZK(self.device_ip, port=4370, timeout=10, password=0, force_udp=False, ommit_ping=True)
        try:
            conn = zk.connect()
            logs = conn.get_attendance()
            for log in logs:
                # Always trust device timestamp (not Pi system time)
                self.db.insert_ignore_duplicates(
                    user_id=str(log.user_id),
                    timestamp=log.timestamp,
                    punch_type=log.punch,
                    beacon_node_id=self.beacon_node_id
                )
        except Exception as e:
            # Log or handle connection errors as needed
            pass
        finally:
            try:
                conn.disconnect()
            except Exception:
                pass
