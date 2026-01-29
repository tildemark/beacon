"""
Debug script to list all users and templates on ZKTeco device
"""
import os
from zk.base import ZK

try:
    from dotenv import load_dotenv
    load_dotenv()
except:
    pass

DEVICE_IP = os.getenv('DEVICE_IP', '192.168.1.196')
ZK_PASSWORD = int(os.getenv('ZK_PASSWORD', '0'))

print(f"Connecting to device at {DEVICE_IP}...")
zk = ZK(DEVICE_IP, port=4370, timeout=10, password=ZK_PASSWORD, force_udp=False, ommit_ping=True)

try:
    conn = zk.connect()
    print("Connected!")
    
    users = conn.get_users()
    uids = sorted([user.uid for user in users])
    print(f"ALL USED UIDS: {uids}")
    
    # Also check templates just in case there are templates without users (orphans)
    templates = conn.get_templates()
    template_uids = sorted(list(set([t.uid for t in templates])))
    print(f"ALL TEMPLATE UIDS: {template_uids}")
    
    all_taken = sorted(list(set(uids + template_uids)))
    print(f"COMBINED TAKEN IDS: {all_taken}")
    
    # Suggest next 5 free IDs
    free_ids = []
    check = 1
    while len(free_ids) < 5:
        if check not in all_taken:
            free_ids.append(check)
        check += 1
    print(f"SUGGESTED FREE IDS: {free_ids}")

    conn.disconnect()
    
except Exception as e:
    print(f"Error: {e}")
