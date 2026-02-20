#!/usr/bin/env bash
set -euo pipefail

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

DATABASE_URL="${DATABASE_URL:-}"
AUTH_JWKS_URL="${AUTH_JWKS_URL:-}"
AUTH_ISSUER_URL="${AUTH_ISSUER_URL:-}"
AUTH_AUDIENCE="${AUTH_AUDIENCE:-praedixa-api}"
AUTH_ALLOWED_JWKS_HOSTS="${AUTH_ALLOWED_JWKS_HOSTS:-}"
CORS_ORIGINS="${CORS_ORIGINS:-}"
RATE_LIMIT_STORAGE_URI="${RATE_LIMIT_STORAGE_URI:-}"
CONTACT_API_INGEST_TOKEN="${CONTACT_API_INGEST_TOKEN:-}"

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
require_non_empty "$SCW_SECRET_KEY" "SCW_SECRET_KEY"
require_non_empty "$SCW_DEFAULT_PROJECT_ID" "SCW_DEFAULT_PROJECT_ID"

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

cmd=(
  scw container container update "$CONTAINER_ID"
  "region=$REGION"
  "environment-variables.ENVIRONMENT=$ENVIRONMENT_VALUE"
  "environment-variables.DEBUG=false"
  "environment-variables.LOG_LEVEL=$LOG_LEVEL"
  "environment-variables.KEY_PROVIDER=scaleway"
  "environment-variables.AUTH_JWKS_URL=$AUTH_JWKS_URL"
  "environment-variables.AUTH_ISSUER_URL=$AUTH_ISSUER_URL"
  "environment-variables.AUTH_AUDIENCE=$AUTH_AUDIENCE"
  "environment-variables.AUTH_ALLOWED_JWKS_HOSTS=$AUTH_ALLOWED_JWKS_HOSTS"
  "environment-variables.CORS_ORIGINS=$CORS_ORIGINS"
  "environment-variables.SCW_DEFAULT_PROJECT_ID=$SCW_DEFAULT_PROJECT_ID"
  "secret-environment-variables.0.key=DATABASE_URL"
  "secret-environment-variables.0.value=$DATABASE_URL"
  "secret-environment-variables.1.key=RATE_LIMIT_STORAGE_URI"
  "secret-environment-variables.1.value=$RATE_LIMIT_STORAGE_URI"
  "secret-environment-variables.2.key=CONTACT_API_INGEST_TOKEN"
  "secret-environment-variables.2.value=$CONTACT_API_INGEST_TOKEN"
  "secret-environment-variables.3.key=SCW_SECRET_KEY"
  "secret-environment-variables.3.value=$SCW_SECRET_KEY"
)

echo "Configuring api:${ENV} container env (${CONTAINER_ID})"
"${cmd[@]}" >/dev/null
echo "Environment configured for api:${ENV}."
