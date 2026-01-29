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

# 3. Load .env and clone repo (prevent nested beacon-edge)
echo "[BEACON] Loading .env for install constants..."
if [ ! -f .env ]; then
  echo "[ERROR] .env file not found. Please create .env with REPO_URL before running this script."
  exit 1
fi
REPO_URL=$(grep '^REPO_URL=' .env | cut -d'=' -f2-)
CURRENT_DIR=$(basename "$PWD")
if [ "$CURRENT_DIR" = "beacon-edge" ]; then
  echo "[BEACON] Already inside a beacon-edge folder. Skipping clone."
else
  echo "[BEACON] Cloning repository from $REPO_URL ..."
  if [ ! -d beacon-edge ]; then
    git clone "$REPO_URL" beacon-edge
  fi
  cd beacon-edge
fi


# 4. Copy .env.example to .env and prompt for BEACON_TOKEN and device info
if [ ! -f .env ]; then
  cp .env.example .env
  echo "[BEACON] Please enter your BEACON_TOKEN (provisioned by HQ):"
  read -r TOKEN
  sed -i "s/^BEACON_TOKEN=.*/BEACON_TOKEN=$TOKEN/" .env

  # Prompt for number of devices
  echo "[BEACON] How many biometric devices will this node connect to?"
  read -r DEVICE_COUNT
  DEVICE_LIST=""
  for ((i=1;i<=DEVICE_COUNT;i++)); do
    echo "[BEACON] Enter IP address for device $i:"
    read -r DEV_IP
    echo "[BEACON] Enter device type/model for device $i (e.g., ZKTeco, Suprema, etc):"
    read -r DEV_TYPE
    if [ $i -eq 1 ]; then
      DEVICE_LIST="$DEV_IP:$DEV_TYPE"
    else
      DEVICE_LIST="$DEVICE_LIST,$DEV_IP:$DEV_TYPE"
    fi
  done
  # Save DEVICE_LIST to .env
  if grep -q '^DEVICE_LIST=' .env; then
    sed -i "s/^DEVICE_LIST=.*/DEVICE_LIST=$DEVICE_LIST/" .env
  else
    echo "DEVICE_LIST=$DEVICE_LIST" >> .env
  fi
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
