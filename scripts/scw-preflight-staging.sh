#!/usr/bin/env bash
set -euo pipefail

REGION="fr-par"
ZONE="fr-par-1"
DNS_ZONE="praedixa.com"
DNS_DELEGATION_MODE="${DNS_DELEGATION_MODE:-transitional}"

FAIL_COUNT=0
WARN_COUNT=0

ok() {
  echo "[ok] $1"
}

warn() {
  WARN_COUNT=$((WARN_COUNT + 1))
  echo "[warn] $1"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  echo "[fail] $1" >&2
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_cmd scw
require_cmd jq

ZONES_JSON="$(scw dns zone list -o json)"
NAMESPACES_JSON="$(scw container namespace list region="$REGION" -o json)"
CONTAINERS_JSON="$(scw container container list region="$REGION" -o json)"
RDB_JSON="$(scw rdb instance list region="$REGION" -o json)"
REDIS_JSON="$(scw redis cluster list zone="$ZONE" -o json)"
BUCKETS_JSON="$(scw object bucket list region="$REGION" -o json)"

zone_status="$(printf '%s' "$ZONES_JSON" | jq -r --arg d "$DNS_ZONE" '.[] | select(.domain == $d and .subdomain == "") | .status' | head -n1)"
if [ "$zone_status" = "active" ]; then
  ok "DNS zone ${DNS_ZONE} is active"
else
  fail "DNS zone ${DNS_ZONE} is not active (current: ${zone_status:-missing})"
fi

if command -v dig >/dev/null 2>&1; then
  delegated_ns="$(dig +short NS "$DNS_ZONE" | tr '[:upper:]' '[:lower:]')"
  has_scaleway_ns="false"
  if printf '%s' "$delegated_ns" | grep -q '^ns0\.dom\.scw\.cloud\.$' \
    && printf '%s' "$delegated_ns" | grep -q '^ns1\.dom\.scw\.cloud\.$'; then
    has_scaleway_ns="true"
  fi

  if [ "$has_scaleway_ns" = "true" ]; then
    ok "Public DNS delegation points to Scaleway NS"
  elif [ "$DNS_DELEGATION_MODE" = "transitional" ]; then
    warn "Public DNS delegation is not on Scaleway NS yet (transitional mode enabled, current: $(echo "$delegated_ns" | tr '\n' ' '))"
  else
    fail "Public DNS delegation does not point to Scaleway NS (current: $(echo "$delegated_ns" | tr '\n' ' '))"
  fi
fi

for ns_name in landing-staging webapp-staging admin-staging api-staging; do
  ns_status="$(printf '%s' "$NAMESPACES_JSON" | jq -r --arg n "$ns_name" '.[] | select(.name == $n) | .status' | head -n1)"
  if [ "$ns_status" = "ready" ]; then
    ok "Namespace ${ns_name} is ready"
  else
    fail "Namespace ${ns_name} is not ready (current: ${ns_status:-missing})"
  fi
done

get_container_id() {
  local container_name="$1"
  printf '%s' "$CONTAINERS_JSON" | jq -r --arg n "$container_name" '.[] | select(.name == $n) | .id' | head -n1
}

check_frontend_container() {
  local name="$1"
  local id env_json trust_xff
  id="$(get_container_id "$name")"
  if [ -z "$id" ]; then
    fail "Container ${name} is missing"
    return
  fi
  env_json="$(scw container container get "$id" region="$REGION" -o json)"
  for key in NEXT_PUBLIC_API_URL AUTH_OIDC_ISSUER_URL AUTH_OIDC_CLIENT_ID AUTH_OIDC_SCOPE; do
    if printf '%s' "$env_json" | jq -e --arg k "$key" '.environment_variables | has($k)' >/dev/null; then
      ok "${name}: env ${key} configured"
    else
      fail "${name}: env ${key} missing"
    fi
  done
  if printf '%s' "$env_json" | jq -e '.secret_environment_variables[]? | select(.key == "AUTH_SESSION_SECRET")' >/dev/null; then
    ok "${name}: secret AUTH_SESSION_SECRET configured"
  else
    fail "${name}: secret AUTH_SESSION_SECRET missing"
  fi

  if [[ "$name" == webapp-* ]]; then
    for key in AUTH_TRUST_X_FORWARDED_FOR AUTH_RATE_LIMIT_KEY_PREFIX AUTH_RATE_LIMIT_REDIS_CONNECT_TIMEOUT_MS AUTH_RATE_LIMIT_REDIS_COMMAND_TIMEOUT_MS; do
      if printf '%s' "$env_json" | jq -e --arg k "$key" '.environment_variables | has($k)' >/dev/null; then
        ok "${name}: env ${key} configured"
      else
        fail "${name}: env ${key} missing"
      fi
    done

    trust_xff="$(printf '%s' "$env_json" | jq -r '.environment_variables.AUTH_TRUST_X_FORWARDED_FOR // ""')"
    if [ "$trust_xff" = "0" ] || [ "$trust_xff" = "1" ]; then
      ok "${name}: AUTH_TRUST_X_FORWARDED_FOR=${trust_xff}"
    else
      fail "${name}: AUTH_TRUST_X_FORWARDED_FOR must be 0 or 1 (current: ${trust_xff:-missing})"
    fi

    if printf '%s' "$env_json" | jq -e '.secret_environment_variables[]? | select(.key == "AUTH_RATE_LIMIT_REDIS_URL")' >/dev/null; then
      ok "${name}: secret AUTH_RATE_LIMIT_REDIS_URL configured"
    else
      fail "${name}: secret AUTH_RATE_LIMIT_REDIS_URL missing"
    fi

    if printf '%s' "$env_json" | jq -e '.secret_environment_variables[]? | select(.key == "AUTH_RATE_LIMIT_KEY_SALT")' >/dev/null; then
      ok "${name}: secret AUTH_RATE_LIMIT_KEY_SALT configured"
    else
      warn "${name}: secret AUTH_RATE_LIMIT_KEY_SALT missing (fallback uses AUTH_SESSION_SECRET)"
    fi
  fi
}

check_distinct_frontend_client_ids() {
  local webapp_name="$1"
  local admin_name="$2"
  local webapp_id admin_id webapp_env admin_env webapp_client_id admin_client_id

  webapp_id="$(get_container_id "$webapp_name")"
  admin_id="$(get_container_id "$admin_name")"

  if [ -z "$webapp_id" ] || [ -z "$admin_id" ]; then
    fail "staging: cannot validate frontend OIDC client IDs (missing container metadata)"
    return
  fi

  webapp_env="$(scw container container get "$webapp_id" region="$REGION" -o json)"
  admin_env="$(scw container container get "$admin_id" region="$REGION" -o json)"

  webapp_client_id="$(printf '%s' "$webapp_env" | jq -r '.environment_variables.AUTH_OIDC_CLIENT_ID // ""')"
  admin_client_id="$(printf '%s' "$admin_env" | jq -r '.environment_variables.AUTH_OIDC_CLIENT_ID // ""')"

  if [ -z "$webapp_client_id" ]; then
    fail "${webapp_name}: AUTH_OIDC_CLIENT_ID is empty"
    return
  fi
  if [ -z "$admin_client_id" ]; then
    fail "${admin_name}: AUTH_OIDC_CLIENT_ID is empty"
    return
  fi

  if [ "$webapp_client_id" = "$admin_client_id" ]; then
    fail "staging: webapp/admin share AUTH_OIDC_CLIENT_ID (${webapp_client_id}); use distinct OIDC clients to prevent cross-app session invalidation"
  else
    ok "staging: distinct frontend OIDC client IDs (${webapp_client_id} vs ${admin_client_id})"
  fi
}

check_api_container() {
  local name="$1"
  local id env_json
  id="$(get_container_id "$name")"
  if [ -z "$id" ]; then
    fail "Container ${name} is missing"
    return
  fi
  env_json="$(scw container container get "$id" region="$REGION" -o json)"

  for key in ENVIRONMENT DEBUG LOG_LEVEL KEY_PROVIDER AUTH_JWKS_URL AUTH_ISSUER_URL AUTH_AUDIENCE AUTH_ALLOWED_JWKS_HOSTS CORS_ORIGINS SCW_DEFAULT_PROJECT_ID; do
    if printf '%s' "$env_json" | jq -e --arg k "$key" '.environment_variables | has($k)' >/dev/null; then
      ok "${name}: env ${key} configured"
    else
      fail "${name}: env ${key} missing"
    fi
  done

  for skey in DATABASE_URL RATE_LIMIT_STORAGE_URI CONTACT_API_INGEST_TOKEN SCW_SECRET_KEY; do
    if printf '%s' "$env_json" | jq -e --arg k "$skey" '.secret_environment_variables[]? | select(.key == $k)' >/dev/null; then
      ok "${name}: secret ${skey} configured"
    else
      fail "${name}: secret ${skey} missing"
    fi
  done

  sandbox="$(printf '%s' "$env_json" | jq -r '.sandbox')"
  private_network_id="$(printf '%s' "$env_json" | jq -r '.private_network_id // ""')"
  if [ "$sandbox" = "v2" ]; then
    ok "${name}: sandbox v2"
  else
    fail "${name}: sandbox is ${sandbox:-missing}, expected v2"
  fi
  if [ -n "$private_network_id" ]; then
    ok "${name}: private network attached (${private_network_id})"
  else
    fail "${name}: private network is not attached"
  fi
}

check_landing_container() {
  local name="$1"
  local id env_json
  id="$(get_container_id "$name")"
  if [ -z "$id" ]; then
    fail "Container ${name} is missing"
    return
  fi
  env_json="$(scw container container get "$id" region="$REGION" -o json)"

  if printf '%s' "$env_json" | jq -e '.environment_variables | has("CONTACT_API_BASE_URL")' >/dev/null; then
    ok "${name}: env CONTACT_API_BASE_URL configured"
  else
    fail "${name}: env CONTACT_API_BASE_URL missing"
  fi

  if printf '%s' "$env_json" | jq -e '.secret_environment_variables[]? | select(.key == "CONTACT_API_INGEST_TOKEN")' >/dev/null; then
    ok "${name}: secret CONTACT_API_INGEST_TOKEN configured"
  else
    fail "${name}: secret CONTACT_API_INGEST_TOKEN missing"
  fi

  if printf '%s' "$env_json" | jq -e '.secret_environment_variables[]? | select(.key == "RESEND_API_KEY")' >/dev/null; then
    ok "${name}: secret RESEND_API_KEY configured"
  else
    fail "${name}: secret RESEND_API_KEY missing"
  fi

  if printf '%s' "$env_json" | jq -e '.secret_environment_variables[]? | select(.key == "RATE_LIMIT_STORAGE_URI")' >/dev/null; then
    ok "${name}: secret RATE_LIMIT_STORAGE_URI configured"
  else
    fail "${name}: secret RATE_LIMIT_STORAGE_URI missing"
  fi

  if printf '%s' "$env_json" | jq -e '.secret_environment_variables[]? | select(.key == "CONTACT_FORM_CHALLENGE_SECRET")' >/dev/null; then
    ok "${name}: secret CONTACT_FORM_CHALLENGE_SECRET configured"
  else
    fail "${name}: secret CONTACT_FORM_CHALLENGE_SECRET missing"
  fi

  trust_proxy="$(printf '%s' "$env_json" | jq -r '.environment_variables.LANDING_TRUST_PROXY_IP_HEADERS // ""')"
  if [ "$trust_proxy" = "0" ] || [ "$trust_proxy" = "1" ]; then
    ok "${name}: LANDING_TRUST_PROXY_IP_HEADERS=${trust_proxy}"
  else
    fail "${name}: LANDING_TRUST_PROXY_IP_HEADERS must be 0 or 1 (current: ${trust_proxy:-missing})"
  fi
}

check_landing_container "landing-staging"
check_frontend_container "webapp-staging"
check_frontend_container "admin-staging"
check_distinct_frontend_client_ids "webapp-staging" "admin-staging"
check_api_container "api-staging"

for db_name in praedixa-api-staging praedixa-api-prod; do
  db_status="$(printf '%s' "$RDB_JSON" | jq -r --arg n "$db_name" '.[] | select(.name == $n) | .status' | head -n1)"
  if [ "$db_status" = "ready" ]; then
    ok "RDB ${db_name} is ready"
  else
    fail "RDB ${db_name} is not ready (current: ${db_status:-missing})"
  fi
done

for redis_name in praedixa-rl-staging praedixa-rl-prod; do
  redis_status="$(printf '%s' "$REDIS_JSON" | jq -r --arg n "$redis_name" '.[] | select(.name == $n) | .status' | head -n1)"
  if [ "$redis_status" = "ready" ]; then
    ok "Redis ${redis_name} is ready"
  else
    fail "Redis ${redis_name} is not ready (current: ${redis_status:-missing})"
  fi
done

for bucket in \
  praedixa-stg-client-files-fr-14b3676c \
  praedixa-prd-client-files-fr-14b3676c \
  praedixa-stg-client-exports-fr-14b3676c \
  praedixa-prd-client-exports-fr-14b3676c \
  praedixa-stg-model-artifacts-fr-14b3676c \
  praedixa-prd-model-artifacts-fr-14b3676c \
  praedixa-stg-model-inference-fr-14b3676c \
  praedixa-prd-model-inference-fr-14b3676c
do
  if printf '%s' "$BUCKETS_JSON" | jq -e --arg b "$bucket" '.[] | select(.Name == $b)' >/dev/null; then
    ok "Bucket ${bucket} exists"
  else
    fail "Bucket ${bucket} is missing"
  fi
done

check_public_host() {
  local host="$1"
  local warning_message="$2"

  if command -v dig >/dev/null 2>&1; then
    resolved="$(dig +short "$host" | tr -d '[:space:]')"
    if [ -n "$resolved" ]; then
      ok "${host} resolves on public DNS"
    else
      warn "$warning_message"
    fi
  elif command -v nslookup >/dev/null 2>&1; then
    if nslookup "$host" >/dev/null 2>&1; then
      ok "${host} resolves"
    else
      warn "$warning_message"
    fi
  fi
}

check_public_host "auth.praedixa.com" "auth.praedixa.com missing on public DNS (OIDC login will fail until available)"
check_public_host "staging-app.praedixa.com" "staging-app.praedixa.com missing on public DNS (webapp staging URL will fail until available)"
check_public_host "staging-admin.praedixa.com" "staging-admin.praedixa.com missing on public DNS (admin staging URL will fail until available)"
check_public_host "staging-api.praedixa.com" "staging-api.praedixa.com missing on public DNS (API staging URL will fail until available)"

if [ "$FAIL_COUNT" -gt 0 ]; then
  echo ""
  echo "Staging preflight failed with ${FAIL_COUNT} error(s) and ${WARN_COUNT} warning(s)." >&2
  exit 1
fi

echo ""
echo "Staging preflight passed with ${WARN_COUNT} warning(s)."
echo "No deployment executed."
echo "Next step when ready:"
echo "  pnpm release:build -- --service landing --ref <git-ref> --tag <tag> --registry-prefix <registry>"
echo "  pnpm release:manifest:create -- --ref <git-ref> --output <manifest> --image \"landing=<registry-image@sha256>\""
echo "  pnpm release:deploy -- --manifest <manifest> --env staging"
echo "  pnpm run scw:deploy:api:staging"
echo "  pnpm run scw:deploy:webapp:staging"
echo "  pnpm run scw:deploy:admin:staging"
