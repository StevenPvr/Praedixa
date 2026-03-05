#!/usr/bin/env bash
set -euo pipefail

REGION="fr-par"
CONTAINER_NAME="auth-prod"
AUTH_HOSTNAME="${AUTH_HOSTNAME:-auth.praedixa.com}"
KEYCLOAK_ADMIN_USERNAME="${KEYCLOAK_ADMIN_USERNAME:-admin}"
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
require_non_empty "$KEYCLOAK_ADMIN_PASSWORD" "KEYCLOAK_ADMIN_PASSWORD"

container_id="$(scw container container list region="$REGION" -o json | jq -r --arg n "$CONTAINER_NAME" '.[] | select(.name==$n) | .id' | head -n1)"
if [ -z "$container_id" ]; then
  echo "Container not found: $CONTAINER_NAME" >&2
  exit 1
fi

scw container container update "$container_id" \
  region="$REGION" \
  redeploy=true \
  sandbox=v2 \
  http-option=redirected \
  environment-variables.KC_HEALTH_ENABLED=true \
  environment-variables.KC_METRICS_ENABLED=true \
  environment-variables.KC_LOG_LEVEL=info \
  environment-variables.KC_PROXY_HEADERS=xforwarded \
  environment-variables.KC_HTTP_ENABLED=true \
  environment-variables.KC_HOSTNAME="$AUTH_HOSTNAME" \
  environment-variables.KC_BOOTSTRAP_ADMIN_USERNAME="$KEYCLOAK_ADMIN_USERNAME" \
  secret-environment-variables.0.key=KC_BOOTSTRAP_ADMIN_PASSWORD \
  secret-environment-variables.0.value="$KEYCLOAK_ADMIN_PASSWORD" \
  -w >/dev/null

echo "Scaleway auth runtime configuration updated."
