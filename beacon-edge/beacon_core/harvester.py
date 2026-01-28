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
from pyzk.zkmodules.zkbase import ZK

class Harvester:
    """
    Handles communication with ZKTeco device and log harvesting.
    """
    def __init__(self, db: Database, device_ip: str, beacon_node_id: str):
        """
        :param db: Database instance for local storage
        :param device_ip: IP address of the ZKTeco device
        :param beacon_node_id: Unique identifier for this edge node
        """
        self.db = db
        self.device_ip = device_ip
        self.beacon_node_id = beacon_node_id

    def fetch_and_store_logs(self) -> None:
        """
        Connects to ZKTeco device, fetches all attendance logs, and stores them in SQLite.
        Uses device timestamp for accuracy. Deduplicates using insert_ignore_duplicates.
        Handles connection errors gracefully.
        """
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
            print(f"[Harvester] Error communicating with ZKTeco device: {e}")
        finally:
            try:
                conn.disconnect()
            except Exception:
                pass
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
