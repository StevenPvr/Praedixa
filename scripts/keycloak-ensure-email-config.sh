#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
KCADM_BIN="${KCADM_BIN:-$SCRIPT_DIR/kcadm}"
REALM_EXPORT_PATH="${REALM_EXPORT_PATH:-$REPO_ROOT/infra/auth/realm-praedixa.json}"

source "$SCRIPT_DIR/lib/keycloak.sh"
source "$SCRIPT_DIR/lib/local-env.sh"

KEYCLOAK_SERVER_URL="${KEYCLOAK_SERVER_URL:-https://auth.praedixa.com}"
KEYCLOAK_ADMIN_REALM="${KEYCLOAK_ADMIN_REALM:-master}"
KEYCLOAK_ADMIN_USERNAME="${KEYCLOAK_ADMIN_USERNAME:-kcadmin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-praedixa}"

KEYCLOAK_SMTP_FROM="${KEYCLOAK_SMTP_FROM:-}"
KEYCLOAK_SMTP_FROM_DISPLAY_NAME="${KEYCLOAK_SMTP_FROM_DISPLAY_NAME:-}"
KEYCLOAK_SMTP_REPLY_TO="${KEYCLOAK_SMTP_REPLY_TO:-}"
KEYCLOAK_SMTP_REPLY_TO_DISPLAY_NAME="${KEYCLOAK_SMTP_REPLY_TO_DISPLAY_NAME:-}"
KEYCLOAK_SMTP_HOST="${KEYCLOAK_SMTP_HOST:-}"
KEYCLOAK_SMTP_PORT="${KEYCLOAK_SMTP_PORT:-}"
KEYCLOAK_SMTP_USER="${KEYCLOAK_SMTP_USER:-}"
KEYCLOAK_SMTP_PASSWORD="${KEYCLOAK_SMTP_PASSWORD:-}"
KEYCLOAK_SMTP_AUTH="${KEYCLOAK_SMTP_AUTH:-}"
KEYCLOAK_SMTP_STARTTLS="${KEYCLOAK_SMTP_STARTTLS:-}"
KEYCLOAK_SMTP_SSL="${KEYCLOAK_SMTP_SSL:-}"

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
  if [ -z "$value" ]; then
    return 0
  fi
  case "$value" in
    true | false) ;;
    *)
      echo "${name} must be true or false when provided" >&2
      exit 1
      ;;
  esac
}

read_default_realm_smtp_value() {
  local key="$1"
  jq -r --arg key "$key" '.smtpServer[$key] // empty' "$REALM_EXPORT_PATH"
}

validate_email_like() {
  local value="$1"
  local name="$2"
  if [[ ! "$value" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
    echo "${name} must be a valid email address" >&2
    exit 1
  fi
}

require_cmd jq
require_cmd curl
require_cmd python3

if [ ! -x "$KCADM_BIN" ]; then
  echo "kcadm wrapper is missing or not executable: $KCADM_BIN" >&2
  exit 1
fi

if [ ! -f "$REALM_EXPORT_PATH" ]; then
  echo "Keycloak realm export is missing: $REALM_EXPORT_PATH" >&2
  exit 1
fi

autofill_keycloak_admin_password_from_local_env "$REPO_ROOT"
require_non_empty "$KEYCLOAK_ADMIN_PASSWORD" "KEYCLOAK_ADMIN_PASSWORD"
KCADM_CONFIG_FILE="${KCADM_CONFIG_FILE:-$(create_kcadm_config_file)}"
cleanup_kcadm_config_file() {
  rm -f "$KCADM_CONFIG_FILE"
}
trap cleanup_kcadm_config_file EXIT

if [ -z "$KEYCLOAK_SMTP_FROM" ]; then
  KEYCLOAK_SMTP_FROM="$(read_default_realm_smtp_value "from")"
fi
if [ -z "$KEYCLOAK_SMTP_FROM_DISPLAY_NAME" ]; then
  KEYCLOAK_SMTP_FROM_DISPLAY_NAME="$(read_default_realm_smtp_value "fromDisplayName")"
fi

require_non_empty "$KEYCLOAK_SMTP_FROM" "KEYCLOAK_SMTP_FROM"
validate_email_like "$KEYCLOAK_SMTP_FROM" "KEYCLOAK_SMTP_FROM"
require_booleanish "$KEYCLOAK_SMTP_AUTH" "KEYCLOAK_SMTP_AUTH"
require_booleanish "$KEYCLOAK_SMTP_STARTTLS" "KEYCLOAK_SMTP_STARTTLS"
require_booleanish "$KEYCLOAK_SMTP_SSL" "KEYCLOAK_SMTP_SSL"

echo "[auth] Logging into Keycloak admin API"
run_kcadm_with_password "$KEYCLOAK_ADMIN_PASSWORD" \
  "$KCADM_BIN" config credentials --config "$KCADM_CONFIG_FILE" \
  --server "$KEYCLOAK_SERVER_URL" \
  --realm "$KEYCLOAK_ADMIN_REALM" \
  --user "$KEYCLOAK_ADMIN_USERNAME" >/dev/null

admin_access_token="$(
  curl -fsS "${KEYCLOAK_SERVER_URL}/realms/${KEYCLOAK_ADMIN_REALM}/protocol/openid-connect/token" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data @- <<EOF | jq -r '.access_token'
grant_type=password&client_id=admin-cli&username=${KEYCLOAK_ADMIN_USERNAME}&password=${KEYCLOAK_ADMIN_PASSWORD}
EOF
)"

if [ -n "$KEYCLOAK_SMTP_REPLY_TO" ]; then
  validate_email_like "$KEYCLOAK_SMTP_REPLY_TO" "KEYCLOAK_SMTP_REPLY_TO"
fi

echo "[auth] Enforcing Keycloak realm email sender on ${KEYCLOAK_REALM}"
realm_json="$(
  curl -fsS "${KEYCLOAK_SERVER_URL}/admin/realms/${KEYCLOAK_REALM}" \
    -H "Authorization: Bearer ${admin_access_token}"
)"
updated_realm_json="$(
  REALM_JSON="$realm_json" python3 - <<'PY'
