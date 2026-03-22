#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/json-env.sh"

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <staging|prod>" >&2
  exit 1
fi

ENV="$1"
REGION="fr-par"

case "$ENV" in
  staging)
    NAMESPACE_NAME="landing-staging"
    CONTAINER_NAME="landing-staging"
    ;;
  prod)
    NAMESPACE_NAME="landing-prod"
    CONTAINER_NAME="landing-web"
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

require_binary_flag() {
  local value="$1"
  local label="$2"
  if [ "$value" != "0" ] && [ "$value" != "1" ]; then
    echo "Invalid value for $label: expected 0 or 1, got '$value'" >&2
    exit 1
  fi
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

CONTACT_API_BASE_URL="${CONTACT_API_BASE_URL:-}"
CONTACT_API_INGEST_TOKEN="${CONTACT_API_INGEST_TOKEN:-}"
RESEND_API_KEY="${RESEND_API_KEY:-}"
RATE_LIMIT_STORAGE_URI="${RATE_LIMIT_STORAGE_URI:-}"
CONTACT_FORM_CHALLENGE_SECRET="${CONTACT_FORM_CHALLENGE_SECRET:-}"
LANDING_ASSET_SIGNING_SECRET="${LANDING_ASSET_SIGNING_SECRET:-}"
RESEND_FROM_EMAIL="${RESEND_FROM_EMAIL:-}"
RESEND_REPLY_TO_EMAIL="${RESEND_REPLY_TO_EMAIL:-}"
ALLOWED_FORM_ORIGINS="${ALLOWED_FORM_ORIGINS:-}"
NEXT_PUBLIC_GA_MEASUREMENT_ID="${NEXT_PUBLIC_GA_MEASUREMENT_ID:-}"
LANDING_TRUST_PROXY_IP_HEADERS="${LANDING_TRUST_PROXY_IP_HEADERS:-1}"
LANDING_SECURITY_KEY_PREFIX="${LANDING_SECURITY_KEY_PREFIX:-prx:landing:sec}"
LANDING_SECURITY_REDIS_CONNECT_TIMEOUT_MS="${LANDING_SECURITY_REDIS_CONNECT_TIMEOUT_MS:-300}"
LANDING_SECURITY_REDIS_COMMAND_TIMEOUT_MS="${LANDING_SECURITY_REDIS_COMMAND_TIMEOUT_MS:-300}"

require_non_empty "$CONTACT_API_BASE_URL" "CONTACT_API_BASE_URL"
require_non_empty "$CONTACT_API_INGEST_TOKEN" "CONTACT_API_INGEST_TOKEN"
require_non_empty "$RESEND_API_KEY" "RESEND_API_KEY"
require_non_empty "$RATE_LIMIT_STORAGE_URI" "RATE_LIMIT_STORAGE_URI"
require_non_empty "$CONTACT_FORM_CHALLENGE_SECRET" "CONTACT_FORM_CHALLENGE_SECRET"
require_non_empty "$LANDING_ASSET_SIGNING_SECRET" "LANDING_ASSET_SIGNING_SECRET"
require_binary_flag "$LANDING_TRUST_PROXY_IP_HEADERS" "LANDING_TRUST_PROXY_IP_HEADERS"

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

tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

env_file="$tmp_dir/env.json"
secrets_file="$tmp_dir/secrets.json"
secret_path_prefix="/praedixa/${ENV}/${CONTAINER_NAME}/runtime"

export CONTACT_API_BASE_URL LANDING_TRUST_PROXY_IP_HEADERS LANDING_SECURITY_KEY_PREFIX LANDING_SECURITY_REDIS_CONNECT_TIMEOUT_MS LANDING_SECURITY_REDIS_COMMAND_TIMEOUT_MS RESEND_FROM_EMAIL RESEND_REPLY_TO_EMAIL ALLOWED_FORM_ORIGINS NEXT_PUBLIC_GA_MEASUREMENT_ID
write_json_from_env \
  "$env_file" \
  CONTACT_API_BASE_URL \
  LANDING_TRUST_PROXY_IP_HEADERS \
  LANDING_SECURITY_KEY_PREFIX \
  LANDING_SECURITY_REDIS_CONNECT_TIMEOUT_MS \
  LANDING_SECURITY_REDIS_COMMAND_TIMEOUT_MS \
  RESEND_FROM_EMAIL \
  RESEND_REPLY_TO_EMAIL \
  ALLOWED_FORM_ORIGINS \
  NEXT_PUBLIC_GA_MEASUREMENT_ID

export CONTACT_API_INGEST_TOKEN RESEND_API_KEY RATE_LIMIT_STORAGE_URI CONTACT_FORM_CHALLENGE_SECRET LANDING_ASSET_SIGNING_SECRET
write_json_from_env \
  "$secrets_file" \
  CONTACT_API_INGEST_TOKEN \
  RESEND_API_KEY \
  RATE_LIMIT_STORAGE_URI \
  CONTACT_FORM_CHALLENGE_SECRET \
  LANDING_ASSET_SIGNING_SECRET

./scripts/scw/scw-secret-sync.sh \
  --region "$REGION" \
  --path-prefix "$secret_path_prefix" \
  --secrets-file "$secrets_file" \
  >/dev/null

echo "Configuring landing:${ENV} container env (${CONTAINER_ID})"
./scripts/scw/scw-apply-container-config.sh \
  --region "$REGION" \
  --container-id "$CONTAINER_ID" \
  --env-file "$env_file" \
  --secrets-file "$secrets_file" \
  --redeploy true \
  --wait

echo "Environment configured for landing:${ENV}."
