#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <webapp|admin> <staging|prod>" >&2
  exit 1
fi

APP="$1"
ENV="$2"
REGION="fr-par"

case "${APP}:${ENV}" in
  webapp:staging)
    NAMESPACE_NAME="webapp-staging"
    CONTAINER_NAME="webapp-staging"
    DEFAULT_CLIENT_ID="praedixa-webapp"
    ;;
  webapp:prod)
    NAMESPACE_NAME="webapp-prod"
    CONTAINER_NAME="webapp-prod"
    DEFAULT_CLIENT_ID="praedixa-webapp"
    ;;
  admin:staging)
    NAMESPACE_NAME="admin-staging"
    CONTAINER_NAME="admin-staging"
    DEFAULT_CLIENT_ID="praedixa-admin"
    ;;
  admin:prod)
    NAMESPACE_NAME="admin-prod"
    CONTAINER_NAME="admin-prod"
    DEFAULT_CLIENT_ID="praedixa-admin"
    ;;
  *)
    echo "Unsupported target: ${APP}:${ENV}" >&2
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

NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-}"
AUTH_OIDC_ISSUER_URL="${AUTH_OIDC_ISSUER_URL:-}"
AUTH_OIDC_CLIENT_ID="${AUTH_OIDC_CLIENT_ID:-$DEFAULT_CLIENT_ID}"
AUTH_OIDC_SCOPE="${AUTH_OIDC_SCOPE:-openid profile email offline_access}"
AUTH_SESSION_SECRET="${AUTH_SESSION_SECRET:-}"
AUTH_OIDC_CLIENT_SECRET="${AUTH_OIDC_CLIENT_SECRET:-}"

require_non_empty "$NEXT_PUBLIC_API_URL" "NEXT_PUBLIC_API_URL"
require_non_empty "$AUTH_OIDC_ISSUER_URL" "AUTH_OIDC_ISSUER_URL"
require_non_empty "$AUTH_OIDC_CLIENT_ID" "AUTH_OIDC_CLIENT_ID"
require_non_empty "$AUTH_SESSION_SECRET" "AUTH_SESSION_SECRET"

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
  "environment-variables.NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"
  "environment-variables.AUTH_OIDC_ISSUER_URL=$AUTH_OIDC_ISSUER_URL"
  "environment-variables.AUTH_OIDC_CLIENT_ID=$AUTH_OIDC_CLIENT_ID"
  "environment-variables.AUTH_OIDC_SCOPE=$AUTH_OIDC_SCOPE"
  "secret-environment-variables.0.key=AUTH_SESSION_SECRET"
  "secret-environment-variables.0.value=$AUTH_SESSION_SECRET"
)

if [ -n "$AUTH_OIDC_CLIENT_SECRET" ]; then
  cmd+=(
    "secret-environment-variables.1.key=AUTH_OIDC_CLIENT_SECRET"
    "secret-environment-variables.1.value=$AUTH_OIDC_CLIENT_SECRET"
  )
fi

echo "Configuring ${APP}:${ENV} container env (${CONTAINER_ID})"
"${cmd[@]}" >/dev/null
echo "Environment configured for ${APP}:${ENV}."
