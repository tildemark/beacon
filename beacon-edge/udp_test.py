import socket

DEVICE_IP = "10.10.1.100"
PORT = 4370
TIMEOUT = 2

print(f"[UDP TEST] Sending UDP packet to {DEVICE_IP}:{PORT}...")
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.settimeout(TIMEOUT)
try:
    s.sendto(b'\x00', (DEVICE_IP, PORT))
    print("[UDP TEST] Packet sent. Waiting for response...")
    data, addr = s.recvfrom(1024)
    print(f"[UDP TEST] Response from {addr}: {data}")
except socket.timeout:
    print("[UDP TEST] No UDP response (timeout)")
except Exception as e:
    print(f"[UDP TEST] Error: {e}")
finally:
    s.close()
