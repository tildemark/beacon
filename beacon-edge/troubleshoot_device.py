import os
import socket
import subprocess
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
    print("[TROUBLESHOOT] .env loaded via python-dotenv.")
except ImportError:
    print("[TROUBLESHOOT] python-dotenv not installed, relying on shell environment.")

DEVICE_IP = os.getenv('DEVICE_IP', '192.168.1.196')
PORT = int(os.getenv('DEVICE_PORT', '4370'))
TIMEOUT = 2

print(f"[TROUBLESHOOT] Device IP: {DEVICE_IP}, Port: {PORT}")
print(f"[TROUBLESHOOT] .env values: DEVICE_IP={os.getenv('DEVICE_IP')}, BEACON_NODE_ID={os.getenv('BEACON_NODE_ID')}, BEACON_MODE={os.getenv('BEACON_MODE')}")

# 1. Ping test
print("[TROUBLESHOOT] Pinging device...")
ping_result = subprocess.run(["ping", "-n", "2", DEVICE_IP], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
print(ping_result.stdout.decode())

# 2. TCP port scan
print(f"[TROUBLESHOOT] Testing TCP port {PORT}...")
s_tcp = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s_tcp.settimeout(TIMEOUT)
try:
    s_tcp.connect((DEVICE_IP, PORT))
    print(f"[TROUBLESHOOT] TCP port {PORT} is OPEN.")
    s_tcp.close()
except Exception as e:
    print(f"[TROUBLESHOOT] TCP port {PORT} is CLOSED or unreachable: {e}")

# 3. UDP test
print(f"[TROUBLESHOOT] Sending UDP packet to {DEVICE_IP}:{PORT}...")
s_udp = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s_udp.settimeout(TIMEOUT)
try:
    s_udp.sendto(b'\x00', (DEVICE_IP, PORT))
    print("[TROUBLESHOOT] UDP packet sent. Waiting for response...")
    data, addr = s_udp.recvfrom(1024)
    print(f"[TROUBLESHOOT] UDP response from {addr}: {data}")
except socket.timeout:
    print("[TROUBLESHOOT] No UDP response (timeout)")
except Exception as e:
    print(f"[TROUBLESHOOT] UDP test error: {e}")
finally:
    s_udp.close()

print("[TROUBLESHOOT] Done.")
