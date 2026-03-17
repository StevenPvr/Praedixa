#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
KCADM_BIN="${KCADM_BIN:-$SCRIPT_DIR/kcadm}"
source "$SCRIPT_DIR/lib/keycloak.sh"
source "$SCRIPT_DIR/lib/local-env.sh"

KEYCLOAK_SERVER_URL="${KEYCLOAK_SERVER_URL:-https://auth.praedixa.com}"
KEYCLOAK_ADMIN_REALM="${KEYCLOAK_ADMIN_REALM:-master}"
KEYCLOAK_ADMIN_USERNAME="${KEYCLOAK_ADMIN_USERNAME:-kcadmin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-}"

KEYCLOAK_REALM="${KEYCLOAK_REALM:-praedixa}"
SUPER_ADMIN_EMAIL="${SUPER_ADMIN_EMAIL:-admin@praedixa.com}"
SUPER_ADMIN_PASSWORD="${SUPER_ADMIN_PASSWORD:-}"
SUPER_ADMIN_FIRST_NAME="${SUPER_ADMIN_FIRST_NAME:-Praedixa}"
SUPER_ADMIN_LAST_NAME="${SUPER_ADMIN_LAST_NAME:-Admin}"
SUPER_ADMIN_ROLE="${SUPER_ADMIN_ROLE:-super_admin}"
SUPER_ADMIN_PERMISSIONS="${SUPER_ADMIN_PERMISSIONS:-admin:console:access}"
SUPER_ADMIN_REQUIRE_TOTP="${SUPER_ADMIN_REQUIRE_TOTP:-true}"

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
require_non_empty "$SUPER_ADMIN_PASSWORD" "SUPER_ADMIN_PASSWORD"
require_non_empty "$SUPER_ADMIN_EMAIL" "SUPER_ADMIN_EMAIL"

case "${SUPER_ADMIN_REQUIRE_TOTP}" in
  true | false) ;;
  *)
    echo "SUPER_ADMIN_REQUIRE_TOTP must be true or false" >&2
    exit 1
    ;;
esac

