#!/usr/bin/env bash
set -euo pipefail

MANIFEST_PATH=""
ENVIRONMENT=""
SERVICES=""
KEY_PATH="${PRAEDIXA_RELEASE_KEY_PATH:-${HOME}/.praedixa/release-manifest.key}"

usage() {
  echo "Usage: $0 --manifest <path> --env <staging|prod> [--services <comma-separated>] [--key-file <path>]" >&2
  exit 2
}

while (($# > 0)); do
  case "$1" in
    --manifest)
      MANIFEST_PATH="${2:-}"
      shift 2
      ;;
    --env)
      ENVIRONMENT="${2:-}"
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

if [[ -z "$MANIFEST_PATH" || -z "$ENVIRONMENT" ]]; then
  usage
fi

case "$ENVIRONMENT" in
  staging|prod) ;;
  *)
    echo "Unsupported environment: $ENVIRONMENT" >&2
    exit 1
    ;;
esac

command -v jq >/dev/null 2>&1 || {
  echo "Missing required command: jq" >&2
  exit 1
}
command -v scw >/dev/null 2>&1 || {
  echo "Missing required command: scw" >&2
  exit 1
}

./scripts/release-manifest-verify.sh \
  --manifest "$MANIFEST_PATH" \
  --key-file "$KEY_PATH" >/dev/null

resolve_services() {
  if [[ -n "$SERVICES" ]]; then
    printf '%s' "$SERVICES" | tr ',' '\n'
    return
  fi

  jq -r --arg env "$ENVIRONMENT" '.targets[$env] | keys[]' "$MANIFEST_PATH"
}

resolve_deploy_image() {
  local registry_image="$1"
  printf '%s' "${registry_image%%@sha256:*}"
}

while IFS= read -r service || [[ -n "$service" ]]; do
  if [[ -z "$service" ]]; then
    continue
  fi

  registry_image="$(jq -r --arg service "$service" '.images[$service].registry_image // ""' "$MANIFEST_PATH")"
  container_name="$(jq -r --arg env "$ENVIRONMENT" --arg service "$service" '.targets[$env][$service].container_name // ""' "$MANIFEST_PATH")"
  region="$(jq -r --arg env "$ENVIRONMENT" --arg service "$service" '.targets[$env][$service].region // "fr-par"' "$MANIFEST_PATH")"

  if [[ -z "$registry_image" || -z "$container_name" ]]; then
    echo "Manifest is missing deploy metadata for service=${service} env=${ENVIRONMENT}" >&2
    exit 1
  fi

  deploy_image="$(resolve_deploy_image "$registry_image")"

  container_id="$(
    scw container container list region="$region" -o json |
      jq -r --arg n "$container_name" '.[] | select(.name == $n) | .id' |
      head -n1
  )"

  if [[ -z "$container_id" ]]; then
    echo "Container not found for ${service} (${container_name})" >&2
    exit 1
  fi

  echo "[release-deploy] ${service} -> ${container_name} (${deploy_image})"
  update_output="$(
    scw container container update \
    "$container_id" \
    region="$region" \
    registry-image="$deploy_image" \
    redeploy=true \
    -w \
    -o json
  )"

  if ! printf '%s' "$update_output" | jq -e '(.error? // null) == null' >/dev/null; then
    printf '%s\n' "$update_output" >&2
    exit 1
  fi
done < <(resolve_services)

echo "[release-deploy] completed for ${ENVIRONMENT}"
