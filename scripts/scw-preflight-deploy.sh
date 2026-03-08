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
AUTH_RDB_NAME="${AUTH_RDB_NAME:-praedixa-auth-prod}"

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

container_env_value() {
  local container_json="$1"
  local key="$2"
  printf '%s' "$container_json" | jq -r --arg k "$key" '(.environment_variables // {})[$k] // ""'
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

  for key in AUTH_TRUST_X_FORWARDED_FOR AUTH_RATE_LIMIT_KEY_PREFIX AUTH_RATE_LIMIT_REDIS_CONNECT_TIMEOUT_MS AUTH_RATE_LIMIT_REDIS_COMMAND_TIMEOUT_MS; do
    if container_has_env "$container_json" "$key"; then
      ok "${container_name}: env ${key} configured"
    else
      fail "${container_name}: env ${key} missing"
    fi
  done

  local trust_xff
  trust_xff="$(container_env_value "$container_json" "AUTH_TRUST_X_FORWARDED_FOR")"
  if [ "$trust_xff" = "0" ] || [ "$trust_xff" = "1" ]; then
    ok "${container_name}: AUTH_TRUST_X_FORWARDED_FOR=${trust_xff}"
  else
    fail "${container_name}: AUTH_TRUST_X_FORWARDED_FOR must be 0 or 1 (current: ${trust_xff:-missing})"
  fi

  if container_has_secret "$container_json" "AUTH_RATE_LIMIT_REDIS_URL"; then
    ok "${container_name}: secret AUTH_RATE_LIMIT_REDIS_URL configured"
  else
    fail "${container_name}: secret AUTH_RATE_LIMIT_REDIS_URL missing"
  fi

  if container_has_secret "$container_json" "AUTH_RATE_LIMIT_KEY_SALT"; then
    ok "${container_name}: secret AUTH_RATE_LIMIT_KEY_SALT configured"
  else
    warn "${container_name}: secret AUTH_RATE_LIMIT_KEY_SALT missing (fallback uses AUTH_SESSION_SECRET)"
  fi
}

