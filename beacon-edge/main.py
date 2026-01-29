import os
import threading
import time
import uuid
from beacon_core.database import Database
from beacon_core.harvester import Harvester
from beacon_core.syncer import Syncer

BEACON_MODE = os.getenv('BEACON_MODE', 'LAND').upper()
DEVICE_IP = os.getenv('DEVICE_IP', '192.168.1.201')
API_URL = os.getenv('CLOUD_API_URL', 'https://api.example.com/beacon/sync')
BEACON_TOKEN = os.getenv('BEACON_TOKEN', '')
BEACON_NODE_ID = os.getenv('BEACON_NODE_ID', str(uuid.uuid4()))

POLL_INTERVALS = {
	'LAND': {'harvest': 60, 'sync': 30},
	'SEA': {'harvest': 60, 'sync': 900},  # 900s = 15min
	'OFFICE': {'harvest': 30, 'sync': 10}  # Faster polling for LAN
}

db = Database()
harvester = Harvester(db, DEVICE_IP, BEACON_NODE_ID)
syncer = Syncer(db, BEACON_NODE_ID, API_URL, BEACON_MODE, BEACON_TOKEN)


def harvester_thread():
	while True:
		try:
			harvester.fetch_and_store_logs()
		except Exception as e:
			print(f"[Harvester] Error: {e}")
		time.sleep(POLL_INTERVALS.get(BEACON_MODE, POLL_INTERVALS['LAND'])['harvest'])


def syncer_thread():
	while True:
		try:
			syncer.sync()
		except Exception as e:
			print(f"[Syncer] Error: {e}")
		time.sleep(POLL_INTERVALS.get(BEACON_MODE, POLL_INTERVALS['LAND'])['sync'])

def main():
	t1 = threading.Thread(target=harvester_thread, daemon=True)
	t2 = threading.Thread(target=syncer_thread, daemon=True)
	t1.start()
	t2.start()
	t1.join()
	t2.join()

if __name__ == '__main__':
	main()