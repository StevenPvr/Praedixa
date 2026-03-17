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

autofill_keycloak_admin_password_from_local_env() {
  local repo_root="$1"
  shift || true
  local files=("$@")
  local display_path=""

  if [ -n "${KEYCLOAK_ADMIN_PASSWORD:-}" ]; then
    return 0
  fi

  if [ "${#files[@]}" -eq 0 ]; then
    mapfile -t files < <(default_local_env_files "$repo_root")
  fi

  if load_env_value_from_files KEYCLOAK_ADMIN_PASSWORD "${files[@]}" >/dev/null; then
    KEYCLOAK_ADMIN_PASSWORD="$LOCAL_ENV_LAST_VALUE"
  elif load_env_value_from_files KC_BOOTSTRAP_ADMIN_PASSWORD "${files[@]}" >/dev/null; then
    KEYCLOAK_ADMIN_PASSWORD="$LOCAL_ENV_LAST_VALUE"
  else
    return 0
  fi

  display_path="$LOCAL_ENV_LAST_FILE"
  if [ -n "$repo_root" ] && [ "${display_path#"$repo_root"/}" != "$display_path" ]; then
    display_path="${display_path#"$repo_root"/}"
  fi

  echo "[auth] Loaded KEYCLOAK_ADMIN_PASSWORD from ${display_path}"
}
