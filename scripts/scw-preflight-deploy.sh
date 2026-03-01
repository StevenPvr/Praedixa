#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -gt 1 ]; then
  echo "Usage: $0 [staging|prod|all]" >&2
  exit 1
fi

TARGET="${1:-all}"
case "$TARGET" in
  staging | prod | all) ;;
  *)
    echo "Unsupported target: $TARGET (expected staging|prod|all)" >&2
    exit 1
    ;;
esac

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

is_target_enabled() {
  local env_name="$1"
  if [ "$TARGET" = "all" ]; then
    return 0
  fi
  [ "$TARGET" = "$env_name" ]
}

check_file_exists() {
  local file_path="$1"
  if [ -f "$file_path" ]; then
    ok "File present: $file_path"
  else
    fail "Missing file: $file_path"
  fi
}

check_namespace() {
  local namespace_name="$1"
  local status
  status="$(printf '%s' "$NAMESPACES_JSON" | jq -r --arg n "$namespace_name" '.[] | select(.name == $n) | .status' | head -n1)"
  if [ "$status" = "ready" ]; then
    ok "Namespace ${namespace_name} is ready"
  else
    fail "Namespace ${namespace_name} is not ready (current: ${status:-missing})"
  fi
}

get_container_json() {
  local container_name="$1"
  printf '%s' "$CONTAINERS_JSON" | jq -c --arg n "$container_name" '.[] | select(.name == $n)' | head -n1
}

check_container_state() {
  local container_name="$1"
  local container_json status error_message
  container_json="$(get_container_json "$container_name")"

  if [ -z "$container_json" ]; then
    fail "Container ${container_name} is missing"
    return
  fi

  status="$(printf '%s' "$container_json" | jq -r '.status')"
  error_message="$(printf '%s' "$container_json" | jq -r '.error_message // ""')"

  case "$status" in
    ready)
      ok "Container ${container_name} is ready"
      ;;
    error)
      if [ "$error_message" = "Image was not found in container registry." ]; then
        warn "Container ${container_name} has no deployed image yet (expected before first deploy)"
      elif printf '%s' "$error_message" | grep -q "Invalid Image architecture"; then
        warn "Container ${container_name} currently references a non-amd64 image; next deploy via scw scripts will rebuild"
      else
        fail "Container ${container_name} is in error: ${error_message:-unknown error}"
      fi
      ;;
    *)
      warn "Container ${container_name} status is ${status:-unknown}"
      ;;
  esac
}

container_has_env() {
  local container_json="$1"
  local key="$2"
  printf '%s' "$container_json" | jq -e --arg k "$key" '(.environment_variables // {}) | has($k)' >/dev/null
}

container_has_secret() {
  local container_json="$1"
  local key="$2"
  printf '%s' "$container_json" | jq -e --arg k "$key" '(.secret_environment_variables // [])[]? | select(.key == $k)' >/dev/null
}

check_frontend_container_env() {
  local container_name="$1"
  local container_json
  container_json="$(get_container_json "$container_name")"
  if [ -z "$container_json" ]; then
    fail "Container ${container_name} is missing"
    return
  fi

  for key in NEXT_PUBLIC_API_URL AUTH_OIDC_ISSUER_URL AUTH_OIDC_CLIENT_ID AUTH_OIDC_SCOPE; do
    if container_has_env "$container_json" "$key"; then
      ok "${container_name}: env ${key} configured"
    else
      fail "${container_name}: env ${key} missing"
    fi
  done

  if container_has_secret "$container_json" "AUTH_SESSION_SECRET"; then
    ok "${container_name}: secret AUTH_SESSION_SECRET configured"
  else
    fail "${container_name}: secret AUTH_SESSION_SECRET missing"
  fi
}

check_api_container_env() {
  local container_name="$1"
  local container_json sandbox private_network_id
  container_json="$(get_container_json "$container_name")"
  if [ -z "$container_json" ]; then
    fail "Container ${container_name} is missing"
    return
  fi

  for key in ENVIRONMENT DEBUG LOG_LEVEL KEY_PROVIDER AUTH_JWKS_URL AUTH_ISSUER_URL AUTH_AUDIENCE AUTH_ALLOWED_JWKS_HOSTS CORS_ORIGINS SCW_DEFAULT_PROJECT_ID; do
    if container_has_env "$container_json" "$key"; then
      ok "${container_name}: env ${key} configured"
    else
      fail "${container_name}: env ${key} missing"
    fi
  done

  for skey in DATABASE_URL RATE_LIMIT_STORAGE_URI CONTACT_API_INGEST_TOKEN SCW_SECRET_KEY; do
    if container_has_secret "$container_json" "$skey"; then
      ok "${container_name}: secret ${skey} configured"
    else
      fail "${container_name}: secret ${skey} missing"
    fi
  done

  sandbox="$(printf '%s' "$container_json" | jq -r '.sandbox // ""')"
  private_network_id="$(printf '%s' "$container_json" | jq -r '.private_network_id // ""')"

  if [ "$sandbox" = "v2" ]; then
    ok "${container_name}: sandbox v2"
  else
    fail "${container_name}: sandbox is ${sandbox:-missing}, expected v2"
  fi
  if [ -n "$private_network_id" ]; then
    ok "${container_name}: private network attached (${private_network_id})"
  else
    fail "${container_name}: private network is not attached"
  fi
}

