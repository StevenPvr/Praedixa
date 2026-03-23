#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"
source "${ROOT_DIR}/scripts/lib/pnpm.sh"

NEXT_ENV_FILES=(
  "app-landing/next-env.d.ts"
  "app-webapp/next-env.d.ts"
  "app-admin/next-env.d.ts"
)

fail() {
  echo "[gate-quality-static] $*" >&2
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

echo "[gate-quality-static] Workspace lint..."
pnpm lint

echo "[gate-quality-static] Workspace typecheck..."
./scripts/gates/gate-typecheck-all.sh

echo "[gate-quality-static] Runtime deployment contracts..."
node scripts/validate-runtime-secret-inventory.mjs
node scripts/validate-runtime-env-inventory.mjs
node scripts/validate-runtime-env-contracts.mjs
node scripts/validate-build-ready-status.mjs
node scripts/validate-turbo-env-coverage.mjs
node scripts/validate-local-bootstrap-consistency.mjs
node scripts/validate-doc-portability.mjs

echo "[gate-quality-static] Declarative IaC contract..."
pnpm infra:validate

echo "[gate-quality-static] Python static analysis..."
(
  cd app-api
  uv run ruff check app scripts tests
  uv run mypy app
)

echo "[gate-quality-static] OK"
