#!/usr/bin/env bash
set -euo pipefail

REGION="fr-par"
NAMESPACE_NAME="centaurus-prod"
CONTAINER_NAME="centaurus-prospect"

require_non_empty() {
  local value="$1"
  local label="$2"
  if [ -z "$value" ]; then
    echo "Missing required env var: $label" >&2
    exit 1
  fi
}

BASIC_AUTH_USERNAME="${BASIC_AUTH_USERNAME:-}"
BASIC_AUTH_PASSWORD="${BASIC_AUTH_PASSWORD:-}"

require_non_empty "$BASIC_AUTH_USERNAME" "BASIC_AUTH_USERNAME"
require_non_empty "$BASIC_AUTH_PASSWORD" "BASIC_AUTH_PASSWORD"

NS_ID="$(scw container namespace list region="$REGION" -o json | jq -r --arg n "$NAMESPACE_NAME" '.[] | select(.name==$n) | .id' | head -n1)"
if [ -z "$NS_ID" ]; then
  echo "Namespace not found: $NAMESPACE_NAME" >&2
  exit 1
fi

CONTAINER_ID="$(scw container container list namespace-id="$NS_ID" region="$REGION" -o json | jq -r --arg n "$CONTAINER_NAME" '.[] | select(.name==$n) | .id' | head -n1)"
if [ -z "$CONTAINER_ID" ]; then
  echo "Container not found: $CONTAINER_NAME" >&2
  exit 1
fi

echo "Configuring centaurus protected access (${CONTAINER_ID})"
scw container container update "$CONTAINER_ID" \
  region="$REGION" \
  secret-environment-variables.0.key=BASIC_AUTH_USERNAME \
  secret-environment-variables.0.value="$BASIC_AUTH_USERNAME" \
  secret-environment-variables.1.key=BASIC_AUTH_PASSWORD \
  secret-environment-variables.1.value="$BASIC_AUTH_PASSWORD" >/dev/null
echo "Environment configured for centaurus."
