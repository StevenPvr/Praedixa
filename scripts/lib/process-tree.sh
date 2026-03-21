#!/usr/bin/env bash
set -euo pipefail

is_process_alive() {
  local pid="$1"
  local state

  state="$(ps -o stat= -p "$pid" 2>/dev/null | awk 'NR==1 {print $1}')"
  [[ -n "$state" ]] || return 1
  [[ "$state" != Z* ]] || return 1
  return 0
}

is_tcp_port_open() {
  local port="$1"
  local host="${2:-127.0.0.1}"

  python3 - "$host" "$port" <<'PY'
import socket
import sys

host = sys.argv[1]
port = int(sys.argv[2])

with socket.socket() as sock:
    sock.settimeout(0.5)
    raise SystemExit(0 if sock.connect_ex((host, port)) == 0 else 1)
PY
}

terminate_process_tree() {
  local pid="$1"
  local signal="${2:-TERM}"
  local child

  while read -r child; do
    [[ -n "$child" ]] || continue
    terminate_process_tree "$child" "$signal"
  done < <(pgrep -P "$pid" 2>/dev/null || true)

  kill -s "$signal" "$pid" 2>/dev/null || true
}

wait_for_pid_exit() {
  local pid="$1"
  local timeout_seconds="${2:-10}"
  local elapsed=0

  while is_process_alive "$pid"; do
    sleep 1
    elapsed=$((elapsed + 1))
    if ((elapsed >= timeout_seconds)); then
      return 1
    fi
  done

  return 0
}