check_landing_container_env() {
  local container_name="$1"
  local container_json
  container_json="$(get_container_json "$container_name")"
  if [ -z "$container_json" ]; then
    fail "Container ${container_name} is missing"
    return
  fi

  if container_has_env "$container_json" "CONTACT_API_BASE_URL"; then
    ok "${container_name}: env CONTACT_API_BASE_URL configured"
  else
    warn "${container_name}: env CONTACT_API_BASE_URL missing (contact form persistence disabled until configured)"
  fi

  if container_has_secret "$container_json" "CONTACT_API_INGEST_TOKEN"; then
    ok "${container_name}: secret CONTACT_API_INGEST_TOKEN configured"
  else
    warn "${container_name}: secret CONTACT_API_INGEST_TOKEN missing (contact form persistence disabled until configured)"
  fi

  if container_has_secret "$container_json" "RESEND_API_KEY"; then
    ok "${container_name}: secret RESEND_API_KEY configured"
  else
    warn "${container_name}: secret RESEND_API_KEY missing (email forms disabled until configured)"
  fi
}

check_rdb() {
  local db_name="$1"
  local db_status
  db_status="$(printf '%s' "$RDB_JSON" | jq -r --arg n "$db_name" '.[] | select(.name == $n) | .status' | head -n1)"
  if [ "$db_status" = "ready" ]; then
    ok "RDB ${db_name} is ready"
  else
    fail "RDB ${db_name} is not ready (current: ${db_status:-missing})"
  fi
}

check_redis() {
  local redis_name="$1"
  local redis_status
  redis_status="$(printf '%s' "$REDIS_JSON" | jq -r --arg n "$redis_name" '.[] | select(.name == $n) | .status' | head -n1)"
  if [ "$redis_status" = "ready" ]; then
    ok "Redis ${redis_name} is ready"
  else
    fail "Redis ${redis_name} is not ready (current: ${redis_status:-missing})"
  fi
}

check_bucket() {
  local bucket_name="$1"
  if printf '%s' "$BUCKETS_JSON" | jq -e --arg b "$bucket_name" '.[] | select(.Name == $b)' >/dev/null; then
    ok "Bucket ${bucket_name} exists"
  else
    fail "Bucket ${bucket_name} is missing"
  fi
}

check_domain_binding() {
  local hostname="$1"
  local mode="$2"
  local domain_json status

  domain_json="$(printf '%s' "$DOMAINS_JSON" | jq -c --arg h "$hostname" '.[] | select(.hostname == $h)' | head -n1)"

  if [ -z "$domain_json" ]; then
    if [ "$mode" = "strict" ]; then
      fail "Container domain ${hostname} is missing"
    else
      warn "Container domain ${hostname} is missing"
    fi
    return
  fi

  status="$(printf '%s' "$domain_json" | jq -r '.status // ""')"

  if [ "$status" = "ready" ]; then
    ok "Container domain ${hostname} is ready"
  elif [ "$mode" = "strict" ]; then
    fail "Container domain ${hostname} is not ready (current: ${status:-missing})"
  else
    warn "Container domain ${hostname} is not ready yet (current: ${status:-missing})"
  fi
}

check_scaleway_dns_record() {
  local record_name="$1"
  local label="$2"
  if printf '%s' "$DNS_RECORDS_JSON" | jq -e --arg n "$record_name" '.[] | select(.name == $n and (.type == "CNAME" or .type == "ALIAS" or .type == "A" or .type == "AAAA"))' >/dev/null; then
    ok "Scaleway DNS record exists for ${label}"
  else
    fail "Missing Scaleway DNS record for ${label}"
  fi
}

check_public_host() {
  local host="$1"
  local mode="$2"

  if command -v dig >/dev/null 2>&1; then
    if dig +short "$host" | grep -q '[^[:space:]]'; then
      ok "${host} resolves on public DNS"
    else
      if [ "$mode" = "strict" ]; then
        fail "${host} does not resolve on public DNS"
      else
        warn "${host} does not resolve on public DNS yet"
      fi
    fi
  elif command -v nslookup >/dev/null 2>&1; then
    if nslookup "$host" >/dev/null 2>&1; then
      ok "${host} resolves on public DNS"
    else
      if [ "$mode" = "strict" ]; then
        fail "${host} does not resolve on public DNS"
      else
        warn "${host} does not resolve on public DNS yet"
      fi
    fi
  fi
}

require_cmd scw
require_cmd jq

check_file_exists "app-landing/Dockerfile.scaleway"
check_file_exists "app-webapp/Dockerfile.scaleway"
check_file_exists "app-admin/Dockerfile.scaleway"
check_file_exists "app-api-ts/Dockerfile"
check_file_exists "scripts/scw-deploy-landing.sh"
check_file_exists "scripts/scw-deploy-frontend.sh"
check_file_exists "scripts/scw-deploy-api.sh"

