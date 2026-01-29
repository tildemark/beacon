## Python Environment

It is recommended to use a Python virtual environment for all development and deployment:

```
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

# Easy Install Scripts
* For interactive setup, use the script for your platform:
  * Linux/Raspberry Pi: `beacon-edge/easy-install.sh`
  * Windows/Office: `beacon-edge/easy-install.ps1`
# Device Diagnostics and Troubleshooting

* Use `test_device.py` to print all available device info (version, serial, MAC, user/fingerprint/record counts, etc.).
* If you see "Unauthenticated" or "object has no attribute ...", check your `.env` for `ZK_PASSWORD` and see `pyzk_troubleshooting.md` for device/SDK limitations.
# Project BEACON – Developer Project Flow Documentation

## Overview

Project BEACON is a hybrid biometric attendance system connecting Land (Offices), Sea (Ships), and Office HQ (LAN) to a central HQ Cloud. It supports real-time and offline attendance logging, robust device health monitoring, and seamless integration for HR, IT, and Employees. Now includes **Office Mode** for direct LAN-based operation at HQ/branch offices without a Raspberry Pi.

---

## System Architecture
- **Edge Gateway (beacon-edge):** Python 3.9, SQLite, Docker, ZKTeco protocol (pyzk)
- **Cloud Backend (beacon-cloud):** Next.js (App Router), TypeScript, PostgreSQL (Prisma), Redis
- **Frontend UI:** React, Tailwind CSS, ShadcnUI

---

## High-Level Flow
1. **Employee clocks in/out on ZKTeco device.**
2. **Edge Gateway (Raspberry Pi or Office PC) harvests logs** from device, stores in local SQLite DB (deduplication by user/timestamp).
3. **Syncer thread uploads logs** to Cloud API:
   - LAND: Real-time JSON sync (Raspberry Pi, remote offices)
   - SEA: Batch GZIP sync (500 logs max, only when online, ships)
   - OFFICE: Real-time LAN sync (no Pi required, HQ/branch office PC/server)
4. **Cloud API authenticates node** (Bearer token), decompresses payload, upserts logs, updates node heartbeat, and sets Redis online key.
5. **Frontend dashboards**:
   - **IT/Admin:** NodeFleetGrid (node status, last sync)
   - **HR:**
     - AttendanceTable (logs, filters, confidence badge for delayed sea nodes)
     - Employee management: import from company API, add/edit employee, manage schedules
   - **Employee:** EmployeeDashboard (view own logs, file invalid/manual log requests)
6. **Employees can log in** to view their logs, file invalid log requests, or submit manual logs with proof.
7. **HR/IT can review and approve/reject requests.**

---

- Real-time and offline attendance sync
- GZIP batch sync for satellite cost savings
- Device health/heartbeat monitoring
- Robust deduplication and error handling
- Modern UI for IT, HR, and Employees
- Employee self-service: login, view logs, file requests
- HR can import employees from company API or add manually
- HR can view, assign, and update employee schedules
## Key Features

- Real-time and offline attendance sync
- GZIP batch sync for satellite cost savings
- **Office Mode:** LAN-based, Pi-less operation for HQ/office
- Device health/heartbeat monitoring
- Robust deduplication and error handling
- Modern UI for IT, HR, and Employees
- Employee self-service: login, view logs, file requests
- HR can import employees from company API or add manually
- HR can view, assign, and update employee schedules
- Manual attendance upload for offline/incompatible sites (CSV/Excel or form)

---

## Database Models (Prisma)
- **User:** Employees, HR, IT (role-based)
- **BeaconNode:** Edge device (land/sea)
- **AttendanceLog:** Each attendance event
- **InvalidLogRequest:** Employee requests review of a log
- **ManualLogRequest:** Employee submits a manual log with proof

---

## Authentication
- All users (Employee, HR, IT) can log in
- Session-based or JWT authentication (recommend NextAuth.js)
- Role-based access for dashboards and API endpoints

---

## API Endpoints
- **/api/beacon/sync:** Edge log upload (Bearer token, GZIP/JSON)
- **/api/employee/logs:** Get own logs
- **/api/employee/invalid-log-request:** File invalid log request
- **/api/employee/manual-log-request:** Submit manual log with proof
- **/api/hr/review-requests:** HR reviews/approves/rejects requests

---

## Frontend Components
- **NodeFleetGrid.tsx:** IT/Admin dashboard for node status
- **AttendanceTable.tsx:** HR dashboard for attendance logs
- **EmployeeDashboard.tsx:** Employee dashboard (view logs, file requests)
- **InvalidLogRequestForm.tsx:** Form to file invalid log request
- **ManualLogRequestForm.tsx:** Form to submit manual log with proof

---

## Developer Onboarding Steps
1. **Clone the repository.**
2. **Set up environment variables** for both edge and cloud (.env files).
3. **Run database migrations** (`npx prisma migrate deploy`).
4. **Install dependencies** (`pnpm install` for cloud, `pip install -r requirements.txt` for edge).
5. **Start services** (Docker Compose for edge, `pnpm dev` for cloud).
6. **Review the code structure and documentation.**
7. **Start implementing or extending features as needed.**

---

## Session Log
See `SESSION_LOG.md` for a summary of major architectural and design decisions, feature additions, and AI prompt updates.

---

## AI Prompt
See `ai-prompt.md` for the latest system prompt and update it as new features or flows are added.
