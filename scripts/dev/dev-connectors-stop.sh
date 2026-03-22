#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "${ROOT_DIR}/scripts/lib/process-tree.sh"
PID_FILE="${ROOT_DIR}/.meta/.tools/dev-logs/connectors.pid"
PORT="8100"

if [[ -f "${PID_FILE}" ]]; then
  pid="$(cat "${PID_FILE}" 2>/dev/null || true)"
  if [[ -n "${pid}" ]] && is_process_alive "${pid}"; then
    terminate_process_tree "${pid}" TERM
    if ! wait_for_pid_exit "${pid}" 10; then
      terminate_process_tree "${pid}" KILL
    fi
    wait "${pid}" 2>/dev/null || true
  fi
  rm -f "${PID_FILE}"
fi

bash "${ROOT_DIR}/scripts/dev/dev-free-ports.sh" "${PORT}" >/dev/null 2>&1 || true
echo "[dev:connectors] stopped"
