#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source "${ROOT_DIR}/scripts/lib/pnpm.sh"

fail() {
  echo "[gate-quality-static] $*" >&2
  exit 1
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

setup_pnpm || fail "Missing pnpm (tried PATH, PNPM_HOME, local pnpm tools, corepack, npx)."
has_cmd uv || fail "Missing required command 'uv'."

echo "[gate-quality-static] Workspace lint..."
pnpm lint

echo "[gate-quality-static] Workspace typecheck..."
pnpm typecheck

echo "[gate-quality-static] Python static analysis..."
(
  cd app-api
  uv run ruff check app scripts tests
  uv run mypy app
)

echo "[gate-quality-static] OK"
