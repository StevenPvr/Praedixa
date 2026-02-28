#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="${ROOT_DIR}/.tools/dev-logs/admin.pid"

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

if kill -0 "${pid}" 2>/dev/null; then
  kill "${pid}" 2>/dev/null || true
  sleep 1
  if kill -0 "${pid}" 2>/dev/null; then
    kill -9 "${pid}" 2>/dev/null || true
  fi
  echo "[dev:admin] stopped pid ${pid}"
else
  echo "[dev:admin] process ${pid} already stopped"
fi

rm -f "${PID_FILE}"
