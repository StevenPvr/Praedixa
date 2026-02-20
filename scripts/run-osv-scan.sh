#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v osv-scanner >/dev/null 2>&1; then
  echo "[osv] Missing osv-scanner command" >&2
  exit 1
fi

run_osv() {
  local cmd="$1"
  echo "[osv] Trying: $cmd"
  set +e
  bash -lc "$cmd"
  local rc=$?
  set -e
  return "$rc"
}

# Support both legacy and v2 syntax variants.
declare -a CANDIDATE_CMDS=(
  "osv-scanner scan source --recursive ."
  "osv-scanner scan --recursive ."
  "osv-scanner --recursive ."
  "osv-scanner -r ."
)

for cmd in "${CANDIDATE_CMDS[@]}"; do
  if run_osv "$cmd"; then
    exit 0
  fi

  rc=$?
  if [[ $rc -eq 1 ]]; then
    # Vulnerabilities found (or scanner-level findings). Surface failure directly.
    exit 1
  fi
done

echo "[osv] No compatible osv-scanner command syntax worked." >&2
exit 1