lookup_user_id() {
  local field="$1"
  local value="$2"
  "$KCADM_BIN" get users -r "$KEYCLOAK_REALM" -q "${field}=${value}" \
    | jq -r --arg field "$field" --arg value "$value" '
        map(
          select(
            ((.[$field] // "") | ascii_downcase) == ($value | ascii_downcase)
          )
        )
        | .[0].id // empty
      '
}

permissions_json_from_csv() {
  printf '%s' "$SUPER_ADMIN_PERMISSIONS" \
    | jq -R '
        split(",")
        | map(ascii_downcase | gsub("^\\s+|\\s+$"; ""))
        | map(select(length > 0))
        | unique
      '
}

ensure_user_token_attributes() {
  local user_id="$1"
  local permissions_json tmp_payload

  permissions_json="$(permissions_json_from_csv)"
  tmp_payload="$(mktemp)"

  "$KCADM_BIN" get "users/${user_id}" -r "$KEYCLOAK_REALM" \
    | jq \
      --arg role "$SUPER_ADMIN_ROLE" \
      --argjson permissions "$permissions_json" '
        .attributes = (.attributes // {})
        | .attributes.role = [$role]
        | .attributes.permissions = $permissions
      ' >"$tmp_payload"

  "$KCADM_BIN" update "users/${user_id}" -r "$KEYCLOAK_REALM" -f "$tmp_payload" >/dev/null
  rm -f "$tmp_payload"

  "$KCADM_BIN" get "users/${user_id}" -r "$KEYCLOAK_REALM" \
    | jq -e \
      --arg role "$SUPER_ADMIN_ROLE" \
      --argjson permissions "$permissions_json" '
        (.attributes.role // []) == [$role]
        and (.attributes.permissions // []) == $permissions
      ' >/dev/null
}

ensure_user_required_action() {
  local user_id="$1"
  local action_alias="$2"
  local tmp_payload
  tmp_payload="$(mktemp)"

  "$KCADM_BIN" get "users/${user_id}" -r "$KEYCLOAK_REALM" \
    | jq --arg action "$action_alias" '
        .requiredActions = (
          ((.requiredActions // []) + [$action])
          | map(select(type == "string" and length > 0))
          | unique
        )
      ' >"$tmp_payload"

  "$KCADM_BIN" update "users/${user_id}" -r "$KEYCLOAK_REALM" -f "$tmp_payload" >/dev/null
  rm -f "$tmp_payload"
}

echo "[auth] Logging into Keycloak admin API"
run_kcadm_with_password "$KEYCLOAK_ADMIN_PASSWORD" \
  "$KCADM_BIN" config credentials \
  --server "$KEYCLOAK_SERVER_URL" \
  --realm "$KEYCLOAK_ADMIN_REALM" \
  --user "$KEYCLOAK_ADMIN_USERNAME" >/dev/null

user_id="$(lookup_user_id "username" "$SUPER_ADMIN_EMAIL")"
if [ -z "$user_id" ]; then
  user_id="$(lookup_user_id "email" "$SUPER_ADMIN_EMAIL")"
fi

if [ -z "$user_id" ]; then
  echo "[create] Creating super admin user ${SUPER_ADMIN_EMAIL}"
  "$KCADM_BIN" create users -r "$KEYCLOAK_REALM" \
    -s "username=${SUPER_ADMIN_EMAIL}" \
    -s "email=${SUPER_ADMIN_EMAIL}" \
    -s "enabled=true" \
    -s "emailVerified=true" \
    -s "firstName=${SUPER_ADMIN_FIRST_NAME}" \
    -s "lastName=${SUPER_ADMIN_LAST_NAME}" >/dev/null

  user_id="$(lookup_user_id "username" "$SUPER_ADMIN_EMAIL")"
  if [ -z "$user_id" ]; then
    user_id="$(lookup_user_id "email" "$SUPER_ADMIN_EMAIL")"
  fi
  if [ -z "$user_id" ]; then
    echo "Failed to create super admin user: ${SUPER_ADMIN_EMAIL}" >&2
    exit 1
  fi
else
  echo "[skip] Super admin user already exists: ${SUPER_ADMIN_EMAIL}"
fi

echo "[update] Enforcing password and role on ${SUPER_ADMIN_EMAIL}"
"$KCADM_BIN" update "users/${user_id}" -r "$KEYCLOAK_REALM" \
  -s "username=${SUPER_ADMIN_EMAIL}" \
  -s "email=${SUPER_ADMIN_EMAIL}" \
  -s "enabled=true" \
  -s "emailVerified=true" \
  -s "firstName=${SUPER_ADMIN_FIRST_NAME}" \
  -s "lastName=${SUPER_ADMIN_LAST_NAME}" >/dev/null

run_kcadm_with_password "$SUPER_ADMIN_PASSWORD" \
  "$KCADM_BIN" set-password \
  -r "$KEYCLOAK_REALM" \
  --userid "$user_id" \
  --temporary=false >/dev/null

"$KCADM_BIN" add-roles \
  -r "$KEYCLOAK_REALM" \
  --uid "$user_id" \
  --rolename "$SUPER_ADMIN_ROLE" >/dev/null

role_count="$(
  "$KCADM_BIN" get "users/${user_id}/role-mappings/realm" -r "$KEYCLOAK_REALM" \
    | jq -r --arg role "$SUPER_ADMIN_ROLE" 'map(select(.name == $role)) | length'
)"

if [ "$role_count" -lt 1 ]; then
  echo "Role assignment verification failed for ${SUPER_ADMIN_EMAIL}" >&2
  exit 1
fi

echo "[update] Enforcing canonical token attributes on ${SUPER_ADMIN_EMAIL}"
ensure_user_token_attributes "$user_id"

if [ "$SUPER_ADMIN_REQUIRE_TOTP" = "true" ]; then
  echo "[update] Enforcing required action CONFIGURE_TOTP on ${SUPER_ADMIN_EMAIL}"
  ensure_user_required_action "$user_id" "CONFIGURE_TOTP"

  totp_required="$(
    "$KCADM_BIN" get "users/${user_id}" -r "$KEYCLOAK_REALM" \
      | jq -r '((.requiredActions // []) | index("CONFIGURE_TOTP")) != null'
  )"
  if [ "$totp_required" != "true" ]; then
    echo "CONFIGURE_TOTP required action verification failed for ${SUPER_ADMIN_EMAIL}" >&2
    exit 1
  fi
fi

echo "[ok] Super admin account is ready: ${SUPER_ADMIN_EMAIL}"
