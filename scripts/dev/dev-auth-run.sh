#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/infra/docker-compose.yml"

bash "${ROOT_DIR}/scripts/dev/dev-auth-start.sh"

echo "[dev:auth] streaming auth logs..."
exec docker compose -f "${COMPOSE_FILE}" logs -f auth
