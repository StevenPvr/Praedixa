#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/infra/docker-compose.yml"
AUTH_DISCOVERY_URL="http://127.0.0.1:8081/realms/praedixa/.well-known/openid-configuration"
source "${ROOT_DIR}/scripts/lib/process-tree.sh"

if ! command -v docker >/dev/null 2>&1; then
  echo "[dev:auth] docker is required" >&2
  exit 1
fi

container_id="$(docker compose -f "${COMPOSE_FILE}" ps -q auth 2>/dev/null || true)"

if [ -n "${container_id}" ] && curl -fsS "${AUTH_DISCOVERY_URL}" >/dev/null 2>&1; then
  short_id="${container_id:0:12}"
  echo "[dev:auth] running on http://localhost:8081 (container ${short_id})"
  exit 0
fi

if is_tcp_port_open "8081"; then
  echo "[dev:auth] running on http://localhost:8081 (unmanaged process)"
  exit 0
fi

echo "[dev:auth] not running"
exit 1
