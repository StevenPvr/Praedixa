#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/json-log.sh"
SCRIPT_SERVICE="post-deploy-smoke"

ENVIRONMENT=""
SERVICES=""
LANDING_URL=""
AUTH_URL=""
CONNECTORS_URL=""
TIMEOUT_SECONDS="${SMOKE_TIMEOUT_SECONDS:-20}"
PASS_COUNT=0
FAIL_COUNT=0
PROD_AUTH_URL="https://auth.praedixa.com"
PROD_CONNECTORS_URL="https://connectors.praedixa.com"
LANDING_PROD_ALLOWED_HOSTS="praedixa.com,www.praedixa.com"
LOG_STARTED=0
LOG_COMPLETED=0

finish_with_log() {
  local exit_code="$1"
  trap - EXIT

  if [[ "$exit_code" -ne 0 && "$LOG_STARTED" -eq 1 && "$LOG_COMPLETED" -eq 0 ]]; then
    json_log::emit \
      error \
      post_deploy_smoke.failed \
      "Post-deploy smoke failed" \
      environment="$ENVIRONMENT" \
      services="$SERVICES" \
      pass_count="$PASS_COUNT" \
      fail_count="$FAIL_COUNT" \
      status=failed \
      exit_code="$exit_code" || true
  fi

  exit "$exit_code"
}

usage() {
  echo "Usage: $0 --env <staging|prod> [--services <comma-separated>] [--landing-url <url>] [--auth-url <url>] [--connectors-url <url>] [--timeout <seconds>]" >&2
  echo "Note: staging webapp/admin smoke requires --auth-url to validate the real OIDC login redirect." >&2
  exit 2
}

while (($# > 0)); do
  case "$1" in
    --env)
      ENVIRONMENT="${2:-}"
      shift 2
      ;;
    --services)
      SERVICES="${2:-}"
      shift 2
      ;;
    --landing-url)
      LANDING_URL="${2:-}"
      shift 2
      ;;
    --auth-url)
      AUTH_URL="${2:-}"
      shift 2
      ;;
    --connectors-url)
      CONNECTORS_URL="${2:-}"
      shift 2
      ;;
    --timeout)
      TIMEOUT_SECONDS="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      ;;
  esac
done

case "$ENVIRONMENT" in
  staging | prod) ;;
  *)
    usage
    ;;
esac

if [[ -z "$SERVICES" ]]; then
  if [[ "$ENVIRONMENT" = "staging" ]]; then
    SERVICES="api,webapp,admin"
  else
    SERVICES="api,webapp,admin,auth"
  fi
fi

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_positive_integer() {
  local value="$1"
  local label="$2"
  if ! [[ "$value" =~ ^[1-9][0-9]*$ ]]; then
    echo "Invalid value for ${label}: expected positive integer, got '${value}'" >&2
    exit 1
  fi
}

count_services() {
  printf '%s' "$1" | awk -F',' '
    {
      count = 0
      for (field_index = 1; field_index <= NF; field_index += 1) {
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", $field_index)
        if ($field_index != "") {
          count += 1
        }
      }
      print count
    }
  '
}

normalize_url() {
  python3 - "$1" <<'PY'
from urllib.parse import urlsplit, urlunsplit
import sys

parts = urlsplit(sys.argv[1])
path = parts.path or "/"
if path != "/":
    path = path.rstrip("/") or "/"
print(urlunsplit((parts.scheme, parts.netloc, path, parts.query, "")))
PY
}

url_hostname() {
  python3 - "$1" <<'PY'
from urllib.parse import urlsplit
import sys

print((urlsplit(sys.argv[1]).hostname or "").lower())
PY
}

url_path() {
  python3 - "$1" <<'PY'
from urllib.parse import urlsplit
import sys

path = urlsplit(sys.argv[1]).path or "/"
if path != "/":
    path = path.rstrip("/") or "/"
print(path)
PY
}

