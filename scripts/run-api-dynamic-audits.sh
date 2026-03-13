#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source "${ROOT_DIR}/scripts/lib/process-tree.sh"

if ! command -v k6 >/dev/null 2>&1; then
  echo "[api-dynamic] Missing k6 command" >&2
  exit 1
fi

mkdir -p .git/gate-work
API_LOG=".git/gate-work/api-dynamic.log"
SCHEMATHESIS_REPORT_DIR=".git/gate-reports/artifacts/schemathesis"
API_PID=""
API_PORT=""
API_BASE_URL=""
CLEANUP_DONE=0

mkdir -p "${SCHEMATHESIS_REPORT_DIR}"

cleanup() {
  if ((CLEANUP_DONE)); then
    return
  fi
  CLEANUP_DONE=1
  trap - EXIT INT TERM

  if [[ -n "$API_PID" ]] && is_process_alive "$API_PID"; then
    terminate_process_tree "$API_PID" TERM
    if ! wait_for_pid_exit "$API_PID" 10; then
      terminate_process_tree "$API_PID" KILL
    fi
    wait "$API_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

wait_for_url() {
  local url="$1"
  local timeout_seconds="${2:-90}"
  local elapsed=0
  while ! curl --connect-timeout 2 --max-time 5 -fsS "$url" >/dev/null 2>&1; do
    sleep 1
    elapsed=$((elapsed + 1))
    if ((elapsed >= timeout_seconds)); then
      echo "[api-dynamic] Timeout waiting for ${url}" >&2
      return 1
    fi
  done
}

run_with_timeout() {
  local timeout_seconds="$1"
  shift

  python3 - "$timeout_seconds" "$@" <<'PY'
import subprocess
import sys

timeout = int(sys.argv[1])
command = sys.argv[2:]

try:
    result = subprocess.run(command, timeout=timeout, check=False)
except subprocess.TimeoutExpired:
    print(
        f"[api-dynamic] Timeout after {timeout}s: {' '.join(command)}",
        file=sys.stderr,
    )
    raise SystemExit(124)

raise SystemExit(result.returncode)
PY
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
  DATABASE_URL="" PORT="${API_PORT}" pnpm --filter @praedixa/api-ts exec tsx src/index.ts >"${ROOT_DIR}/${API_LOG}" 2>&1
) &
API_PID="$!"

wait_for_url "${API_BASE_URL}/api/v1/health" 120

echo "[api-dynamic] Schemathesis scan..."
SCHEMATHESIS_CMD=(
  --mode positive
  --max-examples 50
  --checks not_a_server_error
  --suppress-health-check=filter_too_much
  --continue-on-failure
  --generation-deterministic
  --generation-with-security-parameters false
  --report ndjson
  --report-dir "${SCHEMATHESIS_REPORT_DIR}"
  contracts/openapi/public.yaml
  --url "${API_BASE_URL}"
)
run_with_timeout 300 "${ROOT_DIR}/scripts/ci-python-tool.sh" schemathesis run "${SCHEMATHESIS_CMD[@]}"

echo "[api-dynamic] k6 smoke..."
run_with_timeout 120 env BASE_URL="${API_BASE_URL}" k6 run testing/performance/k6-smoke.js

echo "[api-dynamic] OK"
