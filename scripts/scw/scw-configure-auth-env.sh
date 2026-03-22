#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/../lib/json-env.sh"
source "$SCRIPT_DIR/../lib/local-env.sh"

REGION="fr-par"
CONTAINER_NAME="auth-prod"
AUTH_HOSTNAME="${AUTH_HOSTNAME:-auth.praedixa.com}"
PRIVATE_NETWORK_ID="${PRIVATE_NETWORK_ID:-}"
KC_DB_URL_HOST="${KC_DB_URL_HOST:-}"
KC_DB_URL_PORT="${KC_DB_URL_PORT:-5432}"
KC_DB_URL_DATABASE="${KC_DB_URL_DATABASE:-}"
KC_DB_USERNAME="${KC_DB_USERNAME:-}"
KC_DB_PASSWORD="${KC_DB_PASSWORD:-}"
KEYCLOAK_ADMIN_USERNAME="${KEYCLOAK_ADMIN_USERNAME:-kcadmin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-}"
SUPER_ADMIN_EMAIL="${SUPER_ADMIN_EMAIL:-admin@praedixa.com}"
SUPER_ADMIN_PASSWORD="${SUPER_ADMIN_PASSWORD:-}"
SUPER_ADMIN_REQUIRE_TOTP="${SUPER_ADMIN_REQUIRE_TOTP:-true}"
KEYCLOAK_SMTP_FROM="${KEYCLOAK_SMTP_FROM:-}"
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
RESEND_API_KEY="${RESEND_API_KEY:-}"
RESEND_FROM_EMAIL="${RESEND_FROM_EMAIL:-}"
RESEND_REPLY_TO_EMAIL="${RESEND_REPLY_TO_EMAIL:-}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_non_empty() {
  local value="$1"
  local name="$2"
  if [ -z "$value" ]; then
    echo "Missing required value: $name" >&2
    exit 1
  fi
}

require_booleanish() {
  local value="$1"
  local name="$2"
  case "$value" in
    true | false) ;;
    *)
      echo "${name} must be true or false" >&2
      exit 1
      ;;
  esac
}

require_cmd scw
require_cmd jq
require_cmd python3
require_non_empty "$PRIVATE_NETWORK_ID" "PRIVATE_NETWORK_ID"
require_non_empty "$KC_DB_URL_HOST" "KC_DB_URL_HOST"
require_non_empty "$KC_DB_URL_PORT" "KC_DB_URL_PORT"
require_non_empty "$KC_DB_URL_DATABASE" "KC_DB_URL_DATABASE"
require_non_empty "$KC_DB_USERNAME" "KC_DB_USERNAME"
require_non_empty "$KC_DB_PASSWORD" "KC_DB_PASSWORD"
autofill_keycloak_admin_password_from_local_env "$REPO_ROOT"
autofill_resend_api_key_from_local_env "$REPO_ROOT"
autofill_resend_from_email_from_local_env "$REPO_ROOT"
autofill_resend_reply_to_email_from_local_env "$REPO_ROOT"
require_non_empty "$KEYCLOAK_ADMIN_PASSWORD" "KEYCLOAK_ADMIN_PASSWORD"
if [ -z "$KEYCLOAK_SMTP_FROM" ] && [ -n "$RESEND_FROM_EMAIL" ]; then
  KEYCLOAK_SMTP_FROM="$RESEND_FROM_EMAIL"
fi
if [ -z "$KEYCLOAK_SMTP_FROM" ]; then
  KEYCLOAK_SMTP_FROM="hello@praedixa.com"
fi
if [ -z "$KEYCLOAK_SMTP_REPLY_TO" ] && [ -n "$RESEND_REPLY_TO_EMAIL" ]; then
  KEYCLOAK_SMTP_REPLY_TO="$RESEND_REPLY_TO_EMAIL"
fi
if [ -z "$KEYCLOAK_SMTP_PASSWORD" ] && [ -n "$RESEND_API_KEY" ]; then
  KEYCLOAK_SMTP_PASSWORD="$RESEND_API_KEY"
