"""
Database module for Project BEACON Edge Gateway
-----------------------------------------------
- Handles all SQLite operations (thread-safe)
- Deduplicates logs by (user_id, timestamp)
- Used by harvester and syncer modules
"""

import sqlite3
from typing import Any, List, Tuple, Optional
from datetime import datetime

import os
import threading

# Thread lock for safe concurrent DB access
DB_LOCK = threading.Lock()

# Default SQLite DB path (absolute path in beacon-edge directory)
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'beacon-edge', 'beacon.db'))

# SQL to create the beacon_logs table (deduplicated by user_id, timestamp, punch_type, beacon_node_id)
CREATE_TABLE_SQL = '''
CREATE TABLE IF NOT EXISTS beacon_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    timestamp DATETIME NOT NULL,
    punch_type INTEGER NOT NULL,
    sync_status INTEGER NOT NULL DEFAULT 0,
    beacon_node_id TEXT NOT NULL,
    UNIQUE(user_id, timestamp, punch_type, beacon_node_id)
);
'''

class Database:
    """
    SQLite database handler for BEACON logs.
    - Ensures table exists on init
    - Provides safe insert, fetch, and update methods
    """
    def __init__(self, db_path: str = DB_PATH):
        import os
        print(f"[DEBUG] CWD: {os.getcwd()}")
        print(f"[DEBUG] DB_PATH resolved: {db_path}")
        parent_dir = os.path.dirname(db_path)
        print(f"[DEBUG] Parent directory: {parent_dir}")
        print(f"[DEBUG] Parent directory exists: {os.path.exists(parent_dir)}")
        print(f"[DEBUG] Parent directory writable: {os.access(parent_dir, os.W_OK)}")
        self.db_path = db_path
        self._init_db()

    def _init_db(self) -> None:
        """
        Create the beacon_logs table if it doesn't exist.
        """
        with DB_LOCK, sqlite3.connect(self.db_path) as conn:
            conn.execute(CREATE_TABLE_SQL)
            conn.commit()

    def insert_logs_safely(self, user_id: str, timestamp: datetime, punch_type: int, beacon_node_id: str) -> None:
        """
        Insert a log, handling UNIQUE(user_id, timestamp) collisions gracefully.
        Used by harvester for fast deduplication.
        """
        with DB_LOCK, sqlite3.connect(self.db_path) as conn:
            try:
                conn.execute(
                    'INSERT INTO beacon_logs (user_id, timestamp, punch_type, sync_status, beacon_node_id) VALUES (?, ?, ?, 0, ?)',
                    (user_id, timestamp, punch_type, beacon_node_id)
                )
                conn.commit()
            except sqlite3.IntegrityError:
                # Duplicate entry, ignore
                pass

    def insert_ignore_duplicates(self, user_id: str, timestamp: datetime, punch_type: int, beacon_node_id: str) -> None:
        """
        Insert a log if it does not already exist (by user_id, timestamp, punch_type, beacon_node_id).
        Prevents double-counting on reconnection or re-harvest.
        Used by harvester for extra deduplication.
        """
        with DB_LOCK, sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT 1 FROM beacon_logs WHERE user_id=? AND timestamp=? AND punch_type=? AND beacon_node_id=?
            ''', (user_id, timestamp, punch_type, beacon_node_id))
            if cursor.fetchone() is None:
                cursor.execute('''
                    INSERT INTO beacon_logs (user_id, timestamp, punch_type, sync_status, beacon_node_id)
                    VALUES (?, ?, ?, 0, ?)
                ''', (user_id, timestamp, punch_type, beacon_node_id))
                conn.commit()

    def fetch_unsynced_logs(self, limit: Optional[int] = None) -> List[Tuple[Any, ...]]:
        """
        Fetch all logs that have not yet been synced to the cloud.
        Optionally limit the number of logs (for SEA batch sync).
        Returns: List of tuples (all columns)
        """
        with DB_LOCK, sqlite3.connect(self.db_path) as conn:
            sql = 'SELECT * FROM beacon_logs WHERE sync_status=0 ORDER BY timestamp ASC'
            if limit:
                sql += f' LIMIT {limit}'
            return conn.execute(sql).fetchall()

    def mark_logs_synced(self, ids: List[int]) -> None:
        """
        Mark logs as synced (sync_status=1) by their IDs.
        Used by syncer after successful upload.
        """
        if not ids:
            return
        with DB_LOCK, sqlite3.connect(self.db_path) as conn:
            conn.executemany('UPDATE beacon_logs SET sync_status=1 WHERE id=?', [(i,) for i in ids])
            conn.commit()
import sqlite3
from typing import Any, List, Tuple, Optional
from datetime import datetime
import threading

DB_LOCK = threading.Lock()

DB_PATH = 'beacon.db'

CREATE_TABLE_SQL = '''
CREATE TABLE IF NOT EXISTS beacon_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    timestamp DATETIME NOT NULL,
    punch_type INTEGER NOT NULL,
    sync_status INTEGER NOT NULL DEFAULT 0,
    beacon_node_id TEXT NOT NULL
);
'''

class Database:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _init_db(self) -> None:
        with DB_LOCK, sqlite3.connect(self.db_path) as conn:
            conn.execute(CREATE_TABLE_SQL)
            conn.commit()

    def insert_ignore_duplicates(self, user_id: str, timestamp: datetime, punch_type: int, beacon_node_id: str) -> None:
        """
        Insert a log if it does not already exist (by user_id, timestamp, punch_type, beacon_node_id).
        Prevents double-counting on reconnection or re-harvest.
        """
        with DB_LOCK, sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT 1 FROM beacon_logs WHERE user_id=? AND timestamp=? AND punch_type=? AND beacon_node_id=?
            ''', (user_id, timestamp, punch_type, beacon_node_id))
            if cursor.fetchone() is None:
                cursor.execute('''
                    INSERT INTO beacon_logs (user_id, timestamp, punch_type, sync_status, beacon_node_id)
                    VALUES (?, ?, ?, 0, ?)
                ''', (user_id, timestamp, punch_type, beacon_node_id))
                conn.commit()

    def fetch_unsynced_logs(self, limit: Optional[int] = None) -> List[Tuple[Any, ...]]:
        with DB_LOCK, sqlite3.connect(self.db_path) as conn:
            sql = 'SELECT * FROM beacon_logs WHERE sync_status=0 ORDER BY timestamp ASC'
            if limit:
                sql += f' LIMIT {limit}'
            return conn.execute(sql).fetchall()

    def mark_logs_synced(self, ids: List[int]) -> None:
        if not ids:
            return
        with DB_LOCK, sqlite3.connect(self.db_path) as conn:
            conn.executemany('UPDATE beacon_logs SET sync_status=1 WHERE id=?', [(i,) for i in ids])
            conn.commit()
