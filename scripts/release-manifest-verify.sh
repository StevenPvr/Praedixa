#!/usr/bin/env bash
set -euo pipefail

MANIFEST_PATH=""
KEY_PATH="${PRAEDIXA_RELEASE_KEY_PATH:-${HOME}/.praedixa/release-manifest.key}"

usage() {
  echo "Usage: $0 --manifest <path> [--key-file <path>]" >&2
  exit 2
}

while (($# > 0)); do
  case "$1" in
    --manifest)
      MANIFEST_PATH="${2:-}"
      shift 2
      ;;
    --key-file)
      KEY_PATH="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      ;;
  esac
done

if [[ -z "$MANIFEST_PATH" ]]; then
  usage
fi

if [[ ! -f "$MANIFEST_PATH" ]]; then
  echo "Missing manifest: $MANIFEST_PATH" >&2
  exit 1
fi

if [[ ! -f "$KEY_PATH" ]]; then
  echo "Missing release manifest key: $KEY_PATH" >&2
  exit 1
fi

EXPECTED_SIGNATURE="$(jq -r '.signature // empty' "$MANIFEST_PATH")"
if [[ -z "$EXPECTED_SIGNATURE" ]]; then
  echo "Manifest missing signature" >&2
  exit 1
fi

UNSIGNED_TMP="$(mktemp)"
cleanup() {
  rm -f "$UNSIGNED_TMP"
}
trap cleanup EXIT

jq 'del(.signature)' "$MANIFEST_PATH" >"$UNSIGNED_TMP"

KEY_CONTENT="$(cat "$KEY_PATH")"
ACTUAL_SIGNATURE="$(openssl dgst -sha256 -hmac "$KEY_CONTENT" "$UNSIGNED_TMP" | awk '{print $2}')"

if [[ "$ACTUAL_SIGNATURE" != "$EXPECTED_SIGNATURE" ]]; then
  echo "Invalid manifest signature" >&2
  exit 1
fi

SCHEMA_VERSION="$(jq -r '.schema_version // empty' "$MANIFEST_PATH")"
if [[ "$SCHEMA_VERSION" != "1" ]]; then
  echo "Unsupported manifest schema_version: ${SCHEMA_VERSION:-<empty>}" >&2
  exit 1
fi

echo "[release-manifest] OK ($MANIFEST_PATH)"