fi
require_non_empty "$KEYCLOAK_SMTP_FROM" "KEYCLOAK_SMTP_FROM"
require_non_empty "$KEYCLOAK_SMTP_PASSWORD" "KEYCLOAK_SMTP_PASSWORD (or RESEND_API_KEY)"
require_booleanish "$KEYCLOAK_SMTP_AUTH" "KEYCLOAK_SMTP_AUTH"
require_booleanish "$KEYCLOAK_SMTP_STARTTLS" "KEYCLOAK_SMTP_STARTTLS"
require_booleanish "$KEYCLOAK_SMTP_SSL" "KEYCLOAK_SMTP_SSL"

container_id="$(scw container container list region="$REGION" -o json | jq -r --arg n "$CONTAINER_NAME" '.[] | select(.name==$n) | .id' | head -n1)"
if [ -z "$container_id" ]; then
  echo "Container not found: $CONTAINER_NAME" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

ENV_FILE_PATH="$TMP_DIR/env.json"
SECRETS_FILE_PATH="$TMP_DIR/secrets.json"
SECRET_PATH_PREFIX="/praedixa/prod/${CONTAINER_NAME}/runtime"

KC_DB="postgres"
KC_HEALTH_ENABLED="true"
KC_METRICS_ENABLED="true"
KC_LOG_LEVEL="info"
KC_PROXY_HEADERS="xforwarded"
KC_HTTP_ENABLED="true"
KC_HOSTNAME="$AUTH_HOSTNAME"
KC_BOOTSTRAP_ADMIN_USERNAME="$KEYCLOAK_ADMIN_USERNAME"
KC_BOOTSTRAP_ADMIN_PASSWORD="$KEYCLOAK_ADMIN_PASSWORD"
export KC_DB KC_DB_URL_HOST KC_DB_URL_PORT KC_DB_URL_DATABASE KC_DB_USERNAME KC_HEALTH_ENABLED KC_METRICS_ENABLED KC_LOG_LEVEL KC_PROXY_HEADERS KC_HTTP_ENABLED KC_HOSTNAME KC_BOOTSTRAP_ADMIN_USERNAME
export KEYCLOAK_SMTP_FROM KEYCLOAK_SMTP_FROM_DISPLAY_NAME KEYCLOAK_SMTP_REPLY_TO KEYCLOAK_SMTP_REPLY_TO_DISPLAY_NAME KEYCLOAK_SMTP_HOST KEYCLOAK_SMTP_PORT KEYCLOAK_SMTP_USER KEYCLOAK_SMTP_AUTH KEYCLOAK_SMTP_STARTTLS KEYCLOAK_SMTP_SSL SUPER_ADMIN_EMAIL
write_json_from_env \
  "$ENV_FILE_PATH" \
  KC_DB \
  KC_DB_URL_HOST \
  KC_DB_URL_PORT \
  KC_DB_URL_DATABASE \
  KC_DB_USERNAME \
  KC_HEALTH_ENABLED \
  KC_METRICS_ENABLED \
  KC_LOG_LEVEL \
  KC_PROXY_HEADERS \
  KC_HTTP_ENABLED \
  KC_HOSTNAME \
  KC_BOOTSTRAP_ADMIN_USERNAME \
  KEYCLOAK_SMTP_FROM \
  KEYCLOAK_SMTP_FROM_DISPLAY_NAME \
  KEYCLOAK_SMTP_REPLY_TO \
  KEYCLOAK_SMTP_REPLY_TO_DISPLAY_NAME \
  KEYCLOAK_SMTP_HOST \
  KEYCLOAK_SMTP_PORT \
  KEYCLOAK_SMTP_USER \
  KEYCLOAK_SMTP_AUTH \
  KEYCLOAK_SMTP_STARTTLS \
  KEYCLOAK_SMTP_SSL \
  SUPER_ADMIN_EMAIL

export KC_DB_PASSWORD KC_BOOTSTRAP_ADMIN_PASSWORD KEYCLOAK_SMTP_PASSWORD SUPER_ADMIN_PASSWORD
write_json_from_env \
  "$SECRETS_FILE_PATH" \
  KC_DB_PASSWORD \
  KC_BOOTSTRAP_ADMIN_PASSWORD \
  KEYCLOAK_SMTP_PASSWORD \
  SUPER_ADMIN_PASSWORD

./scripts/scw/scw-secret-sync.sh \
  --region "$REGION" \
  --path-prefix "$SECRET_PATH_PREFIX" \
  --secrets-file "$SECRETS_FILE_PATH" >/dev/null

