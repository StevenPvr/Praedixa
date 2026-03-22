#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/infra/docker-compose.yml"
AUTH_DISCOVERY_URL="http://127.0.0.1:8081/realms/praedixa/.well-known/openid-configuration"
source "${ROOT_DIR}/scripts/lib/local-env.sh"

if ! command -v docker >/dev/null 2>&1; then
  echo "[dev:auth] docker is required" >&2
  exit 1
fi

autofill_keycloak_admin_username_from_local_env "${ROOT_DIR}"
autofill_keycloak_admin_password_from_local_env "${ROOT_DIR}"
reconcile_local_keycloak_smtp_runtime_from_local_env "${ROOT_DIR}" >/dev/null

export KC_BOOTSTRAP_ADMIN_USERNAME="${KC_BOOTSTRAP_ADMIN_USERNAME:-${KEYCLOAK_ADMIN_USERNAME:-kcadmin}}"
export KC_BOOTSTRAP_ADMIN_PASSWORD="${KC_BOOTSTRAP_ADMIN_PASSWORD:-${KEYCLOAK_ADMIN_PASSWORD:-}}"
export SUPER_ADMIN_EMAIL="${SUPER_ADMIN_EMAIL:-admin@praedixa.com}"
export SUPER_ADMIN_REQUIRE_TOTP="${SUPER_ADMIN_REQUIRE_TOTP:-false}"
export KEYCLOAK_SMTP_PASSWORD="${KEYCLOAK_SMTP_PASSWORD:-}"
export KEYCLOAK_SMTP_FROM="${KEYCLOAK_SMTP_FROM:-}"
export KEYCLOAK_SMTP_REPLY_TO="${KEYCLOAK_SMTP_REPLY_TO:-}"

if [ -z "${SUPER_ADMIN_PASSWORD:-}" ] && [ -n "${KEYCLOAK_ADMIN_PASSWORD:-}" ]; then
  export SUPER_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD}"
fi

if [ -z "${KC_BOOTSTRAP_ADMIN_PASSWORD:-}" ]; then
  echo "[dev:auth] missing KC_BOOTSTRAP_ADMIN_PASSWORD / KEYCLOAK_ADMIN_PASSWORD in local env" >&2
  exit 1
fi

reconcile_local_keycloak_contract() {
  echo "[dev:auth] reconciling local Keycloak contract..."
  if [ -n "${KEYCLOAK_SMTP_PASSWORD:-}" ]; then
    KEYCLOAK_SERVER_URL="http://127.0.0.1:8081" \
      KEYCLOAK_ADMIN_USERNAME="${KC_BOOTSTRAP_ADMIN_USERNAME}" \
      KEYCLOAK_ADMIN_PASSWORD="${KC_BOOTSTRAP_ADMIN_PASSWORD}" \
      KEYCLOAK_SMTP_PASSWORD="${KEYCLOAK_SMTP_PASSWORD}" \
      KEYCLOAK_SMTP_FROM="${KEYCLOAK_SMTP_FROM:-}" \
      KEYCLOAK_SMTP_REPLY_TO="${KEYCLOAK_SMTP_REPLY_TO:-}" \
      "${ROOT_DIR}/scripts/keycloak/keycloak-ensure-email-config.sh" >/dev/null
  else
    echo "[dev:auth] SMTP local non configure: execute-actions-email restera desactive tant qu'aucun secret mail n'est charge."
  fi

  KEYCLOAK_SERVER_URL="http://127.0.0.1:8081" \
    KEYCLOAK_ADMIN_USERNAME="${KC_BOOTSTRAP_ADMIN_USERNAME}" \
    KEYCLOAK_ADMIN_PASSWORD="${KC_BOOTSTRAP_ADMIN_PASSWORD}" \
    "${ROOT_DIR}/scripts/keycloak/keycloak-ensure-api-access-contract.sh" >/dev/null

  KEYCLOAK_SERVER_URL="http://127.0.0.1:8081" \
    KEYCLOAK_ADMIN_USERNAME="${KC_BOOTSTRAP_ADMIN_USERNAME}" \
    KEYCLOAK_ADMIN_PASSWORD="${KC_BOOTSTRAP_ADMIN_PASSWORD}" \
    "${ROOT_DIR}/scripts/keycloak/keycloak-ensure-user-invite-required-actions.sh" >/dev/null

  KEYCLOAK_SERVER_URL="http://127.0.0.1:8081" \
    KEYCLOAK_ADMIN_USERNAME="${KC_BOOTSTRAP_ADMIN_USERNAME}" \
    KEYCLOAK_ADMIN_PASSWORD="${KC_BOOTSTRAP_ADMIN_PASSWORD}" \
    SUPER_ADMIN_EMAIL="${SUPER_ADMIN_EMAIL}" \
    SUPER_ADMIN_PASSWORD="${SUPER_ADMIN_PASSWORD}" \
    SUPER_ADMIN_REQUIRE_TOTP="${SUPER_ADMIN_REQUIRE_TOTP}" \
    "${ROOT_DIR}/scripts/keycloak/keycloak-ensure-super-admin.sh" >/dev/null
}

echo "[dev:auth] starting in background mode..."
docker compose -f "${COMPOSE_FILE}" up --build -d auth >/dev/null

attempt=0
until curl -fsS "${AUTH_DISCOVERY_URL}" >/dev/null 2>&1; do
  sleep 2
  attempt=$((attempt + 1))
  if (( attempt >= 60 )); then
    echo "[dev:auth] startup timed out. Recent logs:" >&2
    docker compose -f "${COMPOSE_FILE}" logs --tail=80 auth >&2 || true
    exit 1
  fi
done

reconcile_local_keycloak_contract

echo "[dev:auth] running in background"
echo "[dev:auth] issuer: http://localhost:8081/realms/praedixa"
echo "[dev:auth] logs: pnpm dev:auth:logs"
echo "[dev:auth] stop: pnpm dev:auth:stop"
echo "[dev:auth] status: pnpm dev:auth:status"
