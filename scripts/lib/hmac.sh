#!/usr/bin/env bash
set -euo pipefail

require_existing_hmac_key_file() {
  local key_path="$1"
  local label="$2"

  if [[ -z "$key_path" || ! -f "$key_path" ]]; then
    echo "Missing ${label}: ${key_path:-<empty>}" >&2
    return 1
  fi

  chmod 600 "$key_path"
}

compute_hmac_sha256_file() {
  local key_path="$1"
  local target_path="$2"

  openssl dgst -sha256 -mac HMAC -macopt "key:file:${key_path}" "$target_path" \
    | awk '{print $2}'
}

compute_hmac_sha256_json_file() {
  local key_path="$1"
  local json_path="$2"
  local canonical_tmp

  canonical_tmp="$(mktemp)"
  jq -S . "$json_path" >"$canonical_tmp"
  compute_hmac_sha256_file "$key_path" "$canonical_tmp"
  rm -f "$canonical_tmp"
}
