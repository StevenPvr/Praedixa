#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
KCADM_BIN="${KCADM_BIN:-$SCRIPT_DIR/kcadm}"

source "$SCRIPT_DIR/../lib/keycloak.sh"
source "$SCRIPT_DIR/../lib/local-env.sh"

KEYCLOAK_SERVER_URL="${KEYCLOAK_SERVER_URL:-https://auth.praedixa.com}"
KEYCLOAK_ADMIN_REALM="${KEYCLOAK_ADMIN_REALM:-master}"
KEYCLOAK_ADMIN_USERNAME="${KEYCLOAK_ADMIN_USERNAME:-kcadmin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-praedixa}"
KEYCLOAK_EMAIL_THEME="${KEYCLOAK_EMAIL_THEME:-praedixa}"

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
require_non_empty "$KEYCLOAK_EMAIL_THEME" "KEYCLOAK_EMAIL_THEME"
KCADM_CONFIG_FILE="${KCADM_CONFIG_FILE:-$(create_kcadm_config_file)}"
cleanup_kcadm_config_file() {
  rm -f "$KCADM_CONFIG_FILE"
}
trap cleanup_kcadm_config_file EXIT

echo "[auth] Logging into Keycloak admin API"
run_kcadm_with_password "$KEYCLOAK_ADMIN_PASSWORD" \
  "$KCADM_BIN" config credentials --config "$KCADM_CONFIG_FILE" \
  --server "$KEYCLOAK_SERVER_URL" \
  --realm "$KEYCLOAK_ADMIN_REALM" \
  --user "$KEYCLOAK_ADMIN_USERNAME" >/dev/null

echo "[auth] Enforcing Keycloak email theme ${KEYCLOAK_EMAIL_THEME} on ${KEYCLOAK_REALM}"
realm_json="$("$KCADM_BIN" get --config "$KCADM_CONFIG_FILE" "realms/${KEYCLOAK_REALM}")"
updated_realm_json="$(
  REALM_JSON="$realm_json" python3 - <<'PY'
import json
import os

realm = json.loads(os.environ["REALM_JSON"])
realm["emailTheme"] = os.environ["KEYCLOAK_EMAIL_THEME"]
print(json.dumps(realm))
PY
)"
printf '%s' "$updated_realm_json" \
  | "$KCADM_BIN" update --config "$KCADM_CONFIG_FILE" "realms/${KEYCLOAK_REALM}" -f - >/dev/null

actual_theme="$("$KCADM_BIN" get --config "$KCADM_CONFIG_FILE" "realms/${KEYCLOAK_REALM}" | jq -r '.emailTheme // empty')"
if [ "$actual_theme" != "$KEYCLOAK_EMAIL_THEME" ]; then
  echo "Keycloak email theme verification failed: expected ${KEYCLOAK_EMAIL_THEME}, got ${actual_theme:-<empty>}" >&2
  exit 1
fi

echo "[ok] Keycloak email theme is aligned for ${KEYCLOAK_REALM}"
