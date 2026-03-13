#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/json-env.sh"

REGION="fr-par"
CONTAINER_NAME="auth-prod"
AUTH_HOSTNAME="${AUTH_HOSTNAME:-auth.praedixa.com}"
KC_DB_URL_HOST="${KC_DB_URL_HOST:-}"
KC_DB_URL_PORT="${KC_DB_URL_PORT:-5432}"
KC_DB_URL_DATABASE="${KC_DB_URL_DATABASE:-}"
KC_DB_USERNAME="${KC_DB_USERNAME:-}"
KC_DB_PASSWORD="${KC_DB_PASSWORD:-}"
KEYCLOAK_ADMIN_USERNAME="${KEYCLOAK_ADMIN_USERNAME:-kcadmin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-}"

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

require_cmd scw
require_cmd jq
require_cmd python3
require_non_empty "$KC_DB_URL_HOST" "KC_DB_URL_HOST"
require_non_empty "$KC_DB_URL_PORT" "KC_DB_URL_PORT"
require_non_empty "$KC_DB_URL_DATABASE" "KC_DB_URL_DATABASE"
require_non_empty "$KC_DB_USERNAME" "KC_DB_USERNAME"
require_non_empty "$KC_DB_PASSWORD" "KC_DB_PASSWORD"
require_non_empty "$KEYCLOAK_ADMIN_PASSWORD" "KEYCLOAK_ADMIN_PASSWORD"

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
  KC_BOOTSTRAP_ADMIN_USERNAME

export KC_DB_PASSWORD KC_BOOTSTRAP_ADMIN_PASSWORD
write_json_from_env \
  "$SECRETS_FILE_PATH" \
  KC_DB_PASSWORD \
  KC_BOOTSTRAP_ADMIN_PASSWORD

./scripts/scw-secret-sync.sh \
  --region "$REGION" \
  --path-prefix "$SECRET_PATH_PREFIX" \
  --secrets-file "$SECRETS_FILE_PATH" >/dev/null

./scripts/scw-apply-container-config.sh \
  --container-id "$container_id" \
  --region "$REGION" \
  --env-file "$ENV_FILE_PATH" \
  --secrets-file "$SECRETS_FILE_PATH" \
  --sandbox v2 \
  --http-option redirected \
  --wait >/dev/null

echo "Scaleway auth runtime configuration updated."
