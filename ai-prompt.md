Act as a Principal Full-Stack IoT Architect. I need you to scaffold a complete, end-to-end solution for **Project BEACON** (Basic Employee Attendance Connecting Oceans & Networks).



**Project Objective:**
A hybrid biometric attendance system connecting Land (Offices), Sea (Ships), and Office HQ (LAN) to a central HQ Cloud.
- **Land Nodes:** Raspberry Pi 4 (Real-time sync).
- **Sea Nodes:** Raspberry Pi Zero 2 W (Offline buffering, GZIP batch sync via Satellite).
- **Office Mode:** Standard PC/server (no Pi required), direct LAN sync for HQ/branch offices.
- **HQ Cloud:** Central management for IT (Device Health), HR (Payroll/Logs), and Employee self-service (view logs, file requests).

- Employee login and dashboard (view own logs)
- Employees can file invalid log requests (for wrong/missing punches)
- Employees can submit manual log requests (if they forgot to time in/out), with file upload (proof)
- HR/IT can review and approve/reject requests
- HR can import employees from company API or add manually
- HR can view, assign, and update employee schedules
**Recent Additions:**
- Employee login and dashboard (view own logs)
- Employees can file invalid log requests (for wrong/missing punches)
- Employees can submit manual log requests (if they forgot to time in/out), with file upload (proof)
- HR/IT can review and approve/reject requests
- HR can import employees from company API or add manually
- HR can view, assign, and update employee schedules
- Manual attendance upload for offline/incompatible sites (CSV/Excel or form)
5.  **Manual Attendance Upload (`/hr/manual-upload`):**
    - HR can upload attendance logs via CSV/Excel or form for locations without internet, Pi, or compatible biometric device
- Employee login and dashboard (view own logs)
- Employees can file invalid log requests (for wrong/missing punches)
- Employees can submit manual log requests (if they forgot to time in/out), with file upload (proof)
- HR/IT can review and approve/reject requests
- HR can import employees from company API or add manually
- HR can view, assign, and update employee schedules
4.  **HR Employee Management (`/hr/employees`):**
    - **Import employees** from company API (bulk)
    - **Add/edit single employee**
    - **View and manage employee schedules**

**Technology Stack:**
- **Edge (Nodes):** Python 3.9, SQLite, Docker, `pyzk` (ZKTeco Protocol).
- **Cloud Backend:** Next.js (App Router), TypeScript, PostgreSQL (Prisma), Redis.
- **Frontend UI:** Tailwind CSS, ShadcnUI.

---

### Part 1: The Edge Gateway (Python)
Create the project structure for `beacon-edge/`.

1.  **Core Logic (`main.py`):**
    - Implement two threaded loops:
        - **Harvester:** Connects to ZKTeco (UDP/TCP 4370), fetches logs, saves to local SQLite `beacon_logs` table (handling duplicates). *Crucial: Use device timestamp.*
        - **Syncer:** Reads env var `BEACON_MODE`.
            - `MODE=LAND`: POSTs new logs to Cloud API every 30s.
            - `MODE=SEA`: Checks internet (ping 8.8.8.8). If online, selects 500 logs, GZIP compresses payload, POSTs to Cloud. On success (200 OK), marks logs as synced.
            - `MODE=OFFICE`: Real-time LAN sync, no Pi required (for HQ/branch office PC/server).
2.  **Docker:**
    - Provide a `Dockerfile` optimized for ARMv7/v8 (Pi Zero).
    - Provide a `docker-compose.yml` with `restart: always` and memory limits (256MB).

---

### Part 2: The HQ Cloud (Next.js & Prisma)
Create the project structure for `beacon-cloud/`.

1.  **Database Schema (`schema.prisma`):**
    - `BeaconNode`: id (UUID), name, type (LAND/SEA), token (auth key), tailscale_ip, last_heartbeat.
    - `AttendanceLog`: composite unique key (user_id + timestamp), relation to Node.
2.  **API Route (`app/api/beacon/sync/route.ts`):**
    - Accept POST requests.
    - Validate `Bearer <token>` header against `BeaconNode`.
    - Detect `Content-Encoding: gzip` and decompress if needed.
    - Upsert logs using `prisma.attendanceLog.createMany({ skipDuplicates: true })`.
    - Update `BeaconNode.last_heartbeat` and set Redis key `node:{id}:online` = true.

---


### Part 3: The Interfaces (Frontend)
Describe the React components needed:

1.  **IT Dashboard (`/admin/nodes`):**
    - **`NodeFleetGrid.tsx`:** Cards showing Node Name, Type (Badge), and "Online/Offline" status based on Redis/Heartbeat.
    - Show `Last Sync` time relative to now (e.g., "Synced 2 hours ago").
2.  **HR Dashboard (`/hr/attendance`):**
    - **`AttendanceTable.tsx`:** Data table with filters for Date, Location (Node), and Employee.
    - **Confidence Badge:** If filtering by a Sea Node that hasn't synced in >4 hours, show a warning: "⚠️ Data may be delayed (Ship Offline)."
3.  **Employee Dashboard (`/employee/dashboard`):**
    - **`EmployeeDashboard.tsx`:** Employee can view their own logs, file invalid log requests, and submit manual log requests with proof.
    - **`InvalidLogRequestForm.tsx`:** Form to file invalid log request (select log, provide reason)
    - **`ManualLogRequestForm.tsx`:** Form to submit manual log (date/time, node, punch type, reason, file upload for proof)

---


**Deliverables:**
1.  Complete file structure tree.
2.  The full `main.py` code for the Edge Gateway.
3.  The `schema.prisma` file (including User, InvalidLogRequest, ManualLogRequest, RequestStatus, UserRole).
4.  The `route.ts` code for the Sync API.
5.  A summary of the "Easy Install" script logic for IT.
6.  Employee authentication and dashboard scaffolding.
7.  API and UI for invalid/manual log requests (with proof upload).

**Tone:**
Production-ready, strict TypeScript, robust error handling for network failures (Satellite latency), and clean architecture.