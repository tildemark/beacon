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


# Unified Harvester: supports single or multiple devices, debug output, and future extensibility
from zk.base import ZK

class Harvester:
    def __init__(self, db: Database, beacon_node_id: str, device_ip: str = None):
        self.db = db
        self.beacon_node_id = beacon_node_id
        # Support both DEVICE_LIST and single device_ip for backward compatibility
        device_list = os.getenv('DEVICE_LIST', '')
        self.devices = []
        if device_list:
            for entry in device_list.split(','):
                if ':' in entry:
                    ip, dev_type = entry.split(':', 1)
                    self.devices.append({'ip': ip.strip(), 'type': dev_type.strip()})
        elif device_ip:
            self.devices.append({'ip': device_ip, 'type': 'ZKTeco'})

    def fetch_and_store_logs(self) -> None:
        for dev in self.devices:
            ip = dev['ip']
            dev_type = dev['type']
            print(f"[Harvester] Checking device {ip} ({dev_type})...")
            if dev_type.lower() == 'zkteco':
                try:
                    zk_password = int(os.getenv('ZK_PASSWORD', '0'))
                    zk = ZK(ip, port=4370, timeout=10, password=zk_password, force_udp=False, ommit_ping=True)
                    conn = zk.connect()
                    logs = conn.get_attendance()
                    print(f"[Harvester][DEBUG] Raw logs from device {ip}: {logs}")
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