validate_https_url() {
  local label="$1"
  local url="$2"
  local allowed_hosts_csv="$3"
  local expected_path="$4"

  python3 - "$label" "$url" "$allowed_hosts_csv" "$expected_path" <<'PY'
from urllib.parse import urlsplit
import sys

label, url, allowed_hosts_csv, expected_path = sys.argv[1:5]
allowed_hosts = {host.strip().lower() for host in allowed_hosts_csv.split(",") if host.strip()}
parts = urlsplit(url)
host = (parts.hostname or "").lower()
path = parts.path or "/"
if path != "/":
    path = path.rstrip("/") or "/"

if parts.scheme != "https":
    raise SystemExit(f"{label}: only https URLs are allowed (got {parts.scheme or 'missing'})")
if not host:
    raise SystemExit(f"{label}: hostname is required")
if parts.username or parts.password:
    raise SystemExit(f"{label}: userinfo is not allowed")
if parts.port not in (None, 443):
    raise SystemExit(f"{label}: explicit port is not allowed (got {parts.port})")
if parts.query or parts.fragment:
    raise SystemExit(f"{label}: query strings and fragments are not allowed in smoke targets")
if allowed_hosts and host not in allowed_hosts:
    allowed_display = ", ".join(sorted(allowed_hosts))
    raise SystemExit(f"{label}: host {host} is not in allowlist [{allowed_display}]")
if expected_path and path != expected_path:
    raise SystemExit(f"{label}: expected path {expected_path}, got {path}")
PY
}

request_status_and_effective_url() {
  local url="$1"
  curl \
    -sS \
    -L \
    --proto '=https' \
    --proto-redir '=https' \
    --max-time "$TIMEOUT_SECONDS" \
    -o /dev/null \
    -w "%{http_code}\t%{url_effective}" \
    "$url"
}

request_snapshot() {
  local url="$1"
  local headers_path="$2"
  local body_path="$3"
  shift 3

  curl \
    -sS \
    --proto '=https' \
    --proto-redir '=https' \
    --max-time "$TIMEOUT_SECONDS" \
    -D "$headers_path" \
    -o "$body_path" \
    -w "%{http_code}\t%{url_effective}" \
    "$@" \
    "$url"
}

resolve_service_url() {
  local service="$1"
  case "${ENVIRONMENT}:${service}" in
    staging:api)
      echo "https://staging-api.praedixa.com"
      ;;
    prod:api)
      echo "https://api.praedixa.com"
      ;;
    staging:webapp)
      echo "https://staging-app.praedixa.com"
      ;;
    prod:webapp)
      echo "https://app.praedixa.com"
      ;;
    staging:admin)
      echo "https://staging-admin.praedixa.com"
      ;;
    prod:admin)
      echo "https://admin.praedixa.com"
      ;;
    staging:auth)
      if [[ -z "$AUTH_URL" ]]; then
        echo "Staging auth smoke requires --auth-url with the explicit staging auth origin." >&2
        exit 1
      fi
      if [[ "$(url_hostname "$AUTH_URL")" = "$(url_hostname "$PROD_AUTH_URL")" ]]; then
        echo "Staging auth smoke refuses the production auth host; pass a staging-only auth URL." >&2
        exit 1
      fi
      echo "$AUTH_URL"
      ;;
    prod:auth)
      if [[ -n "$AUTH_URL" ]] && [[ "$(normalize_url "$AUTH_URL")" != "$(normalize_url "$PROD_AUTH_URL")" ]]; then
        echo "Production auth smoke only accepts ${PROD_AUTH_URL}." >&2
        exit 1
      fi
      echo "$PROD_AUTH_URL"
      ;;
    staging:landing)
      if [[ -z "$LANDING_URL" ]]; then
        echo "Landing staging requires --landing-url because no canonical public URL is versioned yet." >&2
        exit 1
      fi
      echo "$LANDING_URL"
      ;;
    prod:landing)
      if [[ -n "$LANDING_URL" ]]; then
        echo "$LANDING_URL"
      else
        echo "https://praedixa.com"
      fi
      ;;
    staging:connectors)
      if [[ -z "$CONNECTORS_URL" ]]; then
        echo "Staging connectors smoke requires --connectors-url with the explicit staging connectors origin." >&2
        exit 1
      fi
      if [[ "$(url_hostname "$CONNECTORS_URL")" = "$(url_hostname "$PROD_CONNECTORS_URL")" ]]; then
        echo "Staging connectors smoke refuses the production connectors host; pass a staging-only connectors URL." >&2
        exit 1
      fi
      echo "$CONNECTORS_URL"
      ;;
    prod:connectors)
      if [[ -n "$CONNECTORS_URL" ]] && [[ "$(normalize_url "$CONNECTORS_URL")" != "$(normalize_url "$PROD_CONNECTORS_URL")" ]]; then
        echo "Production connectors smoke only accepts ${PROD_CONNECTORS_URL}." >&2
        exit 1
      fi
      echo "$PROD_CONNECTORS_URL"
      ;;
    *)
      echo "Unsupported service for smoke: $service" >&2
      exit 1
      ;;
  esac
}

