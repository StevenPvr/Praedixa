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

DEPLOY_LAST_RC=0

deploy_container_image() {
  local container_id="$1"
  local region="$2"
  local image_ref="$3"
  local output

  set +e
  output="$(
    scw container container update \
      "$container_id" \
      region="$region" \
      registry-image="$image_ref" \
      redeploy=true \
      -w \
      -o json
  )"
  DEPLOY_LAST_RC=$?
  set -e

  printf '%s' "$output"
}

extract_scw_error_message() {
  local response_json="$1"
  printf '%s' "$response_json" | jq -r '.error.message // .message // ""'
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

  container_id="$(
    scw container container list region="$region" -o json |
      jq -r --arg n "$container_name" '.[] | select(.name == $n) | .id' |
      head -n1
  )"

  if [[ -z "$container_id" ]]; then
    echo "Container not found for ${service} (${container_name})" >&2
    exit 1
  fi

  echo "[release-deploy] ${service} -> ${container_name} (${registry_image})"
  deploy_image_ref="$registry_image"
  update_output="$(deploy_container_image "$container_id" "$region" "$deploy_image_ref")"

  if [[ "$DEPLOY_LAST_RC" -ne 0 ]] ||
    ! printf '%s' "$update_output" | jq -e '(.error? // null) == null' >/dev/null; then
    error_message="$(extract_scw_error_message "$update_output")"
    if [[ -n "$error_message" ]]; then
      echo "[release-deploy] ${service}: failed to deploy signed image ref ${deploy_image_ref} (${error_message})" >&2
    else
      echo "[release-deploy] ${service}: failed to deploy signed image ref ${deploy_image_ref}" >&2
    fi
    printf '%s\n' "$update_output" >&2
    exit 1
  fi
done < <(resolve_services)

echo "[release-deploy] completed for ${ENVIRONMENT}"
