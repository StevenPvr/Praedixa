#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "${ROOT_DIR}/scripts/lib/process-tree.sh"
LOG_DIR="${ROOT_DIR}/.meta/.tools/dev-logs"
LOG_FILE="${LOG_DIR}/admin.log"
PID_FILE="${LOG_DIR}/admin.pid"
PORT="3002"

mkdir -p "${LOG_DIR}"
echo "[dev:admin] starting in background mode..."

bash "${ROOT_DIR}/scripts/dev/dev-free-ports.sh" "${PORT}"

if [[ -f "${PID_FILE}" ]]; then
  old_pid="$(cat "${PID_FILE}" 2>/dev/null || true)"
  if [[ -n "${old_pid}" ]] && is_process_alive "${old_pid}"; then
    terminate_process_tree "${old_pid}" TERM
    if ! wait_for_pid_exit "${old_pid}" 10; then
      terminate_process_tree "${old_pid}" KILL
    fi
    wait "${old_pid}" 2>/dev/null || true
  fi
fi

nohup bash "${ROOT_DIR}/scripts/dev/dev-admin-run.sh" >"${LOG_FILE}" 2>&1 < /dev/null &
pid=$!
echo "${pid}" > "${PID_FILE}"

sleep 0.2
if ! is_process_alive "${pid}"; then
  echo "[dev:admin] startup failed. Last logs:" >&2
  tail -n 80 "${LOG_FILE}" >&2 || true
  rm -f "${PID_FILE}"
  exit 1
fi

attempt=0
until is_tcp_port_open "${PORT}"; do
  if ! is_process_alive "${pid}"; then
    echo "[dev:admin] startup failed before binding port ${PORT}. Last logs:" >&2
    tail -n 80 "${LOG_FILE}" >&2 || true
    rm -f "${PID_FILE}"
    exit 1
  fi

  sleep 0.5
  attempt=$((attempt + 1))
  if (( attempt >= 120 )); then
    echo "[dev:admin] startup timed out waiting for port ${PORT}. Last logs:" >&2
    tail -n 80 "${LOG_FILE}" >&2 || true
    rm -f "${PID_FILE}"
    exit 1
  fi
done

echo "[dev:admin] running in background (pid ${pid})"
echo "[dev:admin] url: http://localhost:${PORT}"
echo "[dev:admin] logs: pnpm dev:admin:logs"
echo "[dev:admin] stop: pnpm dev:admin:stop"
echo "[dev:admin] status: pnpm dev:admin:status"
