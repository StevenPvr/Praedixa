#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"
source "${ROOT_DIR}/scripts/lib/pnpm.sh"

export UV_CACHE_DIR="${TMPDIR:-/tmp}/praedixa-uv-cache"
export UV_TOOL_DIR="${TMPDIR:-/tmp}/praedixa-uv-tools"
mkdir -p "$UV_CACHE_DIR" "$UV_TOOL_DIR"

NEXT_ENV_FILES=(
  "app-landing/next-env.d.ts"
  "app-webapp/next-env.d.ts"
  "app-admin/next-env.d.ts"
)

fail() {
  echo "[precommit-tests] $*" >&2
  exit 1
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

restore_generated_next_env_files() {
  local file=""
  for file in "${NEXT_ENV_FILES[@]}"; do
    if [[ -f "$file" ]] && ! git diff --quiet -- "$file"; then
      git restore --worktree --source=HEAD -- "$file"
    fi
  done
}

setup_pnpm || fail "Missing pnpm (tried PATH, PNPM_HOME, local pnpm tools, corepack, npx)."
has_cmd uv || fail "Missing required command 'uv'."
trap restore_generated_next_env_files EXIT

echo "[precommit-tests] Security-focused regression tests..."
./scripts/gates/gate-sensitive-security-tests.sh

echo "[precommit-tests] Python test suite (includes unit tests)..."
(
  cd app-api
  uv run pytest tests/
)

echo "[precommit-tests] API TS unit tests..."
pnpm --filter @praedixa/api-ts test

echo "[precommit-tests] Build shared workspace packages..."
pnpm --filter @praedixa/shared-types build
pnpm --filter @praedixa/ui build

echo "[precommit-tests] Workspace unit tests..."
pnpm --filter @praedixa/connectors test
pnpm --filter @praedixa/shared-types test
pnpm --filter @praedixa/ui test
pnpm --filter @praedixa/landing test
pnpm --filter @praedixa/webapp test
pnpm --filter @praedixa/admin test

echo "[precommit-tests] Playwright Chromium check..."
./scripts/dev/check-playwright-chromium.sh

echo "[precommit-tests] Critical end-to-end tests..."
PW_WORKERS=1 pnpm test:e2e:critical

echo "[precommit-tests] OK"
