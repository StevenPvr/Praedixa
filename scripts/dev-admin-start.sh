#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${ROOT_DIR}/.tools/dev-logs"
LOG_FILE="${LOG_DIR}/admin.log"
PID_FILE="${LOG_DIR}/admin.pid"

mkdir -p "${LOG_DIR}"
echo "[dev:admin] starting in background mode..."

bash "${ROOT_DIR}/scripts/dev-free-ports.sh" 3002

if [[ -f "${PID_FILE}" ]]; then
  old_pid="$(cat "${PID_FILE}" 2>/dev/null || true)"
  if [[ -n "${old_pid}" ]] && kill -0 "${old_pid}" 2>/dev/null; then
    kill "${old_pid}" 2>/dev/null || true
    sleep 1
  fi
fi

nohup pnpm --dir "${ROOT_DIR}/app-admin" dev >"${LOG_FILE}" 2>&1 < /dev/null &
pid=$!
echo "${pid}" > "${PID_FILE}"

sleep 0.2
if ! kill -0 "${pid}" 2>/dev/null; then
  echo "[dev:admin] startup failed. Last logs:" >&2
  tail -n 80 "${LOG_FILE}" >&2 || true
  rm -f "${PID_FILE}"
  exit 1
fi

echo "[dev:admin] running in background (pid ${pid})"
echo "[dev:admin] url: http://localhost:3002"
echo "[dev:admin] logs: pnpm dev:admin:logs"
echo "[dev:admin] stop: pnpm dev:admin:stop"
echo "[dev:admin] status: pnpm dev:admin:status"