resolve_allowed_hosts() {
  local service="$1"
  local base_url="$2"
  case "${ENVIRONMENT}:${service}" in
    prod:landing)
      echo "$LANDING_PROD_ALLOWED_HOSTS"
      ;;
    *)
      url_hostname "$base_url"
      ;;
  esac
}

resolve_frontend_auth_url() {
  resolve_service_url auth
}

resolve_expected_path() {
  local service="$1"
  case "$service" in
    webapp | admin)
      echo "/login"
      ;;
    auth)
      echo "/realms/praedixa/.well-known/openid-configuration"
      ;;
    connectors)
      echo "/health"
      ;;
    landing)
      echo "/fr"
      ;;
    *)
      echo "/"
      ;;
  esac
}

response_header_first_value() {
  local headers_path="$1"
  local header_name="$2"

  awk -v key="$(printf '%s' "$header_name" | tr '[:upper:]' '[:lower:]')" '
    BEGIN { IGNORECASE = 1 }
    tolower($0) ~ "^" key ":" {
      sub(/^[^:]+:[[:space:]]*/, "", $0)
      sub(/\r$/, "", $0)
      print
      exit
    }
  ' "$headers_path"
}

response_header_count() {
  local headers_path="$1"
  local header_name="$2"

  awk -v key="$(printf '%s' "$header_name" | tr '[:upper:]' '[:lower:]')" '
    BEGIN { IGNORECASE = 1 }
    tolower($0) ~ "^" key ":" { count += 1 }
    END { print count + 0 }
  ' "$headers_path"
}

response_header_includes() {
  local headers_path="$1"
  local header_name="$2"
  local expected_token="$3"
  local value

  value="$(response_header_first_value "$headers_path" "$header_name")"
  [[ -n "$value" ]] || return 1
  printf '%s' "$value" | tr '[:upper:]' '[:lower:]' | grep -Fq -- "$(printf '%s' "$expected_token" | tr '[:upper:]' '[:lower:]')"
}

response_json_error() {
  local body_path="$1"
  jq -r '.error // empty' "$body_path" 2>/dev/null
}

validate_frontend_login_redirect() {
  local label="$1"
  local redirect_url="$2"
  local expected_auth_host="$3"
  local expected_callback_url="$4"

  python3 - "$label" "$redirect_url" "$expected_auth_host" "$expected_callback_url" <<'PY'
from urllib.parse import parse_qs, urlsplit
import sys

label, redirect_url, expected_auth_host, expected_callback_url = sys.argv[1:5]
parts = urlsplit(redirect_url)
host = (parts.hostname or "").lower()
query = parse_qs(parts.query, keep_blank_values=True)

if parts.scheme != "https":
    raise SystemExit(f"{label}: login redirect must stay on https")
if not host:
    raise SystemExit(f"{label}: login redirect host is missing")
if host != expected_auth_host.lower():
    raise SystemExit(
        f"{label}: login redirect host {host} does not match expected auth host {expected_auth_host.lower()}"
    )
if parts.username or parts.password:
    raise SystemExit(f"{label}: login redirect must not include userinfo")
if parts.fragment:
    raise SystemExit(f"{label}: login redirect must not include a fragment")

def first(name: str) -> str:
    values = query.get(name, [])
    return values[0] if values else ""

required_non_empty = ["client_id", "scope", "state", "code_challenge"]
missing = [name for name in required_non_empty if not first(name)]
if missing:
    raise SystemExit(f"{label}: login redirect is missing query params {', '.join(missing)}")

if first("response_type") != "code":
    raise SystemExit(f"{label}: login redirect response_type must be code")
if first("code_challenge_method") != "S256":
    raise SystemExit(f"{label}: login redirect code_challenge_method must be S256")
if first("redirect_uri") != expected_callback_url:
    raise SystemExit(
        f"{label}: login redirect redirect_uri must be {expected_callback_url}, got {first('redirect_uri') or 'missing'}"
    )
PY
}

