#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/json-env.sh"

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <staging|prod>" >&2
  exit 1
fi

ENV="$1"
REGION="fr-par"

case "$ENV" in
  staging)
    NAMESPACE_NAME="api-staging"
    CONTAINER_NAME="api-staging"
    ENVIRONMENT_VALUE="staging"
    ;;
  prod)
    NAMESPACE_NAME="api-prod"
    CONTAINER_NAME="api-prod"
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

SCW_SECRET_KEY="${SCW_SECRET_KEY:-}"
SCW_DEFAULT_PROJECT_ID="${SCW_DEFAULT_PROJECT_ID:-}"
LOG_LEVEL="${LOG_LEVEL:-info}"

require_non_empty "$DATABASE_URL" "DATABASE_URL"
require_non_empty "$AUTH_JWKS_URL" "AUTH_JWKS_URL"
require_non_empty "$AUTH_ISSUER_URL" "AUTH_ISSUER_URL"
require_non_empty "$AUTH_AUDIENCE" "AUTH_AUDIENCE"
require_non_empty "$AUTH_ALLOWED_JWKS_HOSTS" "AUTH_ALLOWED_JWKS_HOSTS"
require_non_empty "$CORS_ORIGINS" "CORS_ORIGINS"
require_non_empty "$RATE_LIMIT_STORAGE_URI" "RATE_LIMIT_STORAGE_URI"
require_non_empty "$CONTACT_API_INGEST_TOKEN" "CONTACT_API_INGEST_TOKEN"
require_non_empty "$KEYCLOAK_ADMIN_USERNAME" "KEYCLOAK_ADMIN_USERNAME"
require_non_empty "$KEYCLOAK_ADMIN_PASSWORD" "KEYCLOAK_ADMIN_PASSWORD"
require_non_empty "$SCW_SECRET_KEY" "SCW_SECRET_KEY"
require_non_empty "$SCW_DEFAULT_PROJECT_ID" "SCW_DEFAULT_PROJECT_ID"

require_cmd scw
require_cmd jq
require_cmd python3

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
export ENVIRONMENT LOG_LEVEL AUTH_JWKS_URL AUTH_ISSUER_URL AUTH_AUDIENCE AUTH_ALLOWED_JWKS_HOSTS CORS_ORIGINS SCW_DEFAULT_PROJECT_ID DEBUG KEY_PROVIDER KEYCLOAK_ADMIN_USERNAME
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
  KEYCLOAK_ADMIN_USERNAME \
  SCW_DEFAULT_PROJECT_ID

export DATABASE_URL RATE_LIMIT_STORAGE_URI CONTACT_API_INGEST_TOKEN KEYCLOAK_ADMIN_PASSWORD SCW_SECRET_KEY
write_json_from_env \
  "$SECRETS_FILE_PATH" \
  DATABASE_URL \
  RATE_LIMIT_STORAGE_URI \
  CONTACT_API_INGEST_TOKEN \
  KEYCLOAK_ADMIN_PASSWORD \
  SCW_SECRET_KEY

./scripts/scw-secret-sync.sh \
  --region "$REGION" \
  --path-prefix "$SECRET_PATH_PREFIX" \
  --secrets-file "$SECRETS_FILE_PATH" >/dev/null

echo "Configuring api:${ENV} container env (${CONTAINER_ID})"
./scripts/scw-apply-container-config.sh \
  --container-id "$CONTAINER_ID" \
  --region "$REGION" \
  --env-file "$ENV_FILE_PATH" \
  --secrets-file "$SECRETS_FILE_PATH" >/dev/null
echo "Environment configured for api:${ENV}."
