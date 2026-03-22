#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"
source "${ROOT_DIR}/scripts/lib/pnpm.sh"

fail() {
  echo "[gate-sensitive-tests] $*" >&2
  exit 1
}

setup_pnpm || fail "Missing pnpm (tried PATH, PNPM_HOME, local pnpm tools, corepack, npx)."

echo "[gate-sensitive-tests] API TS security regressions..."
pnpm --filter @praedixa/api-ts test -- --run \
  src/__tests__/config.test.ts \
  src/__tests__/server.test.ts \
  src/__tests__/operational-data.test.ts \
  src/__tests__/gold-explorer.test.ts

echo "[gate-sensitive-tests] Connectors security regressions..."
pnpm --dir app-connectors test -- --run \
  src/__tests__/config.test.ts \
  src/__tests__/server.test.ts \
  src/__tests__/service.test.ts

echo "[gate-sensitive-tests] OK"