record_pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
}

record_fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

run_http_check() {
  local service="$1"
  local label="$2"
  local expected_status="$3"
  local url="$4"
  local allowed_hosts="$5"
  local expected_path="$6"
  local response actual_status effective_url target_path

  printf "  %-34s" "$label"

  target_path="$(url_path "$url")"

  if ! validate_https_url "$label target" "$url" "$allowed_hosts" "$target_path"; then
    json_log::emit \
      error \
      post_deploy_smoke.http_check.failed \
      "HTTP smoke check failed before request" \
      smoke_service="$service" \
      check_label="$label" \
      target_url="$url" \
      expected_status="$expected_status" \
      status=failed \
      reason=invalid_target
    echo "FAIL"
    record_fail
    return
  fi

  if ! response="$(request_status_and_effective_url "$url")"; then
    json_log::emit \
      error \
      post_deploy_smoke.http_check.failed \
      "HTTP smoke check request failed" \
      smoke_service="$service" \
      check_label="$label" \
      target_url="$url" \
      expected_status="$expected_status" \
      status=failed \
      reason=request_error
    echo "FAIL (request error)"
    record_fail
    return
  fi

  IFS=$'\t' read -r actual_status effective_url <<<"$response"

  if [[ "$actual_status" != "$expected_status" ]]; then
    json_log::emit \
      error \
      post_deploy_smoke.http_check.failed \
      "HTTP smoke check returned an unexpected status" \
      smoke_service="$service" \
      check_label="$label" \
      target_url="$url" \
      effective_url="$effective_url" \
      expected_status="$expected_status" \
      actual_status="$actual_status" \
      status=failed \
      reason=unexpected_status
    echo "FAIL (expected $expected_status, got $actual_status)"
    record_fail
    return
  fi

  if ! validate_https_url "$label effective URL" "$effective_url" "$allowed_hosts" "$expected_path"; then
    json_log::emit \
      error \
      post_deploy_smoke.http_check.failed \
      "HTTP smoke check redirected outside the allowed target" \
      smoke_service="$service" \
      check_label="$label" \
      target_url="$url" \
      effective_url="$effective_url" \
      expected_status="$expected_status" \
      actual_status="$actual_status" \
      status=failed \
      reason=invalid_effective_url
    echo "FAIL"
    record_fail
    return
  fi

  json_log::emit \
    info \
    post_deploy_smoke.http_check.completed \
    "HTTP smoke check passed" \
    smoke_service="$service" \
    check_label="$label" \
    target_url="$url" \
    effective_url="$(normalize_url "$effective_url")" \
    expected_status="$expected_status" \
    actual_status="$actual_status" \
    status=completed
  echo "OK (HTTP $actual_status -> $(normalize_url "$effective_url"))"
  record_pass
}

run_command_check() {
  local service="$1"
  local label="$2"
  shift
  shift

  echo "  ${label}"
  if "$@"; then
    json_log::emit \
      info \
      post_deploy_smoke.command_check.completed \
      "Command smoke check passed" \
      smoke_service="$service" \
      check_label="$label" \
      status=completed
    record_pass
  else
    json_log::emit \
      error \
      post_deploy_smoke.command_check.failed \
      "Command smoke check failed" \
      smoke_service="$service" \
      check_label="$label" \
      status=failed
    record_fail
  fi
}

