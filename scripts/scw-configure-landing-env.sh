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

CONTACT_API_BASE_URL="${CONTACT_API_BASE_URL:-}"
CONTACT_API_INGEST_TOKEN="${CONTACT_API_INGEST_TOKEN:-}"
RESEND_API_KEY="${RESEND_API_KEY:-}"
RESEND_FROM_EMAIL="${RESEND_FROM_EMAIL:-}"
RESEND_REPLY_TO_EMAIL="${RESEND_REPLY_TO_EMAIL:-}"
ALLOWED_FORM_ORIGINS="${ALLOWED_FORM_ORIGINS:-}"
NEXT_PUBLIC_GA_MEASUREMENT_ID="${NEXT_PUBLIC_GA_MEASUREMENT_ID:-}"

require_non_empty "$CONTACT_API_BASE_URL" "CONTACT_API_BASE_URL"
require_non_empty "$CONTACT_API_INGEST_TOKEN" "CONTACT_API_INGEST_TOKEN"
require_non_empty "$RESEND_API_KEY" "RESEND_API_KEY"

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
  "environment-variables.CONTACT_API_BASE_URL=$CONTACT_API_BASE_URL"
  "secret-environment-variables.0.key=CONTACT_API_INGEST_TOKEN"
  "secret-environment-variables.0.value=$CONTACT_API_INGEST_TOKEN"
  "secret-environment-variables.1.key=RESEND_API_KEY"
  "secret-environment-variables.1.value=$RESEND_API_KEY"
)

if [ -n "$RESEND_FROM_EMAIL" ]; then
  cmd+=("environment-variables.RESEND_FROM_EMAIL=$RESEND_FROM_EMAIL")
fi

if [ -n "$RESEND_REPLY_TO_EMAIL" ]; then
  cmd+=("environment-variables.RESEND_REPLY_TO_EMAIL=$RESEND_REPLY_TO_EMAIL")
fi

if [ -n "$ALLOWED_FORM_ORIGINS" ]; then
  cmd+=("environment-variables.ALLOWED_FORM_ORIGINS=$ALLOWED_FORM_ORIGINS")
fi

if [ -n "$NEXT_PUBLIC_GA_MEASUREMENT_ID" ]; then
  cmd+=(
    "environment-variables.NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID"
  )
fi

echo "Configuring landing:${ENV} container env (${CONTAINER_ID})"
"${cmd[@]}" >/dev/null
echo "Environment configured for landing:${ENV}."