check_distinct_frontend_client_ids() {
  local webapp_container="$1"
  local admin_container="$2"
  local env_label="$3"
  local webapp_json admin_json webapp_client_id admin_client_id

  webapp_json="$(get_container_json "$webapp_container")"
  admin_json="$(get_container_json "$admin_container")"

  if [ -z "$webapp_json" ] || [ -z "$admin_json" ]; then
    fail "${env_label}: cannot validate frontend OIDC client IDs (missing container metadata)"
    return
  fi

  webapp_client_id="$(container_env_value "$webapp_json" "AUTH_OIDC_CLIENT_ID")"
  admin_client_id="$(container_env_value "$admin_json" "AUTH_OIDC_CLIENT_ID")"

  if [ -z "$webapp_client_id" ]; then
    fail "${webapp_container}: AUTH_OIDC_CLIENT_ID is empty"
    return
  fi
  if [ -z "$admin_client_id" ]; then
    fail "${admin_container}: AUTH_OIDC_CLIENT_ID is empty"
    return
  fi

  if [ "$webapp_client_id" = "$admin_client_id" ]; then
    fail "${env_label}: webapp/admin share AUTH_OIDC_CLIENT_ID (${webapp_client_id}); use distinct OIDC clients to prevent cross-app session invalidation"
  else
    ok "${env_label}: distinct frontend OIDC client IDs (${webapp_client_id} vs ${admin_client_id})"
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

check_auth_container_env() {
  local container_name="$1"
  local container_json sandbox private_network_id kc_db
  container_json="$(get_container_json "$container_name")"
  if [ -z "$container_json" ]; then
    fail "Container ${container_name} is missing"
    return
  fi

  for key in KC_DB KC_DB_URL_HOST KC_DB_URL_PORT KC_DB_URL_DATABASE KC_DB_USERNAME KC_HEALTH_ENABLED KC_METRICS_ENABLED KC_LOG_LEVEL KC_PROXY_HEADERS KC_HTTP_ENABLED KC_HOSTNAME KC_BOOTSTRAP_ADMIN_USERNAME; do
    if container_has_env "$container_json" "$key"; then
      ok "${container_name}: env ${key} configured"
    else
      fail "${container_name}: env ${key} missing"
    fi
  done

  kc_db="$(container_env_value "$container_json" "KC_DB")"
  if [ "$kc_db" = "postgres" ]; then
    ok "${container_name}: KC_DB=postgres"
  else
    fail "${container_name}: KC_DB must be postgres (current: ${kc_db:-missing})"
  fi

  for skey in KC_DB_PASSWORD KC_BOOTSTRAP_ADMIN_PASSWORD; do
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
    fail "${container_name}: env CONTACT_API_BASE_URL missing"
  fi

  if container_has_secret "$container_json" "CONTACT_API_INGEST_TOKEN"; then
    ok "${container_name}: secret CONTACT_API_INGEST_TOKEN configured"
  else
    fail "${container_name}: secret CONTACT_API_INGEST_TOKEN missing"
  fi

  if container_has_secret "$container_json" "RESEND_API_KEY"; then
    ok "${container_name}: secret RESEND_API_KEY configured"
  else
    fail "${container_name}: secret RESEND_API_KEY missing"
  fi

  if container_has_secret "$container_json" "RATE_LIMIT_STORAGE_URI"; then
    ok "${container_name}: secret RATE_LIMIT_STORAGE_URI configured"
  else
    fail "${container_name}: secret RATE_LIMIT_STORAGE_URI missing"
  fi

  if container_has_secret "$container_json" "CONTACT_FORM_CHALLENGE_SECRET"; then
    ok "${container_name}: secret CONTACT_FORM_CHALLENGE_SECRET configured"
  else
    fail "${container_name}: secret CONTACT_FORM_CHALLENGE_SECRET missing"
  fi

  trust_proxy="$(container_env_value "$container_json" "LANDING_TRUST_PROXY_IP_HEADERS")"
  if [ "$trust_proxy" = "0" ] || [ "$trust_proxy" = "1" ]; then
    ok "${container_name}: LANDING_TRUST_PROXY_IP_HEADERS=${trust_proxy}"
  else
    fail "${container_name}: LANDING_TRUST_PROXY_IP_HEADERS must be 0 or 1 (current: ${trust_proxy:-missing})"
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

read_scw_json() {
  local fallback_json="$1"
  shift

  local output
  if output="$("$@" -o json 2>/dev/null)"; then
    printf '%s' "$output"
    return 0
  fi

  printf '%s' "$fallback_json"
  return 1
}

check_file_exists "app-landing/Dockerfile.scaleway"
check_file_exists "app-webapp/Dockerfile.scaleway"
check_file_exists "app-admin/Dockerfile.scaleway"
check_file_exists "app-api-ts/Dockerfile"
check_file_exists "infra/auth/Dockerfile.scaleway"
check_file_exists "scripts/scw-deploy-landing.sh"
check_file_exists "scripts/scw-deploy-frontend.sh"
check_file_exists "scripts/scw-deploy-api.sh"
check_file_exists "scripts/scw-configure-auth-env.sh"
check_file_exists "scripts/scw-configure-api-env.sh"
check_file_exists "scripts/scw-configure-frontend-env.sh"

if ! ZONES_JSON="$(read_scw_json '[]' scw dns zone list)"; then
  fail "Unable to list Scaleway DNS zones"
fi
if ! DNS_RECORDS_JSON="$(read_scw_json '[]' scw dns record list dns-zone="$DNS_ZONE")"; then
  fail "Unable to list Scaleway DNS records for zone ${DNS_ZONE}"
fi
if ! NAMESPACES_JSON="$(read_scw_json '[]' scw container namespace list region="$REGION")"; then
  fail "Unable to list Scaleway container namespaces"
fi
if ! CONTAINERS_JSON="$(read_scw_json '[]' scw container container list region="$REGION")"; then
  fail "Unable to list Scaleway containers"
fi
if ! DOMAINS_JSON="$(read_scw_json '[]' scw container domain list region="$REGION")"; then
  fail "Unable to list Scaleway container domains"
fi
if ! RDB_JSON="$(read_scw_json '[]' scw rdb instance list region="$REGION")"; then
  fail "Unable to list Scaleway RDB instances"
fi
if ! REDIS_JSON="$(read_scw_json '[]' scw redis cluster list zone="$ZONE")"; then
  fail "Unable to list Scaleway Redis clusters"
fi
if ! BUCKETS_JSON="$(read_scw_json '[]' scw object bucket list region="$REGION")"; then
  fail "Unable to list Scaleway object buckets"
fi

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
check_auth_container_env "auth-prod"

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
  check_distinct_frontend_client_ids "webapp-staging" "admin-staging" "staging"
  check_api_container_env "api-staging"
fi

if is_target_enabled "prod"; then
  check_landing_container_env "landing-web"
  check_frontend_container_env "webapp-prod"
  check_frontend_container_env "admin-prod"
  check_distinct_frontend_client_ids "webapp-prod" "admin-prod" "prod"
  check_api_container_env "api-prod"
fi

check_rdb "$AUTH_RDB_NAME"
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
  echo "  pnpm release:build -- --service landing --ref <git-ref> --tag <tag> --registry-prefix <registry>"
  echo "  pnpm release:manifest:create -- --ref <git-ref> --output <manifest> --image \"landing=<registry-image@sha256>\""
  echo "  pnpm release:deploy -- --manifest <manifest> --env staging"
  echo "  pnpm run scw:deploy:api:staging"
  echo "  pnpm run scw:deploy:webapp:staging"
  echo "  pnpm run scw:deploy:admin:staging"
fi
if is_target_enabled "prod"; then
  echo "  pnpm release:deploy -- --manifest <manifest> --env prod"
  echo "  pnpm run scw:deploy:api:prod"
  echo "  pnpm run scw:deploy:webapp:prod"
  echo "  pnpm run scw:deploy:admin:prod"
fi
