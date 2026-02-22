#!/usr/bin/env bash
set -euo pipefail

# Keep Playwright local runs reproducible by clearing ports used by webServer.
ports=(54321 3000 3001 3002)

for port in "${ports[@]}"; do
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "[e2e] stopping processes on port ${port}: ${pids//$'\n'/ }"
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
  fi
done

# Give processes a short grace period, then force-kill any stubborn listeners.
sleep 1
for port in "${ports[@]}"; do
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "[e2e] force stopping processes on port ${port}: ${pids//$'\n'/ }"
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
  fi
done
