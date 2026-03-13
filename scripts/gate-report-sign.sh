#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source "$ROOT_DIR/scripts/lib/hmac.sh"

UNSIGNED_PATH=""
OUTPUT_PATH=""
KEY_PATH="${ROOT_DIR}/.git/gate-signing.key"

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
      echo "[gate-sign] Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "$UNSIGNED_PATH" || -z "$OUTPUT_PATH" ]]; then
  echo "[gate-sign] Usage: $0 --unsigned <path> --output <path> [--key-file <path>]" >&2
  exit 2
fi

if [[ ! -f "$UNSIGNED_PATH" ]]; then
  echo "[gate-sign] Missing unsigned report: $UNSIGNED_PATH" >&2
  exit 1
fi

if ! require_existing_hmac_key_file "$KEY_PATH" "gate signing key"; then
  exit 1
fi

SIGNATURE="$(compute_hmac_sha256_json_file "$KEY_PATH" "$UNSIGNED_PATH")"
TMP_OUTPUT="$(mktemp "${OUTPUT_PATH}.XXXXXX")"
cleanup() {
  rm -f "$TMP_OUTPUT"
}
trap cleanup EXIT

jq --arg signature "$SIGNATURE" '. + {signature: $signature}' "$UNSIGNED_PATH" >"$TMP_OUTPUT"
mv "$TMP_OUTPUT" "$OUTPUT_PATH"
chmod 600 "$OUTPUT_PATH"

echo "$OUTPUT_PATH"
