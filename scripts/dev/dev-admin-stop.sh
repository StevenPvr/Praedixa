#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "${ROOT_DIR}/scripts/lib/process-tree.sh"
PID_FILE="${ROOT_DIR}/.meta/.tools/dev-logs/admin.pid"

if [[ ! -f "${PID_FILE}" ]]; then
  echo "[dev:admin] no pid file found (${PID_FILE})"
  exit 0
fi

pid="$(cat "${PID_FILE}" 2>/dev/null || true)"
if [[ -z "${pid}" ]]; then
  rm -f "${PID_FILE}"
  echo "[dev:admin] pid file was empty, cleaned."
  exit 0
fi

if is_process_alive "${pid}"; then
  terminate_process_tree "${pid}" TERM
  if ! wait_for_pid_exit "${pid}" 10; then
    terminate_process_tree "${pid}" KILL
    wait_for_pid_exit "${pid}" 5 || true
  fi
  echo "[dev:admin] stopped pid ${pid}"
else
  echo "[dev:admin] process ${pid} already stopped"
fi

rm -f "${PID_FILE}"
