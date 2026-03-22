#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/infra/docker-compose.yml"

if ! command -v docker >/dev/null 2>&1; then
  echo "[dev:auth] docker is required" >&2
  exit 1
fi

docker compose -f "${COMPOSE_FILE}" stop auth >/dev/null 2>&1 || true
docker compose -f "${COMPOSE_FILE}" rm -f auth >/dev/null 2>&1 || true

echo "[dev:auth] stopped"
