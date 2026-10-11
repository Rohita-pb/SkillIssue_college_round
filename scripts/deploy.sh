#!/usr/bin/env bash
set -euo pipefail

echo "=============================================="
echo "🚀 AgentBreak Turnkey Production Deployment"
echo "=============================================="

# 1. Generate .env if not exists
if [ ! -f .env ]; then
  echo "Generating secure .env configuration..."
  node scripts/generate-env.js "${1:-http://localhost:3001}"
else
  echo "✓ Existing .env found."
fi

# 2. Validate Docker and Compose
if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Error: Docker is not installed or not in PATH."
  exit 1
fi

echo "Validating Docker Compose configuration..."
docker compose -f docker-compose.production.yml config >/dev/null

# 3. Build & Run
echo "Building and launching production containers..."
docker compose -f docker-compose.production.yml up -d --build

echo "Waiting for services to become healthy..."
attempts=0
max_attempts=35
healthy=false
while [ $attempts -lt $max_attempts ]; do
  if docker compose -f docker-compose.production.yml exec -T api node -e "fetch('http://127.0.0.1:3001/api/health/ready').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))" 2>/dev/null; then
    echo "✓ API, Database, and Worker are healthy!"
    healthy=true
    break
  fi
  attempts=$((attempts + 1))
  sleep 2
done

if [ "$healthy" = false ]; then
  echo ""
  echo "=============================================="
  echo "❌ Deployment failed or timed out."
  echo "=============================================="
  echo "Checking migration logs:"
  docker compose -f docker-compose.production.yml logs --tail 20 migrate
  echo ""
  echo "Checking API logs:"
  docker compose -f docker-compose.production.yml logs --tail 20 api
  echo ""
  echo "If credentials changed, reset the volume by running:"
  echo "  docker compose -f docker-compose.production.yml down -v"
  echo "  ./scripts/deploy.sh"
  exit 1
fi

# 4. Issue initial operator token
echo "Generating initial 7-day Admin Operator Token..."
TOKEN=$(docker compose -f docker-compose.production.yml exec -T api npm run auth:token -- admin-operator default operator 7d 2>/dev/null | tail -n 1)

echo ""
echo "=============================================="
echo "🎉 AgentBreak Deployed Successfully!"
echo "=============================================="
echo "URL: http://localhost:3001"
echo ""
echo "Your Admin Operator JWT Token (Valid for 7 days):"
echo "----------------------------------------------"
echo "$TOKEN"
echo "----------------------------------------------"
echo "To log in, open http://localhost:3001 in your browser and enter this token into the Auth Gate."
echo ""
