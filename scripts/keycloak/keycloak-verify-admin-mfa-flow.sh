#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
KCADM_BIN="${KCADM_BIN:-$SCRIPT_DIR/kcadm}"
POLICY_PATH="${POLICY_PATH:-$REPO_ROOT/infra/auth/admin-mfa-browser-flow-policy.json}"
source "$SCRIPT_DIR/../lib/keycloak.sh"
source "$SCRIPT_DIR/../lib/json-log.sh"
source "$SCRIPT_DIR/../lib/local-env.sh"
SCRIPT_SERVICE="auth"

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
require_cmd node

if [ ! -x "$KCADM_BIN" ]; then
  echo "kcadm wrapper is missing or not executable: $KCADM_BIN" >&2
  exit 1
fi

if [ ! -f "$POLICY_PATH" ]; then
  echo "Admin MFA browser flow policy is missing: $POLICY_PATH" >&2
  exit 1
fi

autofill_keycloak_admin_password_from_local_env "$REPO_ROOT"
require_non_empty "$KEYCLOAK_ADMIN_PASSWORD" "KEYCLOAK_ADMIN_PASSWORD"

json_log::emit \
  info \
  keycloak_admin_mfa_verify.started \
  "Verifying live Keycloak admin MFA flow" \
  realm="$KEYCLOAK_REALM" \
  keycloak_url="$KEYCLOAK_SERVER_URL"

tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

echo "[auth] Logging into Keycloak admin API"
run_kcadm_with_password "$KEYCLOAK_ADMIN_PASSWORD" \
  "$KCADM_BIN" config credentials \
  --server "$KEYCLOAK_SERVER_URL" \
  --realm "$KEYCLOAK_ADMIN_REALM" \
  --user "$KEYCLOAK_ADMIN_USERNAME" >/dev/null

realm_path="$tmp_dir/realm.json"
flow_path="$tmp_dir/browser-flow.json"

"$KCADM_BIN" get "realms/${KEYCLOAK_REALM}" >"$realm_path"

browser_flow_alias="$(
  jq -r '.browserFlow // empty' "$realm_path"
)"
if [ -z "$browser_flow_alias" ]; then
  echo "Realm ${KEYCLOAK_REALM} does not expose browserFlow" >&2
  exit 1
fi

"$KCADM_BIN" get "authentication/flows/${browser_flow_alias}/executions" -r "$KEYCLOAK_REALM" >"$flow_path"

node "$REPO_ROOT/scripts/verify-admin-mfa-readiness.mjs" \
  --realm-export "$realm_path" \
  --policy "$POLICY_PATH" \
  --live-flow-json "$flow_path"

json_log::emit \
  info \
  keycloak_admin_mfa_verify.completed \
  "Live Keycloak admin MFA flow matches policy" \
  realm="$KEYCLOAK_REALM"
echo "[ok] Live Keycloak admin MFA flow matches versioned policy"
