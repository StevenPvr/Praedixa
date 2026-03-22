#!/usr/bin/env bash
set -euo pipefail

MANIFEST_PATH=""
TARGET_ENV=""
SERVICES=""
KEY_PATH="${PRAEDIXA_RELEASE_KEY_PATH:-${HOME}/.praedixa/release-manifest.key}"

usage() {
  echo "Usage: $0 --manifest <path> --to <staging|prod> [--services <comma-separated>] [--key-file <path>]" >&2
  exit 2
}

while (($# > 0)); do
  case "$1" in
    --manifest)
      MANIFEST_PATH="${2:-}"
      shift 2
      ;;
    --to)
      TARGET_ENV="${2:-}"
      shift 2
      ;;
    --services)
      SERVICES="${2:-}"
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

if [[ -z "$MANIFEST_PATH" || -z "$TARGET_ENV" ]]; then
  usage
fi

cmd=(
  ./scripts/scw/scw-release-deploy.sh
  --manifest "$MANIFEST_PATH"
  --env "$TARGET_ENV"
  --key-file "$KEY_PATH"
)

if [[ -n "$SERVICES" ]]; then
  cmd+=(--services "$SERVICES")
fi

"${cmd[@]}"