run_frontend_login_redirect_check() {
  local service="$1"
  local base_url="$2"
  local auth_url="$3"
  local label="GET ${service} /auth/login"
  local login_url="${base_url%/}/auth/login?next=/dashboard"
  local expected_auth_host expected_callback_url temp_dir headers_path body_path response actual_status effective_url location set_cookie_count

  printf "  %-34s" "$label"

  expected_auth_host="$(url_hostname "$auth_url")"
  expected_callback_url="${base_url%/}/auth/callback"
  temp_dir="$(mktemp -d)"
  headers_path="$temp_dir/headers.txt"
  body_path="$temp_dir/body.txt"

  if ! response="$(request_snapshot "$login_url" "$headers_path" "$body_path")"; then
    rm -rf "$temp_dir"
    json_log::emit \
      error \
      post_deploy_smoke.frontend_login.failed \
      "Frontend login smoke request failed" \
      smoke_service="$service" \
      check_label="$label" \
      target_url="$login_url" \
      status=failed \
      reason=request_error
    echo "FAIL (request error)"
    record_fail
    return
  fi

  IFS=$'\t' read -r actual_status effective_url <<<"$response"
  location="$(response_header_first_value "$headers_path" "location")"
  set_cookie_count="$(response_header_count "$headers_path" "set-cookie")"

  if [[ "$actual_status" != "307" ]]; then
    rm -rf "$temp_dir"
    json_log::emit \
      error \
      post_deploy_smoke.frontend_login.failed \
      "Frontend login smoke returned an unexpected status" \
      smoke_service="$service" \
      check_label="$label" \
      target_url="$login_url" \
      actual_status="$actual_status" \
      expected_status=307 \
      effective_url="$effective_url" \
      status=failed \
      reason=unexpected_status
    echo "FAIL (expected 307, got $actual_status)"
    record_fail
    return
  fi

  if [[ "$(url_hostname "$effective_url")" != "$(url_hostname "$base_url")" ]] || [[ "$(url_path "$effective_url")" != "/auth/login" ]]; then
    rm -rf "$temp_dir"
    json_log::emit \
      error \
      post_deploy_smoke.frontend_login.failed \
      "Frontend login smoke ended on an unexpected route" \
      smoke_service="$service" \
      check_label="$label" \
      target_url="$login_url" \
      effective_url="$effective_url" \
      status=failed \
      reason=unexpected_effective_url
    echo "FAIL"
    record_fail
    return
  fi

  if [[ -z "$location" ]] || ! validate_frontend_login_redirect "$label" "$location" "$expected_auth_host" "$expected_callback_url"; then
    rm -rf "$temp_dir"
    json_log::emit \
      error \
      post_deploy_smoke.frontend_login.failed \
      "Frontend login smoke returned an invalid OIDC redirect" \
      smoke_service="$service" \
      check_label="$label" \
      target_url="$login_url" \
      effective_url="$effective_url" \
      location="${location:-}" \
      expected_auth_host="$expected_auth_host" \
      expected_callback_url="$expected_callback_url" \
      status=failed \
      reason=invalid_redirect
    echo "FAIL"
    record_fail
    return
  fi

  if ! response_header_includes "$headers_path" "cache-control" "no-store"; then
    rm -rf "$temp_dir"
    json_log::emit \
      error \
      post_deploy_smoke.frontend_login.failed \
      "Frontend login smoke is missing no-store headers" \
      smoke_service="$service" \
      check_label="$label" \
      target_url="$login_url" \
      status=failed \
      reason=missing_no_store
    echo "FAIL"
    record_fail
    return
  fi

  if (( set_cookie_count < 3 )); then
    rm -rf "$temp_dir"
    json_log::emit \
      error \
      post_deploy_smoke.frontend_login.failed \
      "Frontend login smoke did not issue the expected OIDC bootstrap cookies" \
      smoke_service="$service" \
      check_label="$label" \
      target_url="$login_url" \
      set_cookie_count="$set_cookie_count" \
      status=failed \
      reason=missing_oidc_bootstrap_cookies
    echo "FAIL"
    record_fail
    return
  fi

  rm -rf "$temp_dir"
  json_log::emit \
    info \
    post_deploy_smoke.frontend_login.completed \
    "Frontend login smoke passed" \
    smoke_service="$service" \
    check_label="$label" \
    target_url="$login_url" \
    effective_url="$effective_url" \
    location="$location" \
    status=completed
  echo "OK (OIDC redirect -> $expected_auth_host)"
  record_pass
}

