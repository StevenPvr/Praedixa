#!/bin/bash
# Praedixa API TS + Data Engine — Local development setup
#
# Sets up the local development environment:
#   1. Checks Docker and PostgreSQL availability
#   2. Starts PostgreSQL via docker compose if not running
#   3. Waits for PostgreSQL readiness
#   4. Runs Alembic migrations for Python data engine
#   5. Starts the TypeScript API with hot reload
#
# Usage:
#   ./scripts/dev-setup.sh           # Full setup + start API TS
#   ./scripts/dev-setup.sh --no-api  # Setup only (migrations), don't start API TS
set -e

DATA_DIR="$(cd "$(dirname "$0")/../app-api" && pwd)"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
START_API=true

for arg in "$@"; do
  case "$arg" in
    --no-api) START_API=false ;;
  esac
done

echo "=== Praedixa Local Dev Setup ==="
echo ""

# 1. Check docker is available
if ! command -v docker &> /dev/null; then
    echo "ERROR: docker is not installed or not in PATH"
    exit 1
fi

# 2. Start PostgreSQL if not running
echo "[1/4] Checking PostgreSQL..."
if docker compose -f "$ROOT_DIR/infra/docker-compose.yml" ps postgres 2>/dev/null | grep -q "running"; then
    echo "      PostgreSQL is already running"
else
    echo "      Starting PostgreSQL via docker compose..."
    docker compose -f "$ROOT_DIR/infra/docker-compose.yml" up -d postgres
fi

# 3. Wait for PostgreSQL readiness
echo "[2/4] Waiting for PostgreSQL readiness..."
MAX_RETRIES=30
for i in $(seq 1 $MAX_RETRIES); do
    if docker compose -f "$ROOT_DIR/infra/docker-compose.yml" exec -T postgres pg_isready -U praedixa -d praedixa > /dev/null 2>&1; then
        echo "      PostgreSQL is ready"
        break
    fi
    if [ "$i" = "$MAX_RETRIES" ]; then
        echo "ERROR: PostgreSQL did not become ready after ${MAX_RETRIES} attempts"
        exit 1
    fi
    sleep 1
done

# 4. Run data-engine migrations
echo "[3/4] Running Alembic migrations..."
cd "$DATA_DIR"
uv run alembic upgrade head
echo "      Migrations applied"

echo ""
echo "=== Setup complete ==="

# 5. Start API TS
if [ "$START_API" = true ]; then
    echo ""
    echo "Starting API TS on http://localhost:8000 ..."
    cd "$ROOT_DIR"
    exec pnpm --filter @praedixa/api-ts dev
fi
