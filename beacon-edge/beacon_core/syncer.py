"""
Syncer module for Project BEACON Edge Gateway
---------------------------------------------
- Handles uploading logs to the cloud API
- Supports LAND (real-time) and SEA (batch, GZIP) modes
- Deduplicates and marks logs as synced after upload
"""

import os
import json
import gzip
import time
import requests
import subprocess
from typing import List, Dict, Any, Optional
from beacon_core.database import Database

class Syncer:
    """
    Handles syncing unsynced logs to the cloud API.
    - LAND: Real-time, JSON upload
    - SEA: Batch, GZIP-compressed upload (500 logs max)
    """
    def __init__(self, db: Database, beacon_node_id: str, api_url: str, mode: str, token: Optional[str] = None):
        """
        :param db: Database instance
        :param beacon_node_id: Unique node ID
        :param api_url: Cloud API endpoint
        :param mode: 'LAND' or 'SEA'
        :param token: Bearer token for authentication
        """
        self.db = db
        self.beacon_node_id = beacon_node_id
        self.api_url = api_url
        self.mode = mode.upper()
        self.token = token or ""

    def _is_online(self) -> bool:
        """
        Checks internet connectivity (for SEA mode) by pinging 8.8.8.8.
        Returns True if online, False otherwise.
        """
        try:
            result = subprocess.run(['ping', '-n', '1', '8.8.8.8'], stdout=subprocess.DEVNULL)
            return result.returncode == 0
        except Exception:
            return False

    def _prepare_payload(self, logs: list) -> bytes:
        """
        GZIP-compresses the JSON payload for satellite cost savings (SEA mode).
        """
        payload = json.dumps([
            {
                'id': log[0],
                'user_id': log[1],
                'timestamp': log[2],
                'punch_type': log[3],
                'beacon_node_id': log[5]
            } for log in logs
        ])
        return gzip.compress(payload.encode('utf-8'))

    def sync(self) -> None:
        """
        Syncs unsynced logs to the cloud API.
        - LAND: Sends all unsynced logs as JSON
        - SEA: Sends up to 500 logs as GZIP-compressed JSON if online
        - OFFICE: Same as LAND, but logs as OFFICE and uses LAN intervals
        Marks logs as synced on success. Handles errors gracefully.
        """
        if self.mode in ('LAND', 'OFFICE'):
            logs = self.db.fetch_unsynced_logs()
            if not logs:
                return
            try:
                resp = requests.post(
                    self.api_url,
                    json=[{
                        'id': log[0],
                        'user_id': log[1],
                        'timestamp': log[2],
                        'punch_type': log[3],
                        'beacon_node_id': log[5]
                    } for log in logs],
                    headers={"Authorization": f"Bearer {self.token}"} if self.token else {},
                    timeout=10
                )
                if resp.status_code == 200:
                    self.db.mark_logs_synced([log[0] for log in logs])
                print(f"[Syncer] {self.mode} sync: {len(logs)} logs sent, status {resp.status_code}")
            except Exception as e:
                print(f"[Syncer] {self.mode} sync error: {e}")
        elif self.mode == 'SEA':
            if not self._is_online():
                # No connectivity, skip sync to save satellite bandwidth
                return
            logs = self.db.fetch_unsynced_logs(limit=500)
            if not logs:
                return
            compressed = self._prepare_payload(logs)
            headers = {
                'Content-Encoding': 'gzip',
                'Content-Type': 'application/json',
            }
            if self.token:
                headers['Authorization'] = f'Bearer {self.token}'
            try:
                resp = requests.post(
                    self.api_url,
                    data=compressed,
                    headers=headers,
                    timeout=30
                )
                if resp.status_code == 200:
                    self.db.mark_logs_synced([log[0] for log in logs])
            except Exception as e:
                print(f"[Syncer] SEA sync error: {e}")
import os
import json
import gzip
import time
import requests
import subprocess
from typing import List, Dict, Any
from beacon_core.database import Database

class Syncer:
    def __init__(self, db: Database, beacon_node_id: str, api_url: str, mode: str):
        self.db = db
        self.beacon_node_id = beacon_node_id
        self.api_url = api_url
        self.mode = mode.upper()

    def _is_online(self) -> bool:
        # Passive connectivity check for SEA mode
        try:
            result = subprocess.run(['ping', '-n', '1', '8.8.8.8'], stdout=subprocess.DEVNULL)
            return result.returncode == 0
        except Exception:
            return False

    def _prepare_payload(self, logs: List[Any]) -> bytes:
        # GZIP compress JSON payload for satellite cost savings
        payload = json.dumps([
            {
                'id': log[0],
                'user_id': log[1],
                'timestamp': log[2],
                'punch_type': log[3],
                'beacon_node_id': log[5]
            } for log in logs
        ])
        return gzip.compress(payload.encode('utf-8'))

    def sync(self) -> None:
        if self.mode == 'LAND':
            logs = self.db.fetch_unsynced_logs()
            if not logs:
                return
            try:
                resp = requests.post(self.api_url, json=[{
                    'id': log[0],
                    'user_id': log[1],
                    'timestamp': log[2],
                    'punch_type': log[3],
                    'beacon_node_id': log[5]
                } for log in logs], timeout=10)
                if resp.status_code == 200:
                    self.db.mark_logs_synced([log[0] for log in logs])
            except Exception:
                pass
        elif self.mode == 'SEA':
            if not self._is_online():
                # No connectivity, skip sync to save satellite bandwidth
                return
            logs = self.db.fetch_unsynced_logs(limit=500)
            if not logs:
                return
            compressed = self._prepare_payload(logs)
            headers = {'Content-Encoding': 'gzip', 'Content-Type': 'application/json'}
            try:
                resp = requests.post(self.api_url, data=compressed, headers=headers, timeout=30)
                if resp.status_code == 200:
                    self.db.mark_logs_synced([log[0] for log in logs])
            except Exception:
                pass
