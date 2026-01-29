# Project BEACON Easy Install Script (PowerShell for Windows)
# Usage: Download and run in PowerShell as Administrator

Write-Host "[BEACON] Detecting architecture..."
$arch = (Get-CimInstance Win32_Processor).Architecture
if ($arch -ne 9 -and $arch -ne 5) {  # 9 = x64, 5 = ARM64
    Write-Host "[WARNING] This script is intended for Windows PC/server or ARM64."
}

# 2. Check Docker Desktop
Write-Host "[BEACON] Checking Docker..."
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Docker Desktop is not installed. Please install Docker Desktop manually."
    exit 1
}


# 3. Load .env and clone repo (prevent nested beacon-edge)
Write-Host "[BEACON] Loading .env for install constants..."
$envPath = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envPath)) {
    Write-Host "[ERROR] .env file not found. Please create .env with REPO_URL before running this script."
    exit 1
}
$envVars = Get-Content $envPath | Where-Object {$_ -match "="}
$envDict = @{}
foreach ($line in $envVars) {
    $parts = $line -split "=", 2
    $envDict[$parts[0].Trim()] = $parts[1].Trim()
}
$repoUrl = $envDict['REPO_URL']

# Prevent nested beacon-edge folders and always use correct working directory
$currentDir = Split-Path -Leaf (Get-Location)
if ($currentDir -ieq "beacon-edge") {
    Write-Host "[BEACON] Already inside a beacon-edge folder. Skipping clone and using current directory."
    $scriptDir = Get-Location
} else {
    Write-Host "[BEACON] Cloning repository from $repoUrl ..."
    if (-not (Test-Path "beacon-edge")) {
        git clone $repoUrl beacon-edge
    }
    Set-Location beacon-edge
    $scriptDir = Get-Location
}

# 4. Copy .env.example to .env and prompt for BEACON_TOKEN and device info
if (-not (Test-Path ".env")) {
    Copy-Item .env.example .env
    $token = Read-Host "[BEACON] Please enter your BEACON_TOKEN (provisioned by HQ)"
    (Get-Content .env) -replace '^BEACON_TOKEN=.*', "BEACON_TOKEN=$token" | Set-Content .env

    $deviceCount = Read-Host "[BEACON] How many biometric devices will this node connect to?"
    $deviceList = ""
    for ($i = 1; $i -le [int]$deviceCount; $i++) {
        $devIp = Read-Host ("[BEACON] Enter IP address for device $($i):")
        $devType = Read-Host ("[BEACON] Enter device type/model for device $($i) (e.g., ZKTeco, Suprema, etc):")
        if ($i -eq 1) {
            $deviceList = "$devIp`:$devType"
        } else {
            $deviceList = "$deviceList,$devIp`:$devType"
        }
    }
    # Save DEVICE_LIST to .env
    $envContent = Get-Content .env
    if ($envContent -match '^DEVICE_LIST=') {
        $envContent = $envContent -replace '^DEVICE_LIST=.*', "DEVICE_LIST=$deviceList"
    } else {
        Add-Content .env "DEVICE_LIST=$deviceList"
    }
    $envContent | Set-Content .env
}

# 5. Start the stack
Write-Host "[BEACON] Starting Docker Compose..."
docker compose up --build -d

# 6. Print status and test connectivity
Write-Host "[BEACON] Checking service status..."
docker compose ps

Write-Host "[BEACON] Testing ZKTeco device connectivity..."
python -c "from beacon_core.harvester import Harvester; from beacon_core.database import Database; import os; Harvester(Database(), os.getenv('DEVICE_IP', '192.168.1.201'), os.getenv('BEACON_NODE_ID', 'test')).fetch_and_store_logs()"

Write-Host "[BEACON] Testing Cloud API connectivity..."
$cloudApiUrl = (Select-String -Path .env -Pattern 'CLOUD_API_URL').Line.Split('=')[1]
Invoke-WebRequest -Uri $cloudApiUrl -Method Head

Write-Host "[BEACON] Install complete."
