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

CONTACT_API_BASE_URL="${CONTACT_API_BASE_URL:-}"
CONTACT_API_INGEST_TOKEN="${CONTACT_API_INGEST_TOKEN:-}"
RESEND_API_KEY="${RESEND_API_KEY:-}"
RATE_LIMIT_STORAGE_URI="${RATE_LIMIT_STORAGE_URI:-}"
CONTACT_FORM_CHALLENGE_SECRET="${CONTACT_FORM_CHALLENGE_SECRET:-}"
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
require_binary_flag "$LANDING_TRUST_PROXY_IP_HEADERS" "LANDING_TRUST_PROXY_IP_HEADERS"

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

jq -n \
  --arg contact_api_base_url "$CONTACT_API_BASE_URL" \
  --arg landing_trust_proxy_ip_headers "$LANDING_TRUST_PROXY_IP_HEADERS" \
  --arg landing_security_key_prefix "$LANDING_SECURITY_KEY_PREFIX" \
  --arg landing_security_redis_connect_timeout_ms "$LANDING_SECURITY_REDIS_CONNECT_TIMEOUT_MS" \
  --arg landing_security_redis_command_timeout_ms "$LANDING_SECURITY_REDIS_COMMAND_TIMEOUT_MS" \
  '{
    CONTACT_API_BASE_URL: $contact_api_base_url,
    LANDING_TRUST_PROXY_IP_HEADERS: $landing_trust_proxy_ip_headers,
    LANDING_SECURITY_KEY_PREFIX: $landing_security_key_prefix,
    LANDING_SECURITY_REDIS_CONNECT_TIMEOUT_MS: $landing_security_redis_connect_timeout_ms,
    LANDING_SECURITY_REDIS_COMMAND_TIMEOUT_MS: $landing_security_redis_command_timeout_ms
  }' >"$env_file"

if [ -n "$RESEND_FROM_EMAIL" ]; then
  tmp_env="$tmp_dir/env-with-from.json"
  jq --arg resend_from_email "$RESEND_FROM_EMAIL" '. + { RESEND_FROM_EMAIL: $resend_from_email }' "$env_file" >"$tmp_env"
  mv "$tmp_env" "$env_file"
fi

if [ -n "$RESEND_REPLY_TO_EMAIL" ]; then
  tmp_env="$tmp_dir/env-with-reply-to.json"
  jq --arg resend_reply_to_email "$RESEND_REPLY_TO_EMAIL" '. + { RESEND_REPLY_TO_EMAIL: $resend_reply_to_email }' "$env_file" >"$tmp_env"
  mv "$tmp_env" "$env_file"
fi

if [ -n "$ALLOWED_FORM_ORIGINS" ]; then
  tmp_env="$tmp_dir/env-with-allowed-origins.json"
  jq --arg allowed_form_origins "$ALLOWED_FORM_ORIGINS" '. + { ALLOWED_FORM_ORIGINS: $allowed_form_origins }' "$env_file" >"$tmp_env"
  mv "$tmp_env" "$env_file"
fi

if [ -n "$NEXT_PUBLIC_GA_MEASUREMENT_ID" ]; then
  tmp_env="$tmp_dir/env-with-ga.json"
  jq --arg ga_measurement_id "$NEXT_PUBLIC_GA_MEASUREMENT_ID" '. + { NEXT_PUBLIC_GA_MEASUREMENT_ID: $ga_measurement_id }' "$env_file" >"$tmp_env"
  mv "$tmp_env" "$env_file"
fi

jq -n \
  --arg contact_api_ingest_token "$CONTACT_API_INGEST_TOKEN" \
  --arg resend_api_key "$RESEND_API_KEY" \
  --arg rate_limit_storage_uri "$RATE_LIMIT_STORAGE_URI" \
  --arg contact_form_challenge_secret "$CONTACT_FORM_CHALLENGE_SECRET" \
  '{
    CONTACT_API_INGEST_TOKEN: $contact_api_ingest_token,
    RESEND_API_KEY: $resend_api_key,
    RATE_LIMIT_STORAGE_URI: $rate_limit_storage_uri,
    CONTACT_FORM_CHALLENGE_SECRET: $contact_form_challenge_secret
  }' >"$secrets_file"

./scripts/scw-secret-sync.sh \
  --region "$REGION" \
  --path-prefix "$secret_path_prefix" \
  --secrets-file "$secrets_file" \
  >/dev/null

echo "Configuring landing:${ENV} container env (${CONTAINER_ID})"
./scripts/scw-apply-container-config.sh \
  --region "$REGION" \
  --container-id "$CONTAINER_ID" \
  --env-file "$env_file" \
  --secrets-file "$secrets_file" \
  --redeploy true \
  --wait

echo "Environment configured for landing:${ENV}."
