#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
KCADM_BIN="${KCADM_BIN:-$SCRIPT_DIR/kcadm}"
source "$SCRIPT_DIR/../lib/local-env.sh"

KEYCLOAK_SERVER_URL="${KEYCLOAK_SERVER_URL:-https://auth.praedixa.com}"
KEYCLOAK_ADMIN_REALM="${KEYCLOAK_ADMIN_REALM:-master}"
KEYCLOAK_ADMIN_USERNAME="${KEYCLOAK_ADMIN_USERNAME:-kcadmin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-praedixa}"

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

require_cmd jq

if [ ! -x "$KCADM_BIN" ]; then
  echo "kcadm wrapper is missing or not executable: $KCADM_BIN" >&2
  exit 1
fi

autofill_keycloak_admin_password_from_local_env "$REPO_ROOT"
require_non_empty "$KEYCLOAK_ADMIN_PASSWORD" "KEYCLOAK_ADMIN_PASSWORD"

KCADM_CONFIG_FILE="$(mktemp)"
cleanup() {
  rm -f "$KCADM_CONFIG_FILE"
}
trap cleanup EXIT

action_exists() {
  local alias="$1"
  "$KCADM_BIN" get "authentication/required-actions/${alias}" \
    --config "$KCADM_CONFIG_FILE" \
    -r "$KEYCLOAK_REALM" >/dev/null 2>&1
}

ensure_required_action() {
  local alias="$1"
  local name="$2"
  local priority="$3"
  local default_action="$4"

  if ! action_exists "$alias"; then
    "$KCADM_BIN" create authentication/register-required-action \
      --config "$KCADM_CONFIG_FILE" \
      -r "$KEYCLOAK_REALM" \
      -s "providerId=${alias}" >/dev/null
  fi

  "$KCADM_BIN" update "authentication/required-actions/${alias}" \
    --config "$KCADM_CONFIG_FILE" \
    -r "$KEYCLOAK_REALM" \
    -s "alias=${alias}" \
    -s "name=${name}" \
    -s "providerId=${alias}" \
    -s "enabled=true" \
    -s "defaultAction=${default_action}" \
    -s "priority=${priority}" >/dev/null

  "$KCADM_BIN" get "authentication/required-actions/${alias}" \
    --config "$KCADM_CONFIG_FILE" \
    -r "$KEYCLOAK_REALM" \
    | jq -e \
      --arg alias "$alias" \
      --arg name "$name" \
      --arg provider_id "$alias" \
      --argjson priority "$priority" \
      --argjson default_action "$default_action" '
        .alias == $alias
        and .name == $name
        and .providerId == $provider_id
        and .enabled == true
        and .defaultAction == $default_action
        and .priority == $priority
      ' >/dev/null
}

echo "[auth] Logging into Keycloak admin API"
KC_CLI_PASSWORD="$KEYCLOAK_ADMIN_PASSWORD" \
  "$KCADM_BIN" config credentials \
    --config "$KCADM_CONFIG_FILE" \
    --server "$KEYCLOAK_SERVER_URL" \
    --realm "$KEYCLOAK_ADMIN_REALM" \
    --user "$KEYCLOAK_ADMIN_USERNAME" >/dev/null

echo "[update] Enforcing invitation required actions on realm ${KEYCLOAK_REALM}"
ensure_required_action "UPDATE_PASSWORD" "Update Password" 20 false

echo "[ok] Keycloak invitation required actions are ready on realm ${KEYCLOAK_REALM}"
