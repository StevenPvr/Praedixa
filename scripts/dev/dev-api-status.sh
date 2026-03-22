#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "${ROOT_DIR}/scripts/lib/process-tree.sh"
PID_FILE="${ROOT_DIR}/.meta/.tools/dev-logs/api.pid"
PORT="8000"

if [[ -f "${PID_FILE}" ]]; then
  pid="$(cat "${PID_FILE}" 2>/dev/null || true)"
  if [[ -n "${pid}" ]] && is_process_alive "${pid}" && is_tcp_port_open "${PORT}"; then
    echo "[dev:api] running (pid ${pid}) on http://localhost:${PORT}"
    exit 0
  fi

  rm -f "${PID_FILE}"
fi

if is_tcp_port_open "${PORT}"; then
  echo "[dev:api] running on http://localhost:${PORT} (unmanaged process)"
  exit 0
fi

echo "[dev:api] not running"
exit 1
