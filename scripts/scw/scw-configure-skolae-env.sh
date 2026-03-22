#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/json-env.sh"

REGION="fr-par"
NAMESPACE_NAME="skolae-prod"
CONTAINER_NAME="skolae-prospect"

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

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

SECRETS_FILE_PATH="$TMP_DIR/secrets.json"

export BASIC_AUTH_USERNAME BASIC_AUTH_PASSWORD
write_json_from_env \
  "$SECRETS_FILE_PATH" \
  BASIC_AUTH_USERNAME \
  BASIC_AUTH_PASSWORD

echo "Configuring skolae protected access (${CONTAINER_ID})"
./scripts/scw/scw-apply-container-config.sh \
  --container-id "$CONTAINER_ID" \
  --region "$REGION" \
  --secrets-file "$SECRETS_FILE_PATH" >/dev/null
echo "Environment configured for skolae."
