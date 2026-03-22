#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/../lib/json-env.sh"
source "$SCRIPT_DIR/../lib/local-env.sh"
source "$SCRIPT_DIR/../lib/scw-topology.sh"

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <staging|prod>" >&2
  exit 1
fi

ENV="$1"
REGION="fr-par"
NAMESPACE_NAME="$(scw_topology_platform_field "api" "$ENV" "namespace_name")"
CONTAINER_NAME="$(scw_topology_platform_field "api" "$ENV" "container_name")"
PRIVATE_NETWORK_NAME="$(scw_topology_platform_field "api" "$ENV" "private_network_name")"
if [ -z "$NAMESPACE_NAME" ] || [ -z "$CONTAINER_NAME" ] || [ -z "$PRIVATE_NETWORK_NAME" ]; then
  echo "Unsupported api environment from Scaleway topology: $ENV" >&2
  exit 1
fi

case "$ENV" in
  staging)
    ENVIRONMENT_VALUE="staging"
    ;;
  prod)
    ENVIRONMENT_VALUE="production"
    ;;
  *)
    echo "Unsupported environment: $ENV" >&2
    exit 1
    ;;
esac

require_non_empty() {
  local value="$1"
  local label="$2"
  if [ -z "$value" ]; then
    echo "Missing required env var: $label" >&2
    exit 1
  fi
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

get_scw_config_value() {
  local key="$1"
  scw config get "$key" 2>/dev/null | tr -d '\r'
}

resolve_private_network_id() {
  local network_name="$1"
  scw vpc private-network list region="$REGION" -o json \
    | jq -r --arg name "$network_name" '.[] | select(.name == $name) | .id' \
    | head -n1
}

DATABASE_URL="${DATABASE_URL:-}"
AUTH_JWKS_URL="${AUTH_JWKS_URL:-}"
AUTH_ISSUER_URL="${AUTH_ISSUER_URL:-}"
AUTH_AUDIENCE="${AUTH_AUDIENCE:-praedixa-api}"
AUTH_ALLOWED_JWKS_HOSTS="${AUTH_ALLOWED_JWKS_HOSTS:-}"
CORS_ORIGINS="${CORS_ORIGINS:-}"
RATE_LIMIT_STORAGE_URI="${RATE_LIMIT_STORAGE_URI:-}"
CONTACT_API_INGEST_TOKEN="${CONTACT_API_INGEST_TOKEN:-}"
KEYCLOAK_ADMIN_USERNAME="${KEYCLOAK_ADMIN_USERNAME:-kcadmin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-}"
KEYCLOAK_ADMIN_CLIENT_ID="${KEYCLOAK_ADMIN_CLIENT_ID:-}"
KEYCLOAK_ADMIN_CLIENT_SECRET="${KEYCLOAK_ADMIN_CLIENT_SECRET:-}"
KEYCLOAK_ADMIN_REALM="${KEYCLOAK_ADMIN_REALM:-master}"
KEYCLOAK_ADMIN_AUTH_MODE="${KEYCLOAK_ADMIN_AUTH_MODE:-}"
RESEND_WEBHOOK_SECRET="${RESEND_WEBHOOK_SECRET:-}"
PRIVATE_NETWORK_ID="${PRIVATE_NETWORK_ID:-}"

SCW_SECRET_KEY="${SCW_SECRET_KEY:-}"
SCW_DEFAULT_PROJECT_ID="${SCW_DEFAULT_PROJECT_ID:-}"
LOG_LEVEL="${LOG_LEVEL:-info}"

require_cmd scw
require_cmd jq
require_cmd python3

autofill_keycloak_admin_username_from_local_env "$REPO_ROOT"
autofill_keycloak_admin_password_from_local_env "$REPO_ROOT"
autofill_resend_webhook_secret_from_local_env "$REPO_ROOT"

if [ -z "$SCW_SECRET_KEY" ]; then
  SCW_SECRET_KEY="$(get_scw_config_value secret-key)"
fi
if [ -z "$SCW_DEFAULT_PROJECT_ID" ]; then
  SCW_DEFAULT_PROJECT_ID="$(get_scw_config_value default-project-id)"
fi
if [ -z "$PRIVATE_NETWORK_ID" ]; then
  PRIVATE_NETWORK_ID="$(resolve_private_network_id "$PRIVATE_NETWORK_NAME")"
fi

require_non_empty "$DATABASE_URL" "DATABASE_URL"
require_non_empty "$AUTH_JWKS_URL" "AUTH_JWKS_URL"
require_non_empty "$AUTH_ISSUER_URL" "AUTH_ISSUER_URL"
require_non_empty "$AUTH_AUDIENCE" "AUTH_AUDIENCE"
require_non_empty "$AUTH_ALLOWED_JWKS_HOSTS" "AUTH_ALLOWED_JWKS_HOSTS"
require_non_empty "$CORS_ORIGINS" "CORS_ORIGINS"
require_non_empty "$RATE_LIMIT_STORAGE_URI" "RATE_LIMIT_STORAGE_URI"
require_non_empty "$CONTACT_API_INGEST_TOKEN" "CONTACT_API_INGEST_TOKEN"
require_non_empty "$RESEND_WEBHOOK_SECRET" "RESEND_WEBHOOK_SECRET"
require_non_empty "$PRIVATE_NETWORK_ID" "PRIVATE_NETWORK_ID"
require_non_empty "$SCW_SECRET_KEY" "SCW_SECRET_KEY"
require_non_empty "$SCW_DEFAULT_PROJECT_ID" "SCW_DEFAULT_PROJECT_ID"

resolve_keycloak_admin_auth_mode() {
  if [ -n "$KEYCLOAK_ADMIN_AUTH_MODE" ]; then
    case "$KEYCLOAK_ADMIN_AUTH_MODE" in
      password)
        require_non_empty "$KEYCLOAK_ADMIN_USERNAME" "KEYCLOAK_ADMIN_USERNAME"
        require_non_empty "$KEYCLOAK_ADMIN_PASSWORD" "KEYCLOAK_ADMIN_PASSWORD"
        return 0
        ;;
      client_credentials)
        require_non_empty "$KEYCLOAK_ADMIN_CLIENT_ID" "KEYCLOAK_ADMIN_CLIENT_ID"
        require_non_empty "$KEYCLOAK_ADMIN_CLIENT_SECRET" "KEYCLOAK_ADMIN_CLIENT_SECRET"
        return 0
        ;;
      *)
        echo "Unsupported KEYCLOAK_ADMIN_AUTH_MODE: $KEYCLOAK_ADMIN_AUTH_MODE" >&2
        exit 1
        ;;
    esac
  fi

  if [ -n "$KEYCLOAK_ADMIN_CLIENT_ID" ] && [ -n "$KEYCLOAK_ADMIN_CLIENT_SECRET" ]; then
    KEYCLOAK_ADMIN_AUTH_MODE="client_credentials"
    return 0
  fi

  require_non_empty "$KEYCLOAK_ADMIN_USERNAME" "KEYCLOAK_ADMIN_USERNAME"
  require_non_empty "$KEYCLOAK_ADMIN_PASSWORD" "KEYCLOAK_ADMIN_PASSWORD"
  KEYCLOAK_ADMIN_AUTH_MODE="password"
}