ZONES_JSON="$(scw dns zone list -o json)"
DNS_RECORDS_JSON="$(scw dns record list dns-zone="$DNS_ZONE" -o json)"
NAMESPACES_JSON="$(scw container namespace list region="$REGION" -o json)"
CONTAINERS_JSON="$(scw container container list region="$REGION" -o json)"
DOMAINS_JSON="$(scw container domain list region="$REGION" -o json)"
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

check_namespace "auth-prod"

if is_target_enabled "staging"; then
  check_namespace "landing-staging"
  check_namespace "webapp-staging"
  check_namespace "admin-staging"
  check_namespace "api-staging"
fi

if is_target_enabled "prod"; then
  check_namespace "landing-prod"
  check_namespace "webapp-prod"
  check_namespace "admin-prod"
  check_namespace "api-prod"
fi

check_container_state "auth-prod"

if is_target_enabled "staging"; then
  check_container_state "landing-staging"
  check_container_state "webapp-staging"
  check_container_state "admin-staging"
  check_container_state "api-staging"
fi

if is_target_enabled "prod"; then
  check_container_state "landing-web"
  check_container_state "webapp-prod"
  check_container_state "admin-prod"
  check_container_state "api-prod"
fi

if is_target_enabled "staging"; then
  check_landing_container_env "landing-staging"
  check_frontend_container_env "webapp-staging"
  check_frontend_container_env "admin-staging"
  check_api_container_env "api-staging"
fi

if is_target_enabled "prod"; then
  check_landing_container_env "landing-web"
  check_frontend_container_env "webapp-prod"
  check_frontend_container_env "admin-prod"
  check_api_container_env "api-prod"
fi

check_rdb "praedixa-api-staging"
check_rdb "praedixa-api-prod"

check_redis "praedixa-rl-staging"
check_redis "praedixa-rl-prod"

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
  check_bucket "$bucket"
done

check_domain_binding "auth.praedixa.com" "strict"

if is_target_enabled "staging"; then
  check_domain_binding "staging-app.praedixa.com" "soft"
  check_domain_binding "staging-admin.praedixa.com" "soft"
  check_domain_binding "staging-api.praedixa.com" "soft"
fi

if is_target_enabled "prod"; then
  check_domain_binding "app.praedixa.com" "soft"
  check_domain_binding "admin.praedixa.com" "soft"
  check_domain_binding "api.praedixa.com" "soft"
  check_domain_binding "praedixa.com" "soft"
  check_domain_binding "www.praedixa.com" "soft"
fi

check_scaleway_dns_record "auth" "auth.praedixa.com"

if is_target_enabled "staging"; then
  check_scaleway_dns_record "staging-app" "staging-app.praedixa.com"
  check_scaleway_dns_record "staging-admin" "staging-admin.praedixa.com"
  check_scaleway_dns_record "staging-api" "staging-api.praedixa.com"
fi

if is_target_enabled "prod"; then
  check_scaleway_dns_record "app" "app.praedixa.com"
  check_scaleway_dns_record "admin" "admin.praedixa.com"
  check_scaleway_dns_record "api" "api.praedixa.com"
  check_scaleway_dns_record "" "praedixa.com"
  check_scaleway_dns_record "www" "www.praedixa.com"
fi

check_public_host "auth.praedixa.com" "strict"

if is_target_enabled "staging"; then
  check_public_host "staging-app.praedixa.com" "soft"
  check_public_host "staging-admin.praedixa.com" "soft"
  check_public_host "staging-api.praedixa.com" "soft"
fi

if is_target_enabled "prod"; then
  check_public_host "app.praedixa.com" "soft"
  check_public_host "admin.praedixa.com" "soft"
  check_public_host "api.praedixa.com" "soft"
  check_public_host "praedixa.com" "soft"
  check_public_host "www.praedixa.com" "soft"
fi

if [ "$FAIL_COUNT" -gt 0 ]; then
  echo ""
  echo "Scaleway deploy preflight (${TARGET}) failed with ${FAIL_COUNT} error(s) and ${WARN_COUNT} warning(s)." >&2
  echo "No deployment executed."
  exit 1
fi

echo ""
echo "Scaleway deploy preflight (${TARGET}) passed with ${WARN_COUNT} warning(s)."
echo "No deployment executed."
echo "Next step when ready:"
if is_target_enabled "staging"; then
  echo "  pnpm run scw:deploy:landing:staging"
  echo "  pnpm run scw:deploy:api:staging"
  echo "  pnpm run scw:deploy:webapp:staging"
  echo "  pnpm run scw:deploy:admin:staging"
fi
if is_target_enabled "prod"; then
  echo "  pnpm run scw:deploy:landing:prod"
  echo "  pnpm run scw:deploy:api:prod"
  echo "  pnpm run scw:deploy:webapp:prod"
  echo "  pnpm run scw:deploy:admin:prod"
fi