run_frontend_session_check() {
  local service="$1"
  local base_url="$2"
  local request_origin="$3"
  local fetch_site="$4"
  local expected_status="$5"
  local expected_error="$6"
  local label="$7"
  local session_url="${base_url%/}/auth/session"
  local temp_dir headers_path body_path response actual_status effective_url actual_error

  printf "  %-34s" "$label"

  temp_dir="$(mktemp -d)"
  headers_path="$temp_dir/headers.txt"
  body_path="$temp_dir/body.txt"

  if ! response="$(
    request_snapshot \
      "$session_url" \
      "$headers_path" \
      "$body_path" \
      -H "Origin: ${request_origin}" \
      -H "Sec-Fetch-Site: ${fetch_site}"
  )"; then
    rm -rf "$temp_dir"
    json_log::emit \
      error \
      post_deploy_smoke.frontend_session.failed \
      "Frontend session smoke request failed" \
      smoke_service="$service" \
      check_label="$label" \
      target_url="$session_url" \
      status=failed \
      reason=request_error
    echo "FAIL (request error)"
    record_fail
    return
  fi

  IFS=$'\t' read -r actual_status effective_url <<<"$response"
  actual_error="$(response_json_error "$body_path")"

  if [[ "$actual_status" != "$expected_status" ]]; then
    rm -rf "$temp_dir"
    json_log::emit \
      error \
      post_deploy_smoke.frontend_session.failed \
      "Frontend session smoke returned an unexpected status" \
      smoke_service="$service" \
      check_label="$label" \
      target_url="$session_url" \
      effective_url="$effective_url" \
      expected_status="$expected_status" \
      actual_status="$actual_status" \
      status=failed \
      reason=unexpected_status
    echo "FAIL (expected $expected_status, got $actual_status)"
    record_fail
    return
  fi

  if ! validate_https_url "$label effective URL" "$effective_url" "$(url_hostname "$base_url")" "/auth/session"; then
    rm -rf "$temp_dir"
    json_log::emit \
      error \
      post_deploy_smoke.frontend_session.failed \
      "Frontend session smoke redirected outside the expected route" \
      smoke_service="$service" \
      check_label="$label" \
      target_url="$session_url" \
      effective_url="$effective_url" \
      status=failed \
      reason=invalid_effective_url
    echo "FAIL"
    record_fail
    return
  fi

  if ! response_header_includes "$headers_path" "cache-control" "no-store"; then
    rm -rf "$temp_dir"
    json_log::emit \
      error \
      post_deploy_smoke.frontend_session.failed \
      "Frontend session smoke is missing no-store headers" \
      smoke_service="$service" \
      check_label="$label" \
      target_url="$session_url" \
      status=failed \
      reason=missing_no_store
    echo "FAIL"
    record_fail
    return
  fi

  if [[ "$actual_error" != "$expected_error" ]]; then
    rm -rf "$temp_dir"
    json_log::emit \
      error \
      post_deploy_smoke.frontend_session.failed \
      "Frontend session smoke returned an unexpected error body" \
      smoke_service="$service" \
      check_label="$label" \
      target_url="$session_url" \
      expected_error="$expected_error" \
      actual_error="${actual_error:-}" \
      status=failed \
      reason=unexpected_error_body
    echo "FAIL"
    record_fail
    return
  fi

  rm -rf "$temp_dir"
  json_log::emit \
    info \
    post_deploy_smoke.frontend_session.completed \
    "Frontend session smoke passed" \
    smoke_service="$service" \
    check_label="$label" \
    target_url="$session_url" \
    effective_url="$effective_url" \
    expected_status="$expected_status" \
    actual_status="$actual_status" \
    expected_error="$expected_error" \
    actual_error="$actual_error" \
    status=completed
  echo "OK (${expected_status} ${expected_error})"
  record_pass
}