import json
import os

realm = json.loads(os.environ["REALM_JSON"])
smtp_server = dict(realm.get("smtpServer") or {})

for key, env_name in (
    ("from", "KEYCLOAK_SMTP_FROM"),
    ("fromDisplayName", "KEYCLOAK_SMTP_FROM_DISPLAY_NAME"),
    ("replyTo", "KEYCLOAK_SMTP_REPLY_TO"),
    ("replyToDisplayName", "KEYCLOAK_SMTP_REPLY_TO_DISPLAY_NAME"),
    ("host", "KEYCLOAK_SMTP_HOST"),
    ("port", "KEYCLOAK_SMTP_PORT"),
    ("user", "KEYCLOAK_SMTP_USER"),
    ("password", "KEYCLOAK_SMTP_PASSWORD"),
    ("auth", "KEYCLOAK_SMTP_AUTH"),
    ("starttls", "KEYCLOAK_SMTP_STARTTLS"),
    ("ssl", "KEYCLOAK_SMTP_SSL"),
):
    value = os.environ.get(env_name, "")
    if value:
        smtp_server[key] = value

realm["smtpServer"] = smtp_server
print(json.dumps(realm))
PY
)"
update_status="$(
  printf '%s' "$updated_realm_json" \
    | curl -sS -o /tmp/keycloak-email-config-update.json -w '%{http_code}' \
        -X PUT "${KEYCLOAK_SERVER_URL}/admin/realms/${KEYCLOAK_REALM}" \
        -H "Authorization: Bearer ${admin_access_token}" \
        -H 'Content-Type: application/json' \
        --data @-
)"
if [ "$update_status" != "204" ]; then
  echo "Keycloak realm email config update failed with HTTP ${update_status}" >&2
  cat /tmp/keycloak-email-config-update.json >&2
  exit 1
fi

realm_json="$(
  curl -fsS "${KEYCLOAK_SERVER_URL}/admin/realms/${KEYCLOAK_REALM}" \
    -H "Authorization: Bearer ${admin_access_token}"
)"
actual_from="$(printf '%s' "$realm_json" | jq -r '.smtpServer.from // empty')"
actual_from_display_name="$(printf '%s' "$realm_json" | jq -r '.smtpServer.fromDisplayName // empty')"

if [ "$actual_from" != "$KEYCLOAK_SMTP_FROM" ]; then
  echo "Keycloak realm sender verification failed: expected ${KEYCLOAK_SMTP_FROM}, got ${actual_from:-<empty>}" >&2
  exit 1
fi

if [ -n "$KEYCLOAK_SMTP_FROM_DISPLAY_NAME" ] && [ "$actual_from_display_name" != "$KEYCLOAK_SMTP_FROM_DISPLAY_NAME" ]; then
  echo "Keycloak realm sender display name verification failed: expected ${KEYCLOAK_SMTP_FROM_DISPLAY_NAME}, got ${actual_from_display_name:-<empty>}" >&2
  exit 1
fi

echo "[ok] Keycloak realm email sender is aligned for ${KEYCLOAK_REALM}"
