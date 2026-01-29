# Project BEACON

### (Basic Employee Attendance Connecting Oceans & Networks)

**Project BEACON** is a hybrid biometric attendance system connecting Land (Offices), Sea (Ships), and HQ (LAN) to a central Cloud. It provides real-time and offline attendance logging, robust device health monitoring, and seamless integration for HR and IT teams.

---

## Key Features

* **Hybrid Connectivity:** Supports real-time sync (Land/Office) and store-and-forward batching (Sea).
* **Bandwidth Optimization:** GZIP compression for satellite data cost savings (Sea Mode).
* **Multi-Device Support:** Connects to multiple biometric devices per node via `DEVICE_LIST` config.
* **Resilience:** Robust SQLite buffering, deduplication, and offline capabilities.
* **Device Health:** Automated heartbeat monitoring and status reporting.
* **Dashboards:**
* **IT:** Fleet status, node types, and sync health.
* **HR:** Attendance logs, schedule management, and manual upload options.
* **Employee:** Self-service login, log viewing, and request filing.


---

## Feature Status

### ✅ Implemented Features

| Feature | Status | Location |
|---------|--------|----------|
| Edge Gateway (LAND/SEA/OFFICE modes) | ✅ Complete | `beacon-edge/` |
| Multi-device support (`DEVICE_LIST`) | ✅ Complete | `beacon-edge/beacon_core/harvester.py` |
| Device diagnostics tool | ✅ Complete | `beacon-edge/test_device.py` |
| Easy install scripts (Linux/Windows) | ✅ Complete | `beacon-edge/easy-install.sh`, `easy-install.ps1` |
| Cloud sync API with GZIP support | ✅ Complete | `beacon-cloud/app/api/beacon/sync/route.ts` |
| Database schema (all models) | ✅ Complete | `beacon-cloud/prisma/schema.prisma` |
| IT Dashboard (Node Fleet Grid) | ✅ Complete | `beacon-cloud/src/components/admin/NodeFleetGrid.tsx` |
| HR Dashboard (Attendance Table) | ✅ Complete | `beacon-cloud/src/components/hr/AttendanceTable.tsx` |
| Biometric Enrollment Service | ✅ Complete | `beacon-edge/enrollment_service.py` |
| User Linking & Sync (Cloud <-> Device) | ✅ Complete | `beacon-cloud/src/components/DeviceList.tsx` |

### 🚧 Planned Features

| Feature | Status | Notes |
|---------|--------|-------|
| Employee Dashboard | 📋 Planned | View own logs, file requests |
| Invalid Log Request Form | 📋 Planned | Employee self-service |
| Manual Log Request Form | 📋 Planned | With proof upload |
| HR Review/Approval UI | 📋 Planned | Review employee requests |
| Employee Management UI | 📋 Planned | Import/add/edit employees |
| Schedule Management UI | 📋 Planned | Assign and update schedules |
| Manual Attendance Upload | 📋 Planned | CSV/Excel or form input |
| Authentication System | 📋 Planned | NextAuth.js or JWT |

---

## API Endpoints

### Implemented
- **POST** `/api/beacon/sync` - Edge node log synchronization (Bearer auth, GZIP support)
- **POST** `/api/hr/employees/[id]/enroll` - Trigger biometric enrollment
- **POST** `/api/edge/sync-users` - Endpoint for Edge nodes to download user templates

### Planned
- **GET** `/api/employee/logs` - Fetch employee's own attendance logs
- **POST** `/api/employee/invalid-log-request` - File invalid log request
- **POST** `/api/employee/manual-log-request` - Submit manual log with proof
- **GET** `/api/hr/review-requests` - List pending requests for HR review
- **POST** `/api/hr/review-requests/:id` - Approve/reject request
- **GET** `/api/hr/employees` - List all employees
- **POST** `/api/hr/employees/import` - Bulk import from company API
- **POST** `/api/hr/employees` - Add single employee
- **PUT** `/api/hr/employees/:id` - Update employee
- **POST** `/api/hr/manual-upload` - Manual attendance upload (CSV/Excel)

---

## Operating Modes

BEACON is designed to run in three specific environments, controlled by the `BEACON_MODE` environment variable.

### 1. LAND Mode (Standard Branch)

* **Hardware:** Raspberry Pi 4.
* **Connectivity:** Stable Internet/Fiber.
* **Behavior:** Real-time synchronization (approx. 30s interval).

### 2. SEA Mode (Maritime/Remote)

