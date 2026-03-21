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

default_api_local_env_files() {
  local repo_root="$1"

  printf '%s\n' \
    "$repo_root/app-api-ts/.env.local" \
    "$repo_root/app-api/.env.local" \
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

  if [ -n "${DATABASE_URL:-}" ]; then
    return 0
  fi

  if [ "${#files[@]}" -eq 0 ]; then
    mapfile -t files < <(default_api_local_env_files "$repo_root")
  fi

  if ! load_env_value_from_files DATABASE_URL "${files[@]}" >/dev/null; then
    return 0
  fi

  DATABASE_URL="$LOCAL_ENV_LAST_VALUE"
  export DATABASE_URL

  display_path="$(format_local_env_display_path "$repo_root" "$LOCAL_ENV_LAST_FILE")"
  echo "[dev:api] Loaded DATABASE_URL from ${display_path}"
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
