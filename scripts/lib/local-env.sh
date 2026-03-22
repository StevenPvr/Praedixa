#!/usr/bin/env bash
set -euo pipefail

LOCAL_ENV_LAST_FILE=""
LOCAL_ENV_LAST_VALUE=""

read_env_value_from_file() {
  local key="$1"
  local file="$2"
  local raw

  [ -f "$file" ] || return 1

  raw="$(
    awk -v key="$key" '
      $0 ~ "^[[:space:]]*(export[[:space:]]+)?" key "=" {
        sub("^[[:space:]]*(export[[:space:]]+)?" key "=", "", $0)
        print
        exit
      }
    ' "$file"
  )"

  [ -n "$raw" ] || return 1

  raw="${raw%$'\r'}"
  if [[ "$raw" =~ ^\".*\"$ ]] || [[ "$raw" =~ ^\'.*\'$ ]]; then
    raw="${raw:1:${#raw}-2}"
  fi

  printf '%s' "$raw"
}

load_env_value_from_files() {
  local key="$1"
  shift
  local file value

  LOCAL_ENV_LAST_FILE=""
  LOCAL_ENV_LAST_VALUE=""
  for file in "$@"; do
    [ -f "$file" ] || continue
    value="$(read_env_value_from_file "$key" "$file" || true)"
    if [ -z "$value" ]; then
      continue
    fi

    LOCAL_ENV_LAST_FILE="$file"
    LOCAL_ENV_LAST_VALUE="$value"
    printf '%s' "$value"
    return 0
  done

  return 1
}

default_local_env_files() {
  local repo_root="$1"

  printf '%s\n' \
    "$repo_root/app-landing/.env.local" \
    "$repo_root/app-webapp/.env.local" \
    "$repo_root/app-admin/.env.local" \
    "$repo_root/.env.local"
}

autofill_resend_api_key_from_local_env() {
  local repo_root="$1"
  shift || true
  local files=("$@")
  local display_path=""

  if [ -n "${RESEND_API_KEY:-}" ]; then
    return 0
  fi

  if [ "${#files[@]}" -eq 0 ]; then
    mapfile -t files < <(default_local_env_files "$repo_root")
  fi

  if ! load_env_value_from_files RESEND_API_KEY "${files[@]}" >/dev/null; then
    return 0
  fi

  RESEND_API_KEY="$LOCAL_ENV_LAST_VALUE"
  export RESEND_API_KEY

  display_path="$(format_local_env_display_path "$repo_root" "$LOCAL_ENV_LAST_FILE")"
  echo "[auth] Loaded RESEND_API_KEY from ${display_path}"
}

autofill_resend_from_email_from_local_env() {
  local repo_root="$1"
  shift || true
  local files=("$@")
  local display_path=""

  if [ -n "${RESEND_FROM_EMAIL:-}" ]; then
    return 0
  fi

  if [ "${#files[@]}" -eq 0 ]; then
    mapfile -t files < <(default_local_env_files "$repo_root")
  fi

  if ! load_env_value_from_files RESEND_FROM_EMAIL "${files[@]}" >/dev/null; then
    return 0
  fi

  RESEND_FROM_EMAIL="$LOCAL_ENV_LAST_VALUE"
  export RESEND_FROM_EMAIL

  display_path="$(format_local_env_display_path "$repo_root" "$LOCAL_ENV_LAST_FILE")"
  echo "[auth] Loaded RESEND_FROM_EMAIL from ${display_path}"
}

autofill_resend_reply_to_email_from_local_env() {
  local repo_root="$1"
  shift || true
  local files=("$@")
  local display_path=""

  if [ -n "${RESEND_REPLY_TO_EMAIL:-}" ]; then
    return 0
  fi

  if [ "${#files[@]}" -eq 0 ]; then
    mapfile -t files < <(default_local_env_files "$repo_root")
  fi

  if ! load_env_value_from_files RESEND_REPLY_TO_EMAIL "${files[@]}" >/dev/null; then
    return 0
  fi

  RESEND_REPLY_TO_EMAIL="$LOCAL_ENV_LAST_VALUE"
  export RESEND_REPLY_TO_EMAIL

  display_path="$(format_local_env_display_path "$repo_root" "$LOCAL_ENV_LAST_FILE")"
  echo "[auth] Loaded RESEND_REPLY_TO_EMAIL from ${display_path}"
}

reconcile_local_keycloak_smtp_runtime_from_local_env() {
  local repo_root="$1"
  shift || true
  local files=("$@")

  if [ "${#files[@]}" -eq 0 ]; then
    mapfile -t files < <(default_local_env_files "$repo_root")
  fi

  autofill_resend_api_key_from_local_env "$repo_root" "${files[@]}"
  autofill_resend_from_email_from_local_env "$repo_root" "${files[@]}"
  autofill_resend_reply_to_email_from_local_env "$repo_root" "${files[@]}"

  if [ -z "${KEYCLOAK_SMTP_PASSWORD:-}" ] && [ -n "${RESEND_API_KEY:-}" ]; then
    KEYCLOAK_SMTP_PASSWORD="${RESEND_API_KEY}"
    export KEYCLOAK_SMTP_PASSWORD
    echo "[auth] Derived KEYCLOAK_SMTP_PASSWORD from RESEND_API_KEY"
  fi

  if [ -z "${KEYCLOAK_SMTP_FROM:-}" ] && [ -n "${RESEND_FROM_EMAIL:-}" ]; then
    KEYCLOAK_SMTP_FROM="${RESEND_FROM_EMAIL}"
    export KEYCLOAK_SMTP_FROM
    echo "[auth] Derived KEYCLOAK_SMTP_FROM from RESEND_FROM_EMAIL"
  fi

  if [ -z "${KEYCLOAK_SMTP_REPLY_TO:-}" ] && [ -n "${RESEND_REPLY_TO_EMAIL:-}" ]; then
    KEYCLOAK_SMTP_REPLY_TO="${RESEND_REPLY_TO_EMAIL}"
    export KEYCLOAK_SMTP_REPLY_TO
    echo "[auth] Derived KEYCLOAK_SMTP_REPLY_TO from RESEND_REPLY_TO_EMAIL"
  fi
}

default_api_local_env_files() {
  local repo_root="$1"

  printf '%s\n' \
    "$repo_root/app-api-ts/.env.local" \
    "$repo_root/app-api/.env.local" \
    "$repo_root/app-api/.env" \
    "$repo_root/.env.local"
}

default_connectors_local_env_files() {
  local repo_root="$1"

  printf '%s\n' \
    "$repo_root/app-connectors/.env.local" \
    "$repo_root/app-api-ts/.env.local" \
    "$repo_root/app-api/.env.local" \
    "$repo_root/app-admin/.env.local" \
    "$repo_root/app-webapp/.env.local" \
    "$repo_root/.env.local"
}

autofill_resend_webhook_secret_from_local_env() {
  local repo_root="$1"
  shift || true
  local files=("$@")
  local display_path=""

  if [ -n "${RESEND_WEBHOOK_SECRET:-}" ]; then
    return 0
  fi

  if [ "${#files[@]}" -eq 0 ]; then
    mapfile -t files < <(default_api_local_env_files "$repo_root")
  fi

  if ! load_env_value_from_files RESEND_WEBHOOK_SECRET "${files[@]}" >/dev/null; then
    return 0
  fi

  RESEND_WEBHOOK_SECRET="$LOCAL_ENV_LAST_VALUE"
  export RESEND_WEBHOOK_SECRET

  display_path="$(format_local_env_display_path "$repo_root" "$LOCAL_ENV_LAST_FILE")"
  echo "[dev:api] Loaded RESEND_WEBHOOK_SECRET from ${display_path}"
}

autofill_connectors_runtime_token_from_local_env() {
  local repo_root="$1"
  shift || true
  local files=("$@")
  local display_path=""
  local default_token="local-dev-connectors-runtime-token-2026"

  if [ -n "${CONNECTORS_RUNTIME_TOKEN:-}" ]; then
    return 0
  fi

  if [ "${#files[@]}" -eq 0 ]; then
    mapfile -t files < <(default_connectors_local_env_files "$repo_root")
  fi

  if load_env_value_from_files CONNECTORS_RUNTIME_TOKEN "${files[@]}" >/dev/null; then
    CONNECTORS_RUNTIME_TOKEN="$LOCAL_ENV_LAST_VALUE"
    export CONNECTORS_RUNTIME_TOKEN
    display_path="$(format_local_env_display_path "$repo_root" "$LOCAL_ENV_LAST_FILE")"
    echo "[dev:api] Loaded CONNECTORS_RUNTIME_TOKEN from ${display_path}"
    return 0
  fi

  CONNECTORS_RUNTIME_TOKEN="${default_token}"
  export CONNECTORS_RUNTIME_TOKEN
  echo "[dev:api] Defaulted CONNECTORS_RUNTIME_TOKEN for local connectors control plane"
}

autofill_connectors_service_tokens_from_local_env() {
  local repo_root="$1"
  shift || true
  local files=("$@")
  local display_path=""

  if [ -n "${CONNECTORS_SERVICE_TOKENS:-}" ]; then
    return 0
  fi

  if [ "${#files[@]}" -eq 0 ]; then
    mapfile -t files < <(default_connectors_local_env_files "$repo_root")
  fi

  if load_env_value_from_files CONNECTORS_SERVICE_TOKENS "${files[@]}" >/dev/null; then
    CONNECTORS_SERVICE_TOKENS="$LOCAL_ENV_LAST_VALUE"
    export CONNECTORS_SERVICE_TOKENS
    display_path="$(format_local_env_display_path "$repo_root" "$LOCAL_ENV_LAST_FILE")"
    echo "[dev:connectors] Loaded CONNECTORS_SERVICE_TOKENS from ${display_path}"
    return 0
  fi

  autofill_connectors_runtime_token_from_local_env "$repo_root" "${files[@]}"

  CONNECTORS_SERVICE_TOKENS="$(cat <<EOF
[
  {
    "name": "admin-control-plane-local",
    "token": "${CONNECTORS_RUNTIME_TOKEN}",
    "allowedOrgs": ["global:all-orgs"],
    "capabilities": [
      "catalog:read",
      "connections:read",
      "connections:write",
      "oauth:write",
      "connections:test",
      "sync:read",
      "sync:write",
      "ingest_credentials:read",
      "ingest_credentials:write",
      "raw_events:read",
      "audit:read"
    ]
  }
]
EOF
)"
  export CONNECTORS_SERVICE_TOKENS
  echo "[dev:connectors] Defaulted CONNECTORS_SERVICE_TOKENS for local admin control plane"
}

