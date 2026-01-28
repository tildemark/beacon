import os


# Compute the absolute path for beacon.db as in the Database class (beacon-edge directory)
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), 'beacon.db'))
parent_dir = os.path.dirname(DB_PATH)

print(f"[DEBUG] CWD: {os.getcwd()}")
print(f"[DEBUG] DB_PATH: {DB_PATH}")
print(f"[DEBUG] Parent directory: {parent_dir}")
print(f"[DEBUG] Parent directory exists: {os.path.exists(parent_dir)}")
print(f"[DEBUG] Parent directory writable: {os.access(parent_dir, os.W_OK)}")

try:
    with open(DB_PATH, 'a'):
        print("[DEBUG] Successfully opened/created beacon.db for appending.")
except Exception as e:
    print(f"[DEBUG] Failed to open/create beacon.db: {e}")
