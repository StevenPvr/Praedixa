#!/usr/bin/env bash
set -euo pipefail

if [[ "$#" -eq 0 ]]; then
  echo "Usage: $0 <command> [args...]" >&2
  exit 1
fi

interrupted=0
mark_interrupted() {
  interrupted=1
}
trap mark_interrupted INT TERM

# Run in foreground so terminal signals behave exactly like native dev commands.
set +e
"$@"
status=$?
set -e

# Normalize manual stop (Ctrl+C / SIGTERM) to avoid noisy pnpm lifecycle errors.
if [[ "$interrupted" -eq 1 || "$status" -eq 130 || "$status" -eq 143 ]]; then
  exit 0
fi

exit "$status"
