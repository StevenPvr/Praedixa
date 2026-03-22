#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/hmac.sh"

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

if ! require_existing_hmac_key_file "$KEY_PATH" "release manifest key"; then
  exit 1
fi

SIGNATURE="$(compute_hmac_sha256_json_file "$KEY_PATH" "$UNSIGNED_PATH")"
TMP_OUTPUT="$(mktemp "${OUTPUT_PATH}.XXXXXX")"
cleanup() {
  rm -f "$TMP_OUTPUT"
}
trap cleanup EXIT

SIGNATURE="$SIGNATURE" python3 - "$UNSIGNED_PATH" "$TMP_OUTPUT" <<'PY'
import json
import os
import sys

unsigned_path, output_path = sys.argv[1:3]

with open(unsigned_path, "r", encoding="utf-8") as handle:
    payload = json.load(handle)

payload["signature"] = os.environ["SIGNATURE"]

with open(output_path, "w", encoding="utf-8") as handle:
    json.dump(payload, handle, ensure_ascii=False, indent=2)
    handle.write("\n")
PY

mv "$TMP_OUTPUT" "$OUTPUT_PATH"
chmod 600 "$OUTPUT_PATH"
echo "$OUTPUT_PATH"