./scripts/scw/scw-apply-container-config.sh \
  --container-id "$container_id" \
  --region "$REGION" \
  --env-file "$ENV_FILE_PATH" \
  --secrets-file "$SECRETS_FILE_PATH" \
  --sandbox v2 \
  --http-option redirected \
  --private-network-id "$PRIVATE_NETWORK_ID" \
  --command /opt/keycloak/bin/praedixa-auth-entrypoint.sh \
  --arg start \
  --arg --optimized \
  --arg --import-realm \
  --arg --http-port=8080 \
  --wait >/dev/null

KEYCLOAK_SERVER_URL="https://${AUTH_HOSTNAME}" \
KEYCLOAK_ADMIN_USERNAME="$KEYCLOAK_ADMIN_USERNAME" \
KEYCLOAK_ADMIN_PASSWORD="$KEYCLOAK_ADMIN_PASSWORD" \
KEYCLOAK_SMTP_FROM="$KEYCLOAK_SMTP_FROM" \
KEYCLOAK_SMTP_FROM_DISPLAY_NAME="$KEYCLOAK_SMTP_FROM_DISPLAY_NAME" \
KEYCLOAK_SMTP_REPLY_TO="$KEYCLOAK_SMTP_REPLY_TO" \
KEYCLOAK_SMTP_REPLY_TO_DISPLAY_NAME="$KEYCLOAK_SMTP_REPLY_TO_DISPLAY_NAME" \
KEYCLOAK_SMTP_HOST="$KEYCLOAK_SMTP_HOST" \
KEYCLOAK_SMTP_PORT="$KEYCLOAK_SMTP_PORT" \
KEYCLOAK_SMTP_USER="$KEYCLOAK_SMTP_USER" \
KEYCLOAK_SMTP_PASSWORD="$KEYCLOAK_SMTP_PASSWORD" \
KEYCLOAK_SMTP_AUTH="$KEYCLOAK_SMTP_AUTH" \
KEYCLOAK_SMTP_STARTTLS="$KEYCLOAK_SMTP_STARTTLS" \
KEYCLOAK_SMTP_SSL="$KEYCLOAK_SMTP_SSL" \
./scripts/keycloak/keycloak-ensure-email-config.sh >/dev/null

KEYCLOAK_SERVER_URL="https://${AUTH_HOSTNAME}" \
KEYCLOAK_ADMIN_USERNAME="$KEYCLOAK_ADMIN_USERNAME" \
KEYCLOAK_ADMIN_PASSWORD="$KEYCLOAK_ADMIN_PASSWORD" \
./scripts/keycloak/keycloak-ensure-email-theme.sh >/dev/null

KEYCLOAK_SERVER_URL="https://${AUTH_HOSTNAME}" \
KEYCLOAK_ADMIN_USERNAME="$KEYCLOAK_ADMIN_USERNAME" \
KEYCLOAK_ADMIN_PASSWORD="$KEYCLOAK_ADMIN_PASSWORD" \
./scripts/keycloak/keycloak-ensure-user-invite-required-actions.sh >/dev/null

if [ -n "$SUPER_ADMIN_PASSWORD" ]; then
  KEYCLOAK_SERVER_URL="https://${AUTH_HOSTNAME}" \
  KEYCLOAK_ADMIN_USERNAME="$KEYCLOAK_ADMIN_USERNAME" \
  KEYCLOAK_ADMIN_PASSWORD="$KEYCLOAK_ADMIN_PASSWORD" \
  SUPER_ADMIN_EMAIL="$SUPER_ADMIN_EMAIL" \
  SUPER_ADMIN_PASSWORD="$SUPER_ADMIN_PASSWORD" \
  SUPER_ADMIN_REQUIRE_TOTP="$SUPER_ADMIN_REQUIRE_TOTP" \
  ./scripts/keycloak/keycloak-ensure-super-admin.sh >/dev/null

  echo "Scaleway auth runtime configuration updated, including Keycloak SMTP, email theme, and bootstrap super admin reconciliation."
else
  echo "Scaleway auth runtime configuration updated, including Keycloak SMTP and email theme realm config. Bootstrap super admin reconciliation skipped because SUPER_ADMIN_PASSWORD is unset."
fi
