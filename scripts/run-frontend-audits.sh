#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source "${ROOT_DIR}/scripts/lib/pnpm.sh"
source "${ROOT_DIR}/scripts/lib/process-tree.sh"

mkdir -p .git/gate-work

LANDING_LOG=".git/gate-work/landing-start.log"
WEBAPP_LOG=".git/gate-work/webapp-start.log"
ADMIN_LOG=".git/gate-work/admin-start.log"

LANDING_PID=""
WEBAPP_PID=""
ADMIN_PID=""
STARTED_PID=""
CLEANUP_DONE=0

cleanup() {
  if ((CLEANUP_DONE)); then
    return
  fi
  CLEANUP_DONE=1
  trap - EXIT INT TERM

  for pid in "$LANDING_PID" "$WEBAPP_PID" "$ADMIN_PID"; do
    if [[ -n "$pid" ]] && is_process_alive "$pid"; then
      terminate_process_tree "$pid" TERM
      if ! wait_for_pid_exit "$pid" 10; then
        terminate_process_tree "$pid" KILL
      fi
      wait "$pid" 2>/dev/null || true
    fi
  done
}
trap cleanup EXIT INT TERM

wait_for_url() {
  local url="$1"
  local timeout_seconds="${2:-120}"
  local elapsed=0
  while ! curl --connect-timeout 2 --max-time 5 -fsS "$url" >/dev/null 2>&1; do
    sleep 1
    elapsed=$((elapsed + 1))
    if ((elapsed >= timeout_seconds)); then
      echo "[frontend-audits] Timeout waiting for ${url}" >&2
      return 1
    fi
  done
}

if ! setup_pnpm; then
  echo "[frontend-audits] Missing pnpm (tried PATH, PNPM_HOME, local pnpm tools, corepack, npx)." >&2
  exit 1
fi

PLAYWRIGHT_CHROMIUM_PATH="$(
  pnpm exec node -e "const { chromium } = require('@playwright/test'); console.log(chromium.executablePath())"
)"

start_standalone_app() {
  local app_dir="$1"
  local port="$2"
  local log_path="$3"
  local server_path="${ROOT_DIR}/${app_dir}/.next/standalone/${app_dir}/server.js"
  local runner_path="${ROOT_DIR}/scripts/dev/run-next-standalone.sh"

  if [[ ! -f "$server_path" ]]; then
    echo "[frontend-audits] Missing standalone server for ${app_dir}: ${server_path}" >&2
    echo "[frontend-audits] Run the monorepo build before frontend audits." >&2
    exit 1
  fi

  if [[ ! -x "$runner_path" ]]; then
    echo "[frontend-audits] Missing standalone runner: ${runner_path}" >&2
    exit 1
  fi

  (
    exec "${runner_path}" "${app_dir}" "${port}" >"$log_path" 2>&1
  ) &
  STARTED_PID="$!"
}

echo "[frontend-audits] Freeing ports..."
bash ./scripts/dev/e2e-free-ports.sh || true

echo "[frontend-audits] Starting landing/webapp/admin standalone servers..."
start_standalone_app "app-landing" 3000 "${ROOT_DIR}/${LANDING_LOG}"
LANDING_PID="$STARTED_PID"
start_standalone_app "app-webapp" 3001 "${ROOT_DIR}/${WEBAPP_LOG}"
WEBAPP_PID="$STARTED_PID"
start_standalone_app "app-admin" 3002 "${ROOT_DIR}/${ADMIN_LOG}"
ADMIN_PID="$STARTED_PID"

wait_for_url "http://127.0.0.1:3000/fr" 180
wait_for_url "http://127.0.0.1:3001/login" 180
wait_for_url "http://127.0.0.1:3002/login" 180

echo "[frontend-audits] Lighthouse CI..."
pnpm dlx @lhci/cli@0.15.1 collect --config=.lighthouserc.json
pnpm dlx @lhci/cli@0.15.1 assert --config=.lighthouserc.json

echo "[frontend-audits] Accessibility (pa11y-ci)..."
PUPPETEER_EXECUTABLE_PATH="${PLAYWRIGHT_CHROMIUM_PATH}" \
  PUPPETEER_SKIP_DOWNLOAD=1 \
  pnpm dlx pa11y-ci@3.1.0 --config .pa11yci.json

echo "[frontend-audits] Schema markup..."
./scripts/check-schema-markup.sh

echo "[frontend-audits] OK"