* **Hardware:** Raspberry Pi Zero 2 W + DS3231 RTC Module.
* **Connectivity:** Erratic Satellite Internet.
* **Behavior:**
* Store-and-forward batching (15-minute intervals).
* Checks for connectivity (ping `8.8.8.8`) before attempting sync.
* **GZIP Compression:** Compresses JSON payloads to minimize data usage.



### 3. OFFICE Mode (HQ/LAN)

* **Hardware:** Standard Windows/Linux PC or Server (No Raspberry Pi required).
* **Connectivity:** Local LAN.
* **Behavior:**
* Direct connection from PC to biometric devices and Cloud.
* Ideal for HQ or sites with reliable internal infrastructure.



---

## Architecture & Tech Stack

### Edge Gateway (`beacon-edge`)

#### Python Environment Setup

It is recommended to use a Python virtual environment for all development and deployment:

```sh
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```


* **Language:** Python 3.9+
* **Database:** SQLite (Local buffer & deduplication)
* **Containerization:** Docker (ARMv7/v8 support, 256MB memory limit)
* **Protocols:** ZKTeco (pyzk), REST API
* **Core Modules:**
	* `harvester.py`: Fetches logs from devices.
	* `syncer.py`: Manages Cloud upload based on Land/Sea/Office logic.
	* `test_device.py`: Now provides a full device diagnostic (version, serial, MAC, user/fingerprint/record counts, etc.) and robust error handling for pyzk/device limitations.

---

## ZKTeco Device Troubleshooting

* For K14 and similar models, the communication password (Menu → Communication → Device Password) must match `ZK_PASSWORD` in `.env`.
* Some firmware restricts user data access via SDK. If you see "Unauthenticated" or "object has no attribute ...", see `pyzk_troubleshooting.md` for details.
* The test script will print all available info and clearly indicate unsupported features.



### Cloud Backend (`beacon-cloud`)

Centralized API and Dashboard.

* **Framework:** Next.js (App Router), TypeScript.
* **Database:** PostgreSQL (via Prisma ORM).
* **Caching:** Redis (Online status/Heartbeat).
* **UI:** React, Tailwind CSS, ShadcnUI.

---

## File Structure

```text
beacon-edge/
│
├── beacon_core/
│   ├── __init__.py        # Package marker
│   ├── database.py        # SQLite logic & deduplication
│   ├── harvester.py       # Device comms (ZKTeco)
│   └── syncer.py          # Cloud sync logic (GZIP/Batching)
│
├── main.py                # Entry point
├── requirements.txt       # Python dependencies
├── Dockerfile             # Multi-arch Docker build
├── docker-compose.yml     # Container orchestration
├── easy-install.sh        # Linux/Pi installer
├── easy-install.ps1       # Windows/Office installer
├── test_device.py         # Device diagnostics tool
├── .env                   # Edge configuration
│
beacon-cloud/
│
├── prisma/
│   └── schema.prisma      # DB Schema
├── app/api/beacon/sync/
│   └── route.ts           # Sync Endpoint
├── src/components/
│   ├── admin/             # IT dashboard (shown when IT logs in)
│   │   └── NodeFleetGrid.tsx (✅ Implemented)
│   └── hr/                # HR dashboard (main landing page)
│       └── AttendanceTable.tsx (✅ Implemented)
│
├── .env                   # Cloud configuration
├── package.json
└── next.config.js

```

---

## Setup & Configuration

### 1. Edge Gateway Setup

1. **Install:** Ensure Docker & Docker Compose are installed.
2. **Configure:**
* Clone the repo.
* Copy `.env.example` to `.env`.
* Set `BEACON_MODE` (LAND/SEA/OFFICE) and `CLOUD_API_URL`.


3. **Device Configuration (`DEVICE_LIST`):**
* To support multiple devices, set the variable in `.env`:
```env
DEVICE_LIST=192.168.1.201:ZKTeco,192.168.1.202:Suprema

```




4. **Run:**
```bash
docker-compose up --build -d

```



*For interactive setup, use the script for your platform:*
* Linux/Raspberry Pi: `beacon-edge/easy-install.sh`
* Windows/Office: `beacon-edge/easy-install.ps1`

### 2. Cloud Backend Setup

1. **Prerequisites:** PostgreSQL and Redis must be running.
2. **Database Migration:**
```bash
npx prisma migrate deploy

```


3. **Build & Start:**
```bash
pnpm install && pnpm build && pnpm start

```



---

## License

MIT
