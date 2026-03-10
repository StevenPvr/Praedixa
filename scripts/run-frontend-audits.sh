#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source "${ROOT_DIR}/scripts/lib/pnpm.sh"

mkdir -p .git/gate-work

LANDING_LOG=".git/gate-work/landing-start.log"
WEBAPP_LOG=".git/gate-work/webapp-start.log"
ADMIN_LOG=".git/gate-work/admin-start.log"

LANDING_PID=""
WEBAPP_PID=""
ADMIN_PID=""

cleanup() {
  for pid in "$LANDING_PID" "$WEBAPP_PID" "$ADMIN_PID"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
  done
}
trap cleanup EXIT INT TERM

wait_for_url() {
  local url="$1"
  local timeout_seconds="${2:-120}"
  local elapsed=0
  while ! curl -fsS "$url" >/dev/null 2>&1; do
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

echo "[frontend-audits] Freeing ports..."
bash ./scripts/e2e-free-ports.sh || true

echo "[frontend-audits] Starting landing/webapp/admin (Next.js start)..."
pnpm --filter @praedixa/landing exec next start --hostname 127.0.0.1 --port 3000 >"$LANDING_LOG" 2>&1 &
LANDING_PID="$!"
pnpm --filter @praedixa/webapp exec next start --hostname 127.0.0.1 --port 3001 >"$WEBAPP_LOG" 2>&1 &
WEBAPP_PID="$!"
pnpm --filter @praedixa/admin exec next start --hostname 127.0.0.1 --port 3002 >"$ADMIN_LOG" 2>&1 &
ADMIN_PID="$!"

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