default_api_auth_local_env_files() {
  local repo_root="$1"

  printf '%s\n' \
    "$repo_root/app-api-ts/.env.local" \
    "$repo_root/app-api/.env.local" \
    "$repo_root/app-admin/.env.local" \
    "$repo_root/app-webapp/.env.local" \
    "$repo_root/app-api/.env" \
    "$repo_root/.env.local"
}

default_keycloak_admin_local_env_files() {
  local repo_root="$1"

  printf '%s\n' \
    "$repo_root/app-api-ts/.env.local" \
    "$repo_root/app-api/.env.local" \
    "$repo_root/app-api/.env" \
    "$repo_root/app-landing/.env.local" \
    "$repo_root/app-webapp/.env.local" \
    "$repo_root/app-admin/.env.local" \
    "$repo_root/.env.local"
}

format_local_env_display_path() {
  local repo_root="$1"
  local path="$2"

  if [ -n "$repo_root" ] && [ "${path#"$repo_root"/}" != "$path" ]; then
    printf '%s' "${path#"$repo_root"/}"
    return 0
  fi

  printf '%s' "$path"
}

autofill_database_url_from_local_env() {
  local repo_root="$1"
  shift || true
  local files=("$@")
  local display_path=""

  if [ "${#files[@]}" -eq 0 ]; then
    mapfile -t files < <(default_api_local_env_files "$repo_root")
  fi

  if load_env_value_from_files DATABASE_URL "${files[@]}" >/dev/null; then
    DATABASE_URL="$LOCAL_ENV_LAST_VALUE"
    export DATABASE_URL

    display_path="$(format_local_env_display_path "$repo_root" "$LOCAL_ENV_LAST_FILE")"
    echo "[dev:api] Loaded DATABASE_URL from ${display_path}"
    return 0
  fi

  if [ -n "${DATABASE_URL:-}" ]; then
    return 0
  fi
}

