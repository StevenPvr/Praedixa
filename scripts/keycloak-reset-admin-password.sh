#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KCADM_BIN="${KCADM_BIN:-$SCRIPT_DIR/kcadm}"
source "$SCRIPT_DIR/lib/json-env.sh"
source "$SCRIPT_DIR/lib/keycloak.sh"

REGION="${REGION:-fr-par}"
KEYCLOAK_SERVER_URL="${KEYCLOAK_SERVER_URL:-https://auth.praedixa.com}"
KEYCLOAK_ADMIN_REALM="${KEYCLOAK_ADMIN_REALM:-master}"
KEYCLOAK_ADMIN_USERNAME="${KEYCLOAK_ADMIN_USERNAME:-kcadmin}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-praedixa}"
AUTH_SECRET_PATH_PREFIX="${AUTH_SECRET_PATH_PREFIX:-/praedixa/prod/auth-prod/runtime}"
ADMIN_PASSWORD_SECRET_NAME="${ADMIN_PASSWORD_SECRET_NAME:-KC_BOOTSTRAP_ADMIN_PASSWORD}"
NEW_KEYCLOAK_ADMIN_PASSWORD="${NEW_KEYCLOAK_ADMIN_PASSWORD:-}"
CURRENT_KEYCLOAK_ADMIN_PASSWORD="${CURRENT_KEYCLOAK_ADMIN_PASSWORD:-}"

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

normalize_path_prefix() {
  local raw="$1"
  local trimmed="${raw%/}"
  if [[ "$trimmed" != /* ]]; then
    trimmed="/${trimmed}"
  fi
  printf '%s' "$trimmed"
}

fetch_current_password_from_secret_manager() {
  local secret_id
  secret_id="$(
    scw secret secret list \
      region="$REGION" \
      path="$AUTH_SECRET_PATH_PREFIX" \
      name="$ADMIN_PASSWORD_SECRET_NAME" \
      -o json | jq -r '.[0].id // ""'
  )"

  if [ -z "$secret_id" ]; then
    echo "Unable to find secret ${AUTH_SECRET_PATH_PREFIX}/${ADMIN_PASSWORD_SECRET_NAME}" >&2
    exit 1
  fi

  scw secret version access "$secret_id" revision=latest raw=true region="$REGION"
}

login_admin() {
  run_kcadm_with_password "$CURRENT_KEYCLOAK_ADMIN_PASSWORD" \
    "$KCADM_BIN" config credentials \
    --server "$KEYCLOAK_SERVER_URL" \
    --realm "$KEYCLOAK_ADMIN_REALM" \
    --user "$KEYCLOAK_ADMIN_USERNAME" >/dev/null
}

lookup_user_id() {
  "$KCADM_BIN" get users -r "$KEYCLOAK_REALM" -q "username=${KEYCLOAK_ADMIN_USERNAME}" \
    | jq -r '.[0].id // empty'
}

sync_secret_manager() {
  local tmp_dir secrets_file
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT
  secrets_file="$tmp_dir/secrets.json"

  export KC_BOOTSTRAP_ADMIN_PASSWORD="$NEW_KEYCLOAK_ADMIN_PASSWORD"
  write_json_from_env "$secrets_file" KC_BOOTSTRAP_ADMIN_PASSWORD

  "$SCRIPT_DIR/scw-secret-sync.sh" \
    --region "$REGION" \
    --path-prefix "$AUTH_SECRET_PATH_PREFIX" \
    --secrets-file "$secrets_file" >/dev/null
}

require_cmd jq
require_cmd scw

if [ ! -x "$KCADM_BIN" ]; then
  echo "kcadm wrapper is missing or not executable: $KCADM_BIN" >&2
  exit 1
fi

require_non_empty "$NEW_KEYCLOAK_ADMIN_PASSWORD" "NEW_KEYCLOAK_ADMIN_PASSWORD"
AUTH_SECRET_PATH_PREFIX="$(normalize_path_prefix "$AUTH_SECRET_PATH_PREFIX")"

if [ -z "$CURRENT_KEYCLOAK_ADMIN_PASSWORD" ]; then
  echo "[auth] Reading current admin password from Scaleway Secret Manager"
  CURRENT_KEYCLOAK_ADMIN_PASSWORD="$(fetch_current_password_from_secret_manager)"
fi

require_non_empty "$CURRENT_KEYCLOAK_ADMIN_PASSWORD" "CURRENT_KEYCLOAK_ADMIN_PASSWORD"

echo "[auth] Logging into Keycloak admin API"
login_admin

user_id="$(lookup_user_id)"
if [ -z "$user_id" ]; then
  echo "Keycloak admin user not found in realm ${KEYCLOAK_REALM}: ${KEYCLOAK_ADMIN_USERNAME}" >&2
  exit 1
fi

echo "[auth] Resetting Keycloak admin password for ${KEYCLOAK_ADMIN_USERNAME}"
run_kcadm_with_password "$NEW_KEYCLOAK_ADMIN_PASSWORD" \
  "$KCADM_BIN" set-password \
  -r "$KEYCLOAK_REALM" \
  --userid "$user_id" \
  --temporary=false >/dev/null

CURRENT_KEYCLOAK_ADMIN_PASSWORD="$NEW_KEYCLOAK_ADMIN_PASSWORD"
login_admin

echo "[auth] Syncing canonical secret in Scaleway Secret Manager"
sync_secret_manager

echo "[ok] Keycloak admin password rotated and synced at ${AUTH_SECRET_PATH_PREFIX}/${ADMIN_PASSWORD_SECRET_NAME}"
