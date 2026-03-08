#!/usr/bin/env bash
set -euo pipefail

UNSIGNED_PATH=""
OUTPUT_PATH=""
KEY_PATH="${PRAEDIXA_RELEASE_KEY_PATH:-${HOME}/.praedixa/release-manifest.key}"

usage() {
  echo "Usage: $0 --unsigned <path> --output <path> [--key-file <path>]" >&2
  exit 2
}

while (($# > 0)); do
  case "$1" in
    --unsigned)
      UNSIGNED_PATH="${2:-}"
      shift 2
      ;;
    --output)
      OUTPUT_PATH="${2:-}"
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

if [[ -z "$UNSIGNED_PATH" || -z "$OUTPUT_PATH" ]]; then
  usage
fi

if [[ ! -f "$UNSIGNED_PATH" ]]; then
  echo "Missing unsigned manifest: $UNSIGNED_PATH" >&2
  exit 1
fi

mkdir -p "$(dirname "$KEY_PATH")"
if [[ ! -f "$KEY_PATH" ]]; then
  umask 177
  openssl rand -hex 64 >"$KEY_PATH"
fi
chmod 600 "$KEY_PATH"

KEY_CONTENT="$(cat "$KEY_PATH")"
SIGNATURE="$(openssl dgst -sha256 -hmac "$KEY_CONTENT" "$UNSIGNED_PATH" | awk '{print $2}')"

jq --arg signature "$SIGNATURE" '. + { signature: $signature }' \
  "$UNSIGNED_PATH" >"$OUTPUT_PATH"

chmod 600 "$OUTPUT_PATH"
echo "$OUTPUT_PATH"
