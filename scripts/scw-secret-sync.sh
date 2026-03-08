#!/usr/bin/env bash
set -euo pipefail

REGION="fr-par"
PATH_PREFIX=""
SECRETS_FILE=""
SECRET_TYPE="opaque"

usage() {
  echo "Usage: $0 --path-prefix <path> --secrets-file <json-file> [--region <region>] [--secret-type <type>]" >&2
  exit 2
}

while (($# > 0)); do
  case "$1" in
    --path-prefix)
      PATH_PREFIX="${2:-}"
      shift 2
      ;;
    --secrets-file)
      SECRETS_FILE="${2:-}"
      shift 2
      ;;
    --region)
      REGION="${2:-}"
      shift 2
      ;;
    --secret-type)
      SECRET_TYPE="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      ;;
  esac
done

if [ -z "$PATH_PREFIX" ] || [ -z "$SECRETS_FILE" ]; then
  usage
fi

if [ ! -f "$SECRETS_FILE" ]; then
  echo "Secrets file not found: $SECRETS_FILE" >&2
  exit 1
fi

command -v scw >/dev/null 2>&1 || {
  echo "Missing required command: scw" >&2
  exit 1
}
command -v jq >/dev/null 2>&1 || {
  echo "Missing required command: jq" >&2
  exit 1
}

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

normalize_path_prefix() {
  local raw="$1"
  local trimmed="${raw%/}"
  if [[ "$trimmed" != /* ]]; then
    trimmed="/${trimmed}"
  fi
  printf '%s' "$trimmed"
}

PATH_PREFIX="$(normalize_path_prefix "$PATH_PREFIX")"

find_secret_id() {
  local key="$1"
  scw secret secret list \
    region="$REGION" \
    path="$PATH_PREFIX" \
    name="$key" \
    -o json | jq -r '.[0].id // ""'
}

create_secret() {
  local key="$1"
  scw secret secret create \
    region="$REGION" \
    name="$key" \
    path="$PATH_PREFIX" \
    type="$SECRET_TYPE" \
    protected=true \
    >/dev/null
}

decode_base64() {
  local value="$1"
  if base64 --decode >/dev/null 2>&1 <<<""; then
    printf '%s' "$value" | base64 --decode
    return
  fi
  printf '%s' "$value" | base64 -D
}

jq -r 'to_entries[] | @base64' "$SECRETS_FILE" | while IFS= read -r entry; do
  if [ -z "$entry" ]; then
    continue
  fi

  decoded="$(decode_base64 "$entry")"
  key="$(printf '%s' "$decoded" | jq -r '.key')"
  value="$(printf '%s' "$decoded" | jq -r '.value')"

  if [ -z "$key" ] || [ "$key" = "null" ]; then
    echo "Encountered empty secret key in $SECRETS_FILE" >&2
    exit 1
  fi

  secret_id="$(find_secret_id "$key")"
  if [ -z "$secret_id" ]; then
    create_secret "$key"
    secret_id="$(find_secret_id "$key")"
  fi

  if [ -z "$secret_id" ]; then
    echo "Unable to resolve secret id for $PATH_PREFIX/$key" >&2
    exit 1
  fi

  secret_payload_file="${TMP_DIR}/${key}"
  printf '%s' "$value" >"$secret_payload_file"

  scw secret version create \
    "$secret_id" \
    region="$REGION" \
    data=@"$secret_payload_file" \
    disable-previous=true \
    >/dev/null

  echo "[secret-sync] updated ${PATH_PREFIX}/${key}"
done
