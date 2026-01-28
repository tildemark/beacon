#!/bin/bash
# Project BEACON Easy Install Script (for Edge Gateway)
# Usage: curl -sSL <script_url> | bash

set -e

# 1. Detect OS/arch (ensure ARMv7/v8 for Pi)
echo "[BEACON] Detecting architecture..."
ARCH=$(uname -m)
if [[ "$ARCH" != "armv7l" && "$ARCH" != "aarch64" ]]; then
  echo "[ERROR] This script is intended for Raspberry Pi (ARMv7/v8)."
  exit 1
fi

# 2. Install Docker & Docker Compose if missing
echo "[BEACON] Checking Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
if ! command -v docker-compose &> /dev/null; then
  pip3 install docker-compose
fi

# 3. Clone repo and setup
echo "[BEACON] Cloning repository..."
git clone <REPO_URL> beacon-edge || true
cd beacon-edge

# 4. Copy .env.example to .env and prompt for BEACON_TOKEN
if [ ! -f .env ]; then
  cp .env.example .env
  echo "[BEACON] Please enter your BEACON_TOKEN (provisioned by HQ):"
  read -r TOKEN
  sed -i "s/^BEACON_TOKEN=.*/BEACON_TOKEN=$TOKEN/" .env
fi

# 5. Start the stack
echo "[BEACON] Starting Docker Compose..."
docker-compose up --build -d

# 6. Print status and test connectivity
echo "[BEACON] Checking service status..."
docker-compose ps

echo "[BEACON] Testing ZKTeco device connectivity..."
python3 -c 'from beacon_core.harvester import Harvester; from beacon_core.database import Database; import os; Harvester(Database(), os.getenv("DEVICE_IP", "192.168.1.201"), os.getenv("BEACON_NODE_ID", "test")).fetch_and_store_logs()'

echo "[BEACON] Testing Cloud API connectivity..."
curl -I $(grep CLOUD_API_URL .env | cut -d'=' -f2)

echo "[BEACON] Install complete."
