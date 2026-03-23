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
  echo "[gate-typecheck-all] $*" >&2
  exit 1
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
trap restore_generated_next_env_files EXIT

declare -a CHECK_NAMES=(
  "workspace references"
  "app-landing"
  "app-webapp"
  "app-admin"
  "app-api-ts"
  "app-connectors"
)

declare -a CHECK_COMMANDS=(
  "pnpm exec tsc --build --force --pretty false"
  "pnpm --dir app-landing exec tsc --noEmit --pretty false"
  "pnpm --dir app-webapp exec tsc --noEmit --pretty false"
  "pnpm --dir app-admin exec tsc --noEmit --pretty false"
  "pnpm --dir app-api-ts exec tsc --noEmit --pretty false"
  "pnpm --dir app-connectors exec tsc --noEmit --pretty false"
)

overall_status=0

for index in "${!CHECK_NAMES[@]}"; do
  name="${CHECK_NAMES[$index]}"
  command="${CHECK_COMMANDS[$index]}"

  echo "[gate-typecheck-all] Typecheck: ${name}"
  set +e
  bash -lc "$command"
  status=$?
  set -e

  if [[ "$status" -ne 0 ]]; then
    overall_status=1
    echo "[gate-typecheck-all] FAIL: ${name}" >&2
  else
    echo "[gate-typecheck-all] PASS: ${name}"
  fi
done

if [[ "$overall_status" -ne 0 ]]; then
  fail "Typecheck failures detected. See project sections above."
fi

echo "[gate-typecheck-all] OK"
