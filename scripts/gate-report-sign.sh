#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

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

mkdir -p "$(dirname "$KEY_PATH")"
if [[ ! -f "$KEY_PATH" ]]; then
  umask 177
  openssl rand -hex 64 >"$KEY_PATH"
fi
chmod 600 "$KEY_PATH"

KEY_CONTENT="$(cat "$KEY_PATH")"
SIGNATURE="$(openssl dgst -sha256 -hmac "$KEY_CONTENT" "$UNSIGNED_PATH" | awk '{print $2}')"

jq --arg signature "$SIGNATURE" '. + {signature: $signature}' "$UNSIGNED_PATH" >"$OUTPUT_PATH"
chmod 600 "$OUTPUT_PATH"

echo "$OUTPUT_PATH"