reconcile_api_auth_runtime_from_local_env() {
  local repo_root="$1"
  shift || true
  local files=("$@")
  local file=""
  local issuer_value=""
  local issuer_source_key=""
  local issuer_display_path=""
  local audience_value=""
  local audience_display_path=""

  if [ "${#files[@]}" -eq 0 ]; then
    mapfile -t files < <(default_api_auth_local_env_files "$repo_root")
  fi

  for file in "${files[@]}"; do
    [ -f "$file" ] || continue

    issuer_value="$(read_env_value_from_file AUTH_ISSUER_URL "$file" || true)"
    if [ -n "$issuer_value" ]; then
      issuer_value="${issuer_value%/}"
      issuer_source_key="AUTH_ISSUER_URL"
      issuer_display_path="$(format_local_env_display_path "$repo_root" "$file")"
      break
    fi

    issuer_value="$(read_env_value_from_file AUTH_OIDC_ISSUER_URL "$file" || true)"
    if [ -n "$issuer_value" ]; then
      issuer_value="${issuer_value%/}"
      issuer_source_key="AUTH_OIDC_ISSUER_URL"
      issuer_display_path="$(format_local_env_display_path "$repo_root" "$file")"
      break
    fi
  done

  if [ -z "$issuer_value" ]; then
    return 0
  fi

  AUTH_ISSUER_URL="$issuer_value"
  AUTH_JWKS_URL="${issuer_value}/protocol/openid-connect/certs"
  export AUTH_ISSUER_URL AUTH_JWKS_URL

  if load_env_value_from_files AUTH_AUDIENCE "${files[@]}" >/dev/null; then
    audience_value="$LOCAL_ENV_LAST_VALUE"
    audience_display_path="$(format_local_env_display_path "$repo_root" "$LOCAL_ENV_LAST_FILE")"
  else
    audience_value="praedixa-api"
  fi

  AUTH_AUDIENCE="$audience_value"
  export AUTH_AUDIENCE

  echo "[dev:api] Loaded AUTH_ISSUER_URL from ${issuer_display_path} (${issuer_source_key})"
  echo "[dev:api] Derived AUTH_JWKS_URL from AUTH_ISSUER_URL"
  if [ -n "$audience_display_path" ]; then
    echo "[dev:api] Loaded AUTH_AUDIENCE from ${audience_display_path}"
  else
    echo "[dev:api] Defaulted AUTH_AUDIENCE to praedixa-api"
  fi
}

