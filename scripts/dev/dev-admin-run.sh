#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "${ROOT_DIR}/scripts/lib/process-tree.sh"
source "${ROOT_DIR}/scripts/lib/local-env.sh"

AUTH_DISCOVERY_PATH="/.well-known/openid-configuration"
ADMIN_ENV_FILE="${ROOT_DIR}/app-admin/.env.local"

extract_origin() {
  local url="$1"

  python3 - "$url" <<'PY'
from urllib.parse import urlsplit
import sys

raw = sys.argv[1].strip()
if not raw:
    raise SystemExit(1)
parts = urlsplit(raw)
if not parts.scheme or not parts.hostname:
    raise SystemExit(1)
port = parts.port
default_port = 443 if parts.scheme == "https" else 80
host = parts.hostname
if port is None or port == default_port:
    print(f"{parts.scheme}://{host}")
else:
    print(f"{parts.scheme}://{host}:{port}")
PY
}

is_loopback_url() {
  local url="$1"

  python3 - "$url" <<'PY'
from urllib.parse import urlsplit
import ipaddress
import sys

raw = sys.argv[1].strip()
if not raw:
    raise SystemExit(1)

try:
    parts = urlsplit(raw)
except ValueError:
    raise SystemExit(1)

host = (parts.hostname or "").strip().lower()
if not host:
    raise SystemExit(1)

if host == "localhost" or host.endswith(".localhost"):
    raise SystemExit(0)

try:
    ip = ipaddress.ip_address(host)
except ValueError:
    raise SystemExit(1)

raise SystemExit(0 if ip.is_loopback else 1)
PY
}

wait_for_http_ok() {
  local url="$1"
  local label="$2"
  local timeout_seconds="${3:-60}"
  local elapsed=0

  until curl -fsS "$url" >/dev/null 2>&1; do
    sleep 1
    elapsed=$((elapsed + 1))
    if (( elapsed >= timeout_seconds )); then
      echo "[dev:admin] ${label} did not become ready: ${url}" >&2
      return 1
    fi
  done

  return 0
}

ensure_local_auth_runtime() {
  local issuer_url="${1:-}"
  local discovery_url

  if [[ -z "$issuer_url" ]]; then
    return 0
  fi

  if ! is_loopback_url "$issuer_url"; then
    return 0
  fi

  discovery_url="${issuer_url%/}${AUTH_DISCOVERY_PATH}"
  if curl -fsS "$discovery_url" >/dev/null 2>&1; then
    return 0
  fi

  echo "[dev:admin] local OIDC provider unavailable, starting dev:auth:bg..."
  bash "${ROOT_DIR}/scripts/dev/dev-auth-start.sh" >/dev/null
  wait_for_http_ok "$discovery_url" "OIDC provider" 90
}

ensure_local_api_runtime() {
  local api_url="${1:-}"
  local api_health_url

  if [[ -z "$api_url" ]]; then
    return 0
  fi

  if ! is_loopback_url "$api_url"; then
    return 0
  fi

  api_health_url="$(extract_origin "$api_url")/api/v1/health"
  if curl -fsS "$api_health_url" >/dev/null 2>&1; then
    return 0
  fi

  echo "[dev:admin] local API unavailable, starting dev:api:bg..."
  bash "${ROOT_DIR}/scripts/dev/dev-api-start.sh" >/dev/null
  wait_for_http_ok "$api_health_url" "API" 60
}

AUTH_OIDC_ISSUER_URL="$(read_env_value_from_file AUTH_OIDC_ISSUER_URL "${ADMIN_ENV_FILE}" || true)"
NEXT_PUBLIC_API_URL="$(read_env_value_from_file NEXT_PUBLIC_API_URL "${ADMIN_ENV_FILE}" || true)"

ensure_local_auth_runtime "${AUTH_OIDC_ISSUER_URL}"
ensure_local_api_runtime "${NEXT_PUBLIC_API_URL}"

exec pnpm --dir "${ROOT_DIR}/app-admin" dev
