## Device Info & pyzk Limitations

- The `test_device.py` script will attempt to print all available device info (version, serial, MAC, user/fingerprint/record counts, etc.).
- If you see `object has no attribute ...`, it means pyzk or your device firmware does not support that feature.
- For K14 and similar models, the communication password (Menu → Communication → Device Password) must match `ZK_PASSWORD` in `.env`.
- Some firmware restricts user data access via SDK. If you see "Unauthenticated" even with the correct password, this is a device/firmware limitation.
# Troubleshooting pyzk Installation and Import Issues

## Common Issues
- ModuleNotFoundError: No module named 'pyzk' or 'zk'
- Import errors due to package structure changes
- Permissions errors when creating beacon.db

## Steps to Resolve

1. **Check Python Environment**
   - Ensure you are using the correct Python interpreter (the one where pyzk is installed).
   - Use `python -m pip install pyzk` to install for the active interpreter.

2. **Install pyzk from GitHub if PyPI version fails**
   - Uninstall existing pyzk: `pip uninstall pyzk`
   - Install from GitHub: `pip install git+https://github.com/fananimi/pyzk.git`

3. **Update Import Paths**
   - For recent pyzk versions, use:
     ```python
     from zk.base import ZK
     ```
   - Older code may use:
     ```python
     from pyzk.zkmodules.zkbase import ZK
     ```
   - Update all imports to match the installed package structure.

4. **Database File Issues**
   - If you see `sqlite3.OperationalError: unable to open database file`, check:
     - beacon.db should be a file, not a folder.
     - The directory is writable and not locked.
     - Delete beacon.db if it is a directory, then rerun the script.

5. **Permissions**
   - Run terminal/VS Code as administrator if you see permission denied errors.
   - Ensure your user has write access to the project directory.

6. **Debugging**
   - Add print statements to show resolved paths and permissions.
   - Use a minimal script to test file creation if needed.

## Example Diagnostic Script
```python
import os
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), 'beacon.db'))
parent_dir = os.path.dirname(DB_PATH)
print(f"CWD: {os.getcwd()}")
print(f"DB_PATH: {DB_PATH}")
print(f"Parent dir exists: {os.path.exists(parent_dir)}")
print(f"Parent dir writable: {os.access(parent_dir, os.W_OK)}")
try:
    with open(DB_PATH, 'a'):
        print("Successfully opened/created beacon.db")
except Exception as e:
    print(f"Failed to open/create beacon.db: {e}")
```

---

Keep this guide in the repo for future reference.
