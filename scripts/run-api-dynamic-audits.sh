#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v k6 >/dev/null 2>&1; then
  echo "[api-dynamic] Missing k6 command" >&2
  exit 1
fi

mkdir -p .git/gate-work
API_LOG=".git/gate-work/api-dynamic.log"
API_PID=""
API_PORT=""
API_BASE_URL=""

cleanup() {
  if [[ -n "$API_PID" ]] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

wait_for_url() {
  local url="$1"
  local timeout_seconds="${2:-90}"
  local elapsed=0
  while ! curl -fsS "$url" >/dev/null 2>&1; do
    sleep 1
    elapsed=$((elapsed + 1))
    if ((elapsed >= timeout_seconds)); then
      echo "[api-dynamic] Timeout waiting for ${url}" >&2
      return 1
    fi
  done
}

find_free_port() {
  python3 - <<'PY'
import socket

with socket.socket() as sock:
    sock.bind(("127.0.0.1", 0))
    print(sock.getsockname()[1])
PY
}

API_PORT="$(find_free_port)"
API_BASE_URL="http://127.0.0.1:${API_PORT}"

echo "[api-dynamic] Starting API TS on ${API_BASE_URL}..."
(
  PORT="${API_PORT}" pnpm --filter @praedixa/api-ts exec tsx src/index.ts >"${ROOT_DIR}/${API_LOG}" 2>&1
) &
API_PID="$!"

wait_for_url "${API_BASE_URL}/api/v1/health" 120

echo "[api-dynamic] Schemathesis scan..."
if command -v st >/dev/null 2>&1; then
  st run --max-examples 50 --checks not_a_server_error --suppress-health-check=filter_too_much contracts/openapi/public.yaml --url "${API_BASE_URL}"
elif command -v schemathesis >/dev/null 2>&1; then
  schemathesis run --max-examples 50 --checks not_a_server_error --suppress-health-check=filter_too_much contracts/openapi/public.yaml --url "${API_BASE_URL}"
else
  uv tool run --from schemathesis st run --max-examples 50 --checks not_a_server_error --suppress-health-check=filter_too_much contracts/openapi/public.yaml --url "${API_BASE_URL}"
fi

echo "[api-dynamic] k6 smoke..."
BASE_URL="${API_BASE_URL}" k6 run testing/performance/k6-smoke.js

echo "[api-dynamic] OK"
