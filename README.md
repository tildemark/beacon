
## Overview

Project BEACON is a hybrid biometric attendance system connecting Land (Offices) and Sea (Ships) to a central HQ Cloud. It provides real-time and offline attendance logging, robust device health monitoring, and seamless integration for HR and IT teams.

## File Structure Tree
```
beacon-edge/
│
├── beacon_core/
│   ├── __init__.py
│   ├── database.py
│   ├── harvester.py
│   └── syncer.py
│
├── main.py
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env
│
beacon-cloud/
│
├── prisma/
│   └── schema.prisma
│
├── app/
│   └── api/
│       └── beacon/
│           └── sync/
│               └── route.ts
│
├── src/
│   └── components/
│       ├── admin/
│       │   └── NodeFleetGrid.tsx
│       └── hr/
│           └── AttendanceTable.tsx
│
├── .env
├── package.json
├── next.config.js
```

### Architecture


## Edge Gateway (beacon-edge)
	- Harvester thread: Connects to ZKTeco, fetches logs, saves to SQLite (deduplication, device timestamp)
	- Syncer thread: Reads `BEACON_MODE` (LAND/SEA), syncs logs to Cloud API (GZIP for SEA, 500 logs/batch)

<!--
Project BEACON (Basic Employee Attendance Connecting Oceans & Networks)

README - Handoff Ready
----------------------
This file provides a comprehensive overview of the BEACON project, its architecture, and setup instructions. All sections are thoroughly commented for clarity and future implementation.
-->

# Project BEACON (Basic Employee Attendance Connecting Oceans & Networks)

## Overview

Project BEACON is a hybrid biometric attendance system connecting Land (Offices) and Sea (Ships) to a central HQ Cloud. It provides real-time and offline attendance logging, robust device health monitoring, and seamless integration for HR and IT teams.

---

## File Structure Tree
<!--
This section shows the main directory and file layout for both edge and cloud components.
-->
```
beacon-edge/
	beacon_core/
		__init__.py         # Python package marker
		database.py         # SQLite logic and deduplication
		harvester.py        # ZKTeco device communication and log harvesting
		syncer.py           # Cloud sync logic (LAND/SEA modes)
	main.py               # Entry point, launches harvester/syncer threads
	requirements.txt      # Python dependencies
	Dockerfile            # Docker build for ARMv7/v8
	docker-compose.yml    # Compose config, memory limits, .env usage
	.env                  # Edge environment variables

beacon-cloud/
	prisma/
		schema.prisma       # Prisma schema for DB
	app/api/beacon/sync/route.ts # Cloud API endpoint for log sync
	src/components/admin/NodeFleetGrid.tsx # IT dashboard grid
	src/components/hr/AttendanceTable.tsx  # HR dashboard table
	.env                  # Cloud environment variables
	package.json          # Node/Next.js dependencies
	next.config.js        # Next.js config
```

---

## Architecture
<!--
Summarizes the technology stack and deployment targets for each part of the system.
-->
- **Edge Gateway (beacon-edge):** Python 3.9, SQLite, Docker, ZKTeco protocol (pyzk)
- **Cloud Backend (beacon-cloud):** Next.js (App Router), TypeScript, PostgreSQL (Prisma), Redis
- **Frontend UI:** React, Tailwind CSS, ShadcnUI

---

## Edge Gateway (beacon-edge)
<!--
Describes the edge device roles, core logic, and Dockerization.
-->
- **Land Nodes:** Raspberry Pi 4 (real-time sync)
- **Sea Nodes:** Raspberry Pi Zero 2 W (offline buffering, GZIP batch sync via Satellite)
- **Core Logic:**
	- Harvester thread: Connects to ZKTeco, fetches logs, saves to SQLite (deduplication, device timestamp)
	- Syncer thread: Reads `BEACON_MODE` (LAND/SEA), syncs logs to Cloud API (GZIP for SEA, 500 logs/batch)
- **Dockerized:** ARMv7/v8, 256MB memory limit, .env for config
## Cloud Backend (beacon-cloud)
- **Database:** PostgreSQL via Prisma
- **API:** Next.js App Router, `/api/beacon/sync` endpoint
	- Auth via Bearer token (per node)
	- Handles GZIP payloads
	- Upserts logs, updates node heartbeat, sets Redis online key

## Frontend UI
- **IT Dashboard:** NodeFleetGrid.tsx (Node status, type, last sync)
- **HR Dashboard:** AttendanceTable.tsx (Attendance logs, filters, confidence badge for delayed sea nodes)

---

## Setup & Easy Install
1. **Edge:**
	 - Install Docker & Docker Compose
	 - Clone repo, copy `.env.example` to `.env`, edit config
	 - `docker-compose up --build -d`
2. **Cloud:**
	 - Set up PostgreSQL & Redis
	 - `npx prisma migrate deploy`
	 - `pnpm install && pnpm build && pnpm start`

---

## Key Features
- Real-time and offline attendance sync
- GZIP batch sync for satellite cost savings
- Device health/heartbeat monitoring
- Robust deduplication and error handling
- Modern UI for IT and HR

---

## License
MIT
# Project BEACON (Basic Employee Attendance Connecting Oceans & Networks)

A hybrid biometric attendance gateway for Raspberry Pi, bridging ZKTeco hardware with a centralized Cloud API. Supports both real-time (LAND) and store-and-forward (SEA) operation modes.

## Features
- **LAND Mode:** Real-time sync for offices with stable LAN/Fiber.
- **SEA Mode:** Store-and-forward batching for ships with erratic Satellite internet, with GZIP compression to save bandwidth.
- **Hardware:**
	- Gateway: Raspberry Pi 4 (Land) / Raspberry Pi Zero 2 W (Sea)
	- Sensors: ZKTeco K40/UA300 (Ethernet)
	- Peripherals: DS3231 RTC Module (Sea units only)
- **Software:**
	- Python 3.9+
	- SQLite local buffer
	- pyzk for ZKTeco comms
	- REST API sync
	- Dockerized for ARMv7/v8

## File Structure
```
beacon_core/
	database.py   # SQLite logic
	harvester.py  # ZKTeco communication
	syncer.py     # Cloud upload logic
main.py         # Entry point
requirements.txt
Dockerfile
.env
```

## Usage
1. **Configure Environment:**
	 - Copy `.env` and set values for `BEACON_MODE`, `DEVICE_IP`, `CLOUD_API_URL`, `BEACON_NODE_ID`.
2. **Build & Run (Docker Compose):**
	 ```sh
	 docker-compose up --build
	 ```
3. **Modes:**
	 - `LAND`: 30s sync interval, immediate upload.
	 - `SEA`: 15min sync, pings 8.8.8.8, GZIPs payload, batches up to 500 logs.

## Bandwidth Optimization (SEA Mode)
- Only syncs when online (ping check).
- GZIP-compresses JSON payloads to minimize satellite data costs.
- Never double-counts logs (deduplication in database).

## Docker
- **Base image:** python:3.9-slim-buster
- **Memory limit:** 256MB (see `docker-compose.yml`)
- **Volumes:** Persists `beacon.db` locally.

## Requirements
- pyzk
- requests
- schedule

## License
MIT
# beacon
BEACON Basic Employee Attendance Connecting Oceans &amp; Networks let go with this
