param(
  [string]$Domain = "http://localhost:3001"
)

$ErrorActionPreference = "Stop"

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "AgentBreak Turnkey Production Deployment" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# 1. Generate .env if not exists
if (-not (Test-Path .env)) {
  Write-Host "[*] Generating secure .env configuration..." -ForegroundColor Yellow
  node scripts/generate-env.js $Domain
} else {
  Write-Host "[+] Existing .env found." -ForegroundColor Green
}

# 2. Check docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error "[-] Error: Docker is not installed or not in PATH."
  exit 1
}

Write-Host "[*] Validating Docker Compose configuration..." -ForegroundColor Yellow
docker compose -f docker-compose.production.yml config | Out-Null

# 3. Build & Run
Write-Host "[*] Building and launching production containers..." -ForegroundColor Yellow
docker compose -f docker-compose.production.yml up -d --build

Write-Host "[*] Waiting for services to become healthy..." -ForegroundColor Yellow
$healthy = $false
for ($i = 0; $i -lt 30; $i++) {
  try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/health/ready" -TimeoutSec 3 -ErrorAction Stop
    if ($response) {
      $healthy = $true
      Write-Host "[+] API and database are healthy!" -ForegroundColor Green
      break
    }
  } catch {
    $null = $_
  }
  Start-Sleep -Seconds 2
}

if (-not $healthy) {
  Write-Host "[!] Warning: Healthcheck timed out. Check logs with: docker compose -f docker-compose.production.yml logs" -ForegroundColor Yellow
}

# 4. Issue operator token
Write-Host "[*] Generating initial 7-day Admin Operator Token..." -ForegroundColor Yellow
try {
  $tokenOutput = docker compose -f docker-compose.production.yml exec -T api npm run auth:token -- admin-operator default operator 7d
  $token = ($tokenOutput | Select-Object -Last 1).Trim()
} catch {
  $null = $_
  $token = "[Run manually: docker compose -f docker-compose.production.yml exec api npm run auth:token -- admin-operator default operator 7d]"
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "AgentBreak Deployed Successfully!" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host "URL: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your Admin Operator JWT Token (Valid for 7 days):" -ForegroundColor Yellow
Write-Host "----------------------------------------------"
Write-Host $token -ForegroundColor White
Write-Host "----------------------------------------------"
Write-Host "To log in, open http://localhost:3001 in your browser and enter this token into the Auth Gate."
Write-Host ""
