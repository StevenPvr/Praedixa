#!/usr/bin/env bash
set -euo pipefail

KEYCLOAK_REALM="${KEYCLOAK_REALM:-praedixa}"
KEYCLOAK_LOCAL_URL="${KEYCLOAK_LOCAL_URL:-http://127.0.0.1:8080}"
KC_BOOTSTRAP_ADMIN_USERNAME="${KC_BOOTSTRAP_ADMIN_USERNAME:-kcadmin}"
KC_BOOTSTRAP_ADMIN_PASSWORD="${KC_BOOTSTRAP_ADMIN_PASSWORD:-}"
KEYCLOAK_EMAIL_THEME="${KEYCLOAK_EMAIL_THEME:-praedixa}"
KEYCLOAK_SMTP_FROM="${KEYCLOAK_SMTP_FROM:-hello@praedixa.com}"
KEYCLOAK_SMTP_FROM_DISPLAY_NAME="${KEYCLOAK_SMTP_FROM_DISPLAY_NAME:-Praedixa}"
KEYCLOAK_SMTP_REPLY_TO="${KEYCLOAK_SMTP_REPLY_TO:-}"
KEYCLOAK_SMTP_REPLY_TO_DISPLAY_NAME="${KEYCLOAK_SMTP_REPLY_TO_DISPLAY_NAME:-}"
KEYCLOAK_SMTP_HOST="${KEYCLOAK_SMTP_HOST:-smtp.resend.com}"
KEYCLOAK_SMTP_PORT="${KEYCLOAK_SMTP_PORT:-587}"
KEYCLOAK_SMTP_USER="${KEYCLOAK_SMTP_USER:-resend}"
KEYCLOAK_SMTP_PASSWORD="${KEYCLOAK_SMTP_PASSWORD:-}"
KEYCLOAK_SMTP_AUTH="${KEYCLOAK_SMTP_AUTH:-true}"
KEYCLOAK_SMTP_STARTTLS="${KEYCLOAK_SMTP_STARTTLS:-true}"
KEYCLOAK_SMTP_SSL="${KEYCLOAK_SMTP_SSL:-false}"
SUPER_ADMIN_EMAIL="${SUPER_ADMIN_EMAIL:-admin@praedixa.com}"
SUPER_ADMIN_PASSWORD="${SUPER_ADMIN_PASSWORD:-}"
SUPER_ADMIN_FIRST_NAME="${SUPER_ADMIN_FIRST_NAME:-Praedixa}"
SUPER_ADMIN_LAST_NAME="${SUPER_ADMIN_LAST_NAME:-Admin}"
SUPER_ADMIN_ROLE="${SUPER_ADMIN_ROLE:-super_admin}"
SUPER_ADMIN_REQUIRE_TOTP="${SUPER_ADMIN_REQUIRE_TOTP:-true}"
KCADM_BIN="/opt/keycloak/bin/kcadm.sh"
KCSH_BIN="/opt/keycloak/bin/kc.sh"
SUPER_ADMIN_PERMISSIONS_JSON='["admin:audit:read","admin:billing:read","admin:billing:write","admin:console:access","admin:integrations:read","admin:integrations:write","admin:messages:read","admin:messages:write","admin:monitoring:read","admin:onboarding:read","admin:onboarding:write","admin:org:read","admin:org:write","admin:support:read","admin:support:write","admin:users:read","admin:users:write"]'

log() {
  printf '[praedixa-auth-bootstrap] %s\n' "$1"
}

require_file() {
  local path="$1"
  if [ ! -x "$path" ]; then
    log "missing executable: $path"
    exit 1
  fi
}

extract_first_id() {
  sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1
}

login_kcadm() {
  local attempts=0

  if [ -z "$KC_BOOTSTRAP_ADMIN_PASSWORD" ]; then
    log "KC_BOOTSTRAP_ADMIN_PASSWORD is unset; skipping bootstrap reconciliation"
    return 1
  fi

  KCADM_CONFIG_FILE="$(mktemp)"
  export KCADM_CONFIG_FILE

  while [ "$attempts" -lt 90 ]; do
    if KC_CLI_PASSWORD="$KC_BOOTSTRAP_ADMIN_PASSWORD" \
      "$KCADM_BIN" config credentials \
        --config "$KCADM_CONFIG_FILE" \
        --server "$KEYCLOAK_LOCAL_URL" \
        --realm master \
        --user "$KC_BOOTSTRAP_ADMIN_USERNAME" >/dev/null 2>&1; then
      return 0
    fi
    attempts=$((attempts + 1))
    sleep 2
  done

  log "timed out waiting for local Keycloak admin API"
  return 1
}

cleanup() {
  if [ -n "${KCADM_CONFIG_FILE:-}" ] && [ -f "${KCADM_CONFIG_FILE:-}" ]; then
    rm -f "$KCADM_CONFIG_FILE"
  fi
}

