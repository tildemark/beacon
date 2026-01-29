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

Handles device communication, local buffering, and cloud synchronization.

* **Language:** Python 3.9+
* **Database:** SQLite (Local buffer & deduplication)
* **Containerization:** Docker (ARMv7/v8 support, 256MB memory limit)
* **Protocols:** ZKTeco (pyzk), REST API
* **Core Modules:**
* `harvester.py`: Fetches logs from devices.
* `syncer.py`: Manages Cloud upload based on Land/Sea/Office logic.
* `database.py`: Handles local storage and deduplication.



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
├── .env                   # Edge configuration
│
beacon-cloud/
│
├── prisma/
│   └── schema.prisma      # DB Schema
├── app/api/beacon/sync/
│   └── route.ts           # Sync Endpoint
├── src/components/
│   ├── admin/             # NodeFleetGrid.tsx
│   └── hr/                # AttendanceTable.tsx
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
