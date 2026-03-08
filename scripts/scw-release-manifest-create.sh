#!/usr/bin/env bash
set -euo pipefail

REF=""
GATE_REPORT=""
OUTPUT_PATH=""
KEY_PATH="${PRAEDIXA_RELEASE_KEY_PATH:-${HOME}/.praedixa/release-manifest.key}"
declare -a IMAGE_ENTRIES=()

usage() {
  echo "Usage: $0 --ref <git-ref> --output <manifest.json> [--gate-report <path>] --image <service>=<registry-image@sha256:...> [--image ...] [--key-file <path>]" >&2
  exit 2
}

while (($# > 0)); do
  case "$1" in
    --ref)
      REF="${2:-}"
      shift 2
      ;;
    --gate-report)
      GATE_REPORT="${2:-}"
      shift 2
      ;;
    --output)
      OUTPUT_PATH="${2:-}"
      shift 2
      ;;
    --image)
      IMAGE_ENTRIES+=("${2:-}")
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

if [[ -z "$REF" || -z "$OUTPUT_PATH" || "${#IMAGE_ENTRIES[@]}" -eq 0 ]]; then
  usage
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMMIT_SHA="$(git -C "$ROOT_DIR" rev-parse "$REF")"
TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

IMAGES_JSON="{}"
for entry in "${IMAGE_ENTRIES[@]}"; do
  service="${entry%%=*}"
  registry_image="${entry#*=}"
  if [[ -z "$service" || -z "$registry_image" || "$registry_image" != *@sha256:* ]]; then
    echo "Invalid --image entry: $entry" >&2
    exit 1
  fi
  IMAGES_JSON="$(
    jq -n \
      --argjson base "$IMAGES_JSON" \
      --arg service "$service" \
      --arg registry_image "$registry_image" \
      '$base + { ($service): { registry_image: $registry_image } }'
  )"
done

TARGETS_JSON='{
  "staging": {
    "landing": { "region": "fr-par", "container_name": "landing-staging" },
    "webapp": { "region": "fr-par", "container_name": "webapp-staging" },
    "admin": { "region": "fr-par", "container_name": "admin-staging" },
    "api": { "region": "fr-par", "container_name": "api-staging" }
  },
  "prod": {
    "landing": { "region": "fr-par", "container_name": "landing-web" },
    "webapp": { "region": "fr-par", "container_name": "webapp-prod" },
    "admin": { "region": "fr-par", "container_name": "admin-prod" },
    "api": { "region": "fr-par", "container_name": "api-prod" },
    "auth": { "region": "fr-par", "container_name": "auth-prod" }
  }
}'

UNSIGNED_PATH="$TMP_DIR/release-manifest-unsigned.json"

jq -n \
  --arg schema_version "1" \
  --arg release_id "$(date -u +"%Y%m%dT%H%M%SZ")-${COMMIT_SHA:0:12}" \
  --arg commit_sha "$COMMIT_SHA" \
  --arg ref "$REF" \
  --arg created_at "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  --arg gate_report "$GATE_REPORT" \
  --argjson images "$IMAGES_JSON" \
  --argjson targets "$TARGETS_JSON" \
  '{
    schema_version: $schema_version,
    release_id: $release_id,
    commit_sha: $commit_sha,
    git_ref: $ref,
    created_at: $created_at,
    gate_report: ($gate_report | if . == "" then null else . end),
    images: $images,
    targets: $targets
  }' >"$UNSIGNED_PATH"

./scripts/release-manifest-sign.sh \
  --unsigned "$UNSIGNED_PATH" \
  --output "$OUTPUT_PATH" \
  --key-file "$KEY_PATH" >/dev/null

echo "$OUTPUT_PATH"