autofill_keycloak_admin_password_from_local_env() {
  local repo_root="$1"
  shift || true
  local files=("$@")
  local display_path=""

  if [ -n "${KEYCLOAK_ADMIN_PASSWORD:-}" ]; then
    return 0
  fi

  if [ "${#files[@]}" -eq 0 ]; then
    mapfile -t files < <(default_keycloak_admin_local_env_files "$repo_root")
  fi

  if load_env_value_from_files KEYCLOAK_ADMIN_PASSWORD "${files[@]}" >/dev/null; then
    KEYCLOAK_ADMIN_PASSWORD="$LOCAL_ENV_LAST_VALUE"
  elif load_env_value_from_files KC_BOOTSTRAP_ADMIN_PASSWORD "${files[@]}" >/dev/null; then
    KEYCLOAK_ADMIN_PASSWORD="$LOCAL_ENV_LAST_VALUE"
  else
    return 0
  fi

  export KEYCLOAK_ADMIN_PASSWORD

  display_path="$(format_local_env_display_path "$repo_root" "$LOCAL_ENV_LAST_FILE")"

  echo "[auth] Loaded KEYCLOAK_ADMIN_PASSWORD from ${display_path}"
}

autofill_keycloak_admin_username_from_local_env() {
  local repo_root="$1"
  shift || true
  local files=("$@")
  local display_path=""

  if [ -n "${KEYCLOAK_ADMIN_USERNAME:-}" ]; then
    return 0
  fi

  if [ "${#files[@]}" -eq 0 ]; then
    mapfile -t files < <(default_keycloak_admin_local_env_files "$repo_root")
  fi

  if load_env_value_from_files KEYCLOAK_ADMIN_USERNAME "${files[@]}" >/dev/null; then
    KEYCLOAK_ADMIN_USERNAME="$LOCAL_ENV_LAST_VALUE"
    export KEYCLOAK_ADMIN_USERNAME
    display_path="$(format_local_env_display_path "$repo_root" "$LOCAL_ENV_LAST_FILE")"
    echo "[auth] Loaded KEYCLOAK_ADMIN_USERNAME from ${display_path}"
    return 0
  fi

  KEYCLOAK_ADMIN_USERNAME="kcadmin"
  export KEYCLOAK_ADMIN_USERNAME
  echo "[auth] Defaulted KEYCLOAK_ADMIN_USERNAME to kcadmin"
}