ensure_email_theme() {
  "$KCADM_BIN" update "realms/${KEYCLOAK_REALM}" \
    --config "$KCADM_CONFIG_FILE" \
    -s "emailTheme=${KEYCLOAK_EMAIL_THEME}" >/dev/null
}

ensure_smtp() {
  if [ -z "$KEYCLOAK_SMTP_PASSWORD" ]; then
    log "KEYCLOAK_SMTP_PASSWORD is unset; skipping SMTP reconciliation"
    return 0
  fi

  "$KCADM_BIN" update "realms/${KEYCLOAK_REALM}" \
    --config "$KCADM_CONFIG_FILE" \
    -s "smtpServer.from=${KEYCLOAK_SMTP_FROM}" \
    -s "smtpServer.fromDisplayName=${KEYCLOAK_SMTP_FROM_DISPLAY_NAME}" \
    -s "smtpServer.replyTo=${KEYCLOAK_SMTP_REPLY_TO}" \
    -s "smtpServer.replyToDisplayName=${KEYCLOAK_SMTP_REPLY_TO_DISPLAY_NAME}" \
    -s "smtpServer.host=${KEYCLOAK_SMTP_HOST}" \
    -s "smtpServer.port=${KEYCLOAK_SMTP_PORT}" \
    -s "smtpServer.user=${KEYCLOAK_SMTP_USER}" \
    -s "smtpServer.password=${KEYCLOAK_SMTP_PASSWORD}" \
    -s "smtpServer.auth=${KEYCLOAK_SMTP_AUTH}" \
    -s "smtpServer.starttls=${KEYCLOAK_SMTP_STARTTLS}" \
    -s "smtpServer.ssl=${KEYCLOAK_SMTP_SSL}" >/dev/null
}

lookup_super_admin_id() {
  "$KCADM_BIN" get users \
    --config "$KCADM_CONFIG_FILE" \
    -r "$KEYCLOAK_REALM" \
    -q "username=${SUPER_ADMIN_EMAIL}" | extract_first_id
}

ensure_super_admin() {
  local user_id

  if [ -z "$SUPER_ADMIN_PASSWORD" ]; then
    log "SUPER_ADMIN_PASSWORD is unset; skipping super-admin reconciliation"
    return 0
  fi

  user_id="$(lookup_super_admin_id)"
  if [ -z "$user_id" ]; then
    "$KCADM_BIN" create users \
      --config "$KCADM_CONFIG_FILE" \
      -r "$KEYCLOAK_REALM" \
      -s "username=${SUPER_ADMIN_EMAIL}" \
      -s "email=${SUPER_ADMIN_EMAIL}" \
      -s "enabled=true" \
      -s "emailVerified=true" \
      -s "firstName=${SUPER_ADMIN_FIRST_NAME}" \
      -s "lastName=${SUPER_ADMIN_LAST_NAME}" >/dev/null
    user_id="$(lookup_super_admin_id)"
  fi

  if [ -z "$user_id" ]; then
    log "failed to resolve bootstrap super-admin user id"
    return 1
  fi

  "$KCADM_BIN" update "users/${user_id}" \
    --config "$KCADM_CONFIG_FILE" \
    -r "$KEYCLOAK_REALM" \
    -s "username=${SUPER_ADMIN_EMAIL}" \
    -s "email=${SUPER_ADMIN_EMAIL}" \
    -s "enabled=true" \
    -s "emailVerified=true" \
    -s "firstName=${SUPER_ADMIN_FIRST_NAME}" \
    -s "lastName=${SUPER_ADMIN_LAST_NAME}" \
    -s "attributes.role=[\"${SUPER_ADMIN_ROLE}\"]" \
    -s "attributes.permissions=${SUPER_ADMIN_PERMISSIONS_JSON}" >/dev/null

  KC_CLI_PASSWORD="$SUPER_ADMIN_PASSWORD" \
    "$KCADM_BIN" set-password \
      --config "$KCADM_CONFIG_FILE" \
      -r "$KEYCLOAK_REALM" \
      --userid "$user_id" \
      --temporary=false >/dev/null

  "$KCADM_BIN" add-roles \
    --config "$KCADM_CONFIG_FILE" \
    -r "$KEYCLOAK_REALM" \
    --uid "$user_id" \
    --rolename "$SUPER_ADMIN_ROLE" >/dev/null 2>&1 || true

  if [ "$SUPER_ADMIN_REQUIRE_TOTP" = "true" ]; then
    "$KCADM_BIN" update "users/${user_id}" \
      --config "$KCADM_CONFIG_FILE" \
      -r "$KEYCLOAK_REALM" \
      -s 'requiredActions=["CONFIGURE_TOTP"]' >/dev/null
  fi
}

require_file "$KCSH_BIN"
require_file "$KCADM_BIN"
trap cleanup EXIT

"$KCSH_BIN" "$@" &
KEYCLOAK_PID=$!

if login_kcadm; then
  ensure_email_theme
  ensure_smtp
  ensure_super_admin
  cleanup
else
  log "bootstrap reconciliation skipped because admin login never became available"
fi

wait "$KEYCLOAK_PID"
