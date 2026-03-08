#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v osv-scanner >/dev/null 2>&1; then
  echo "[osv] Missing osv-scanner command" >&2
  exit 1
fi

is_transient_backend_failure() {
  local output_file="$1"
  grep -Eqi \
    'no such host|max retries exceeded|unable to fetch OSV database|offline version of the OSV database is available|dial tcp|connection refused|temporary failure|timeout' \
    "$output_file"
}

run_osv() {
  local cmd="$1"
  local output_file
  output_file="$(mktemp)"
  echo "[osv] Trying: $cmd"
  set +e
  bash -lc "$cmd" >"$output_file" 2>&1
  local rc=$?
  set -e
  cat "$output_file"

  if [[ "$rc" -ne 0 && "$rc" -ne 1 ]] && is_transient_backend_failure "$output_file"; then
    echo "[osv] WARN: transient backend/network failure detected, skipping OSV blocking verdict for this run." >&2
    rm -f "$output_file"
    return 0
  fi

  rm -f "$output_file"
  return "$rc"
}

mapfile -t LOCKFILES < <(git ls-files 'pnpm-lock.yaml' 'uv.lock' 'app-api/uv.lock')

if [[ "${#LOCKFILES[@]}" -eq 0 ]]; then
  echo "[osv] No tracked lockfiles to scan."
  exit 0
fi

LOCKFILE_ARGS=()
for lockfile in "${LOCKFILES[@]}"; do
  LOCKFILE_ARGS+=("--lockfile" "$lockfile")
done

declare -a CANDIDATE_CMDS=(
  "osv-scanner scan source --config osv-scanner.toml ${LOCKFILE_ARGS[*]@Q}"
  "osv-scanner scan source ${LOCKFILE_ARGS[*]@Q}"
)

for cmd in "${CANDIDATE_CMDS[@]}"; do
  if run_osv "$cmd"; then
    exit 0
  fi

  rc=$?
  if [[ $rc -eq 1 ]]; then
    exit 1
  fi
done

echo "[osv] No compatible osv-scanner command syntax worked." >&2
exit 1
