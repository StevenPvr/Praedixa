#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source "${ROOT_DIR}/scripts/lib/pnpm.sh"

export UV_CACHE_DIR="${TMPDIR:-/tmp}/praedixa-uv-cache"
export UV_TOOL_DIR="${TMPDIR:-/tmp}/praedixa-uv-tools"
mkdir -p "$UV_CACHE_DIR" "$UV_TOOL_DIR"

fail() {
  echo "[precommit-tests] $*" >&2
  exit 1
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

setup_pnpm || fail "Missing pnpm (tried PATH, PNPM_HOME, local pnpm tools, corepack, npx)."
has_cmd uv || fail "Missing required command 'uv'."

echo "[precommit-tests] Python test suite (includes unit tests)..."
(
  cd app-api
  uv run pytest
)

echo "[precommit-tests] Next.js unit tests..."
pnpm vitest run --project default --project admin

echo "[precommit-tests] Playwright Chromium check..."
./scripts/check-playwright-chromium.sh

echo "[precommit-tests] End-to-end tests..."
PW_WORKERS=1 pnpm test:e2e

echo "[precommit-tests] OK"