run_service_smoke() {
  local service="$1"
  local base_url allowed_hosts before_fail
  base_url="$(resolve_service_url "$service")"
  before_fail="$FAIL_COUNT"

  echo "[smoke] ${service} -> ${base_url}"
  json_log::emit \
    info \
    post_deploy_smoke.service.started \
    "Running smoke for service" \
    smoke_service="$service" \
    base_url="$base_url" \
    status=started

  case "$service" in
    api)
      run_command_check \
        "$service" \
        "API baseline" \
        env API_URL="$base_url" ./scripts/smoke-test-production.sh
      ;;
    webapp | admin | auth | landing | connectors)
      allowed_hosts="$(resolve_allowed_hosts "$service" "$base_url")"
      case "$service" in
        webapp | admin)
          run_http_check \
            "$service" \
            "GET ${service} /login" \
            "200" \
            "${base_url%/}/login" \
            "$allowed_hosts" \
            "$(resolve_expected_path "$service")"
          run_frontend_login_redirect_check \
            "$service" \
            "$base_url" \
            "$(resolve_frontend_auth_url)"
          run_frontend_session_check \
            "$service" \
            "$base_url" \
            "$base_url" \
            "same-origin" \
            "401" \
            "unauthorized" \
            "GET ${service} /auth/session same-origin"
          run_frontend_session_check \
            "$service" \
            "$base_url" \
            "https://evil.example" \
            "cross-site" \
            "403" \
            "$([[ "$service" = "admin" ]] && printf 'csrf_failed' || printf 'forbidden')" \
            "GET ${service} /auth/session cross-origin"
          ;;
        auth)
          run_http_check \
            "$service" \
            "GET auth OIDC well-known" \
            "200" \
            "${base_url%/}/realms/praedixa/.well-known/openid-configuration" \
            "$allowed_hosts" \
            "$(resolve_expected_path "$service")"
          ;;
        connectors)
          run_http_check \
            "$service" \
            "GET connectors /health" \
            "200" \
            "${base_url%/}/health" \
            "$allowed_hosts" \
            "$(resolve_expected_path "$service")"
          ;;
        landing)
          run_http_check \
            "$service" \
            "GET landing /" \
            "200" \
            "${base_url%/}/" \
            "$allowed_hosts" \
            "$(resolve_expected_path "$service")"
          ;;
      esac
      ;;
    *)
      echo "Unsupported smoke service: $service" >&2
      exit 1
      ;;
  esac

  if [[ "$FAIL_COUNT" -gt "$before_fail" ]]; then
    json_log::emit \
      error \
      post_deploy_smoke.service.failed \
      "Smoke failed for service" \
      smoke_service="$service" \
      base_url="$base_url" \
      status=failed
    return
  fi

  json_log::emit \
    info \
    post_deploy_smoke.service.completed \
    "Smoke passed for service" \
    smoke_service="$service" \
    base_url="$base_url" \
    status=completed
}

require_cmd curl
require_cmd python3
require_cmd jq
require_positive_integer "$TIMEOUT_SECONDS" "SMOKE_TIMEOUT_SECONDS/--timeout"
DEPLOY_ENV="$ENVIRONMENT"
export DEPLOY_ENV
trap 'finish_with_log "$?"' EXIT

json_log::emit \
  info \
  post_deploy_smoke.started \
  "Starting post-deploy smoke" \
  environment="$ENVIRONMENT" \
  services="$SERVICES" \
  service_count="$(count_services "$SERVICES")" \
  timeout_seconds="$TIMEOUT_SECONDS" \
  status=started
LOG_STARTED=1

echo "=== Praedixa post-deploy smoke (${ENVIRONMENT}) ==="
while IFS= read -r raw_service || [[ -n "$raw_service" ]]; do
  service="$(printf '%s' "$raw_service" | tr -d '[:space:]')"
  if [[ -z "$service" ]]; then
    continue
  fi
  run_service_smoke "$service"
done < <(printf '%s' "$SERVICES" | tr ',' '\n')

echo ""
echo "=== Results: ${PASS_COUNT} passed, ${FAIL_COUNT} failed ==="

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  exit 1
fi

json_log::emit \
  info \
  post_deploy_smoke.completed \
  "Post-deploy smoke completed" \
  environment="$ENVIRONMENT" \
  services="$SERVICES" \
  pass_count="$PASS_COUNT" \
  fail_count="$FAIL_COUNT" \
  status=completed
LOG_COMPLETED=1
