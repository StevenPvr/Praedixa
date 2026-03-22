#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUN_MODE="watch"

if [[ "${1:-}" == "--once" ]]; then
  RUN_MODE="once"
  shift
fi

if [[ "$#" -gt 0 ]]; then
  echo "Usage: dev-api-run.sh [--once]" >&2
  exit 1
fi

source "${ROOT_DIR}/scripts/lib/local-env.sh"

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
      echo "[dev:api] ${label} did not become ready: ${url}" >&2
      return 1
    fi
  done

  return 0
}

ensure_local_connectors_runtime() {
  local runtime_url="${1:-}"
  local health_url

  if [[ -z "$runtime_url" ]]; then
    return 0
  fi

  if ! is_loopback_url "$runtime_url"; then
    return 0
  fi

  health_url="${runtime_url%/}/health"
  if curl -fsS "$health_url" >/dev/null 2>&1; then
    return 0
  fi

  echo "[dev:api] local connectors runtime unavailable, starting dev:connectors:bg..."
  bash "${ROOT_DIR}/scripts/dev/dev-connectors-start.sh" >/dev/null
  wait_for_http_ok "$health_url" "connectors runtime" 60
}

ensure_local_camunda_runtime() {
  local base_url="${1:-}"
  local health_url

  if [[ -z "$base_url" ]]; then
    return 0
  fi

  if ! is_loopback_url "$base_url"; then
    return 0
  fi

  health_url="${base_url%/}/topology"
  if curl -fsS "$health_url" >/dev/null 2>&1; then
    return 0
  fi

  echo "[dev:api] local Camunda runtime unavailable, starting camunda:up..."
  bash "${ROOT_DIR}/scripts/dev/camunda-dev.sh" up >/dev/null
  wait_for_http_ok "$health_url" "Camunda runtime" 120
}

autofill_database_url_from_local_env "${ROOT_DIR}"
autofill_resend_webhook_secret_from_local_env "${ROOT_DIR}"
reconcile_api_auth_runtime_from_local_env "${ROOT_DIR}"
autofill_keycloak_admin_username_from_local_env "${ROOT_DIR}"
autofill_keycloak_admin_password_from_local_env "${ROOT_DIR}"
autofill_connectors_runtime_token_from_local_env "${ROOT_DIR}"
autofill_connectors_service_tokens_from_local_env "${ROOT_DIR}"

CONNECTORS_RUNTIME_URL="${CONNECTORS_RUNTIME_URL:-http://127.0.0.1:8100}"
CAMUNDA_ENABLED="${CAMUNDA_ENABLED:-true}"
CAMUNDA_BASE_URL="${CAMUNDA_BASE_URL:-http://127.0.0.1:8088/v2}"
export CONNECTORS_RUNTIME_URL CAMUNDA_ENABLED CAMUNDA_BASE_URL

if [[ -z "${RESEND_WEBHOOK_SECRET:-}" ]]; then
  export RESEND_WEBHOOK_SECRET="whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw"
  echo "[dev:api] Defaulted RESEND_WEBHOOK_SECRET for local delivery-proof demo"
fi

ensure_local_connectors_runtime "${CONNECTORS_RUNTIME_URL}"
if [[ "${CAMUNDA_ENABLED}" == "true" ]]; then
  ensure_local_camunda_runtime "${CAMUNDA_BASE_URL}"
fi

if [[ "$RUN_MODE" == "once" ]]; then
  cd "${ROOT_DIR}/app-api-ts"
  exec node --import tsx src/index.ts
fi

cd "${ROOT_DIR}/app-api-ts"
exec node --watch --import tsx src/index.ts