resolve_keycloak_admin_auth_mode

NS_ID=$(scw container namespace list region="$REGION" -o json | jq -r --arg n "$NAMESPACE_NAME" '.[] | select(.name==$n) | .id' | head -n1)
if [ -z "$NS_ID" ]; then
  echo "Namespace not found: $NAMESPACE_NAME" >&2
  exit 1
fi

CONTAINER_ID=$(scw container container list namespace-id="$NS_ID" region="$REGION" -o json | jq -r --arg n "$CONTAINER_NAME" '.[] | select(.name==$n) | .id' | head -n1)
if [ -z "$CONTAINER_ID" ]; then
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
SECRET_PATH_PREFIX="/praedixa/${ENV}/${CONTAINER_NAME}/runtime"

DEBUG="false"
ENVIRONMENT="$ENVIRONMENT_VALUE"
KEY_PROVIDER="scaleway"
export ENVIRONMENT LOG_LEVEL AUTH_JWKS_URL AUTH_ISSUER_URL AUTH_AUDIENCE AUTH_ALLOWED_JWKS_HOSTS CORS_ORIGINS SCW_DEFAULT_PROJECT_ID DEBUG KEY_PROVIDER KEYCLOAK_ADMIN_AUTH_MODE KEYCLOAK_ADMIN_REALM KEYCLOAK_ADMIN_USERNAME KEYCLOAK_ADMIN_CLIENT_ID
write_json_from_env \
  "$ENV_FILE_PATH" \
  ENVIRONMENT \
  DEBUG \
  LOG_LEVEL \
  KEY_PROVIDER \
  AUTH_JWKS_URL \
  AUTH_ISSUER_URL \
  AUTH_AUDIENCE \
  AUTH_ALLOWED_JWKS_HOSTS \
  CORS_ORIGINS \
  KEYCLOAK_ADMIN_AUTH_MODE \
  KEYCLOAK_ADMIN_REALM \
  KEYCLOAK_ADMIN_USERNAME \
  KEYCLOAK_ADMIN_CLIENT_ID \
  SCW_DEFAULT_PROJECT_ID

export DATABASE_URL RATE_LIMIT_STORAGE_URI CONTACT_API_INGEST_TOKEN RESEND_WEBHOOK_SECRET KEYCLOAK_ADMIN_PASSWORD KEYCLOAK_ADMIN_CLIENT_SECRET SCW_SECRET_KEY
write_json_from_env \
  "$SECRETS_FILE_PATH" \
  DATABASE_URL \
  RATE_LIMIT_STORAGE_URI \
  CONTACT_API_INGEST_TOKEN \
  RESEND_WEBHOOK_SECRET \
  KEYCLOAK_ADMIN_PASSWORD \
  KEYCLOAK_ADMIN_CLIENT_SECRET \
  SCW_SECRET_KEY

./scripts/scw/scw-secret-sync.sh \
  --region "$REGION" \
  --path-prefix "$SECRET_PATH_PREFIX" \
  --secrets-file "$SECRETS_FILE_PATH" >/dev/null

echo "Configuring api:${ENV} container env (${CONTAINER_ID})"
./scripts/scw/scw-apply-container-config.sh \
  --container-id "$CONTAINER_ID" \
  --region "$REGION" \
  --env-file "$ENV_FILE_PATH" \
  --secrets-file "$SECRETS_FILE_PATH" \
  --sandbox v2 \
  --http-option redirected \
  --private-network-id "$PRIVATE_NETWORK_ID" \
  --wait >/dev/null
echo "Environment configured for api:${ENV}."
