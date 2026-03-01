#!/usr/bin/env bash
set -euo pipefail

REGION="fr-par"
PROJECT_SUFFIX="14b3676c"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_cmd scw
require_cmd jq

ensure_namespace() {
  local name="$1"
  local ns_json ns_id status

  ns_json=$(scw container namespace list region="$REGION" -o json)
  ns_id=$(printf '%s' "$ns_json" | jq -r --arg n "$name" '.[] | select(.name==$n) | .id' | head -n1)

  if [ -z "$ns_id" ]; then
    echo "[create] namespace $name"
    scw container namespace create name="$name" region="$REGION" >/dev/null
  else
    echo "[skip] namespace $name exists"
  fi

  for _ in {1..60}; do
    ns_json=$(scw container namespace list region="$REGION" -o json)
    ns_id=$(printf '%s' "$ns_json" | jq -r --arg n "$name" '.[] | select(.name==$n) | .id' | head -n1)
    status=$(printf '%s' "$ns_json" | jq -r --arg n "$name" '.[] | select(.name==$n) | .status' | head -n1)
    if [ "$status" = "ready" ]; then
      echo "[ready] namespace $name ($ns_id)"
      return 0
    fi
    sleep 2
  done

  echo "Namespace $name did not become ready in time" >&2
  exit 1
}

ensure_container() {
  local namespace_name="$1"
  local name="$2"
  local min_scale="$3"
  local max_scale="$4"
  local cpu="$5"
  local memory="$6"

  local ns_json ns_id container_json container_id
  ns_json=$(scw container namespace list region="$REGION" -o json)
  ns_id=$(printf '%s' "$ns_json" | jq -r --arg n "$namespace_name" '.[] | select(.name==$n) | .id' | head -n1)

  if [ -z "$ns_id" ]; then
    echo "Namespace not found: $namespace_name" >&2
    exit 1
  fi

  container_json=$(scw container container list namespace-id="$ns_id" region="$REGION" -o json)
  container_id=$(printf '%s' "$container_json" | jq -r --arg n "$name" '.[] | select(.name==$n) | .id' | head -n1)

  if [ -n "$container_id" ]; then
    echo "[skip] container $name exists in $namespace_name"
    return 0
  fi

  echo "[create] container $name in $namespace_name"
  scw container container create \
    namespace-id="$ns_id" \
    name="$name" \
    min-scale="$min_scale" \
    max-scale="$max_scale" \
    memory-limit="$memory" \
    cpu-limit="$cpu" \
    port=8080 \
    protocol=http1 \
    privacy=public \
    region="$REGION" >/dev/null
}

ensure_bucket() {
  local name="$1"
  if scw object bucket get "$name" region="$REGION" >/dev/null 2>&1; then
    echo "[skip] bucket $name exists"
    return 0
  fi

  echo "[create] bucket $name"
  scw object bucket create "$name" enable-versioning=true acl=private region="$REGION" >/dev/null
}

ensure_namespace "webapp-staging"
ensure_namespace "webapp-prod"
ensure_namespace "admin-staging"
ensure_namespace "admin-prod"
ensure_namespace "landing-staging"
ensure_namespace "landing-prod"

ensure_container "webapp-staging" "webapp-staging" "0" "2" "500" "1024"
ensure_container "webapp-prod" "webapp-prod" "1" "4" "1000" "2048"
ensure_container "admin-staging" "admin-staging" "0" "2" "500" "1024"
ensure_container "admin-prod" "admin-prod" "1" "3" "1000" "2048"
ensure_container "landing-staging" "landing-staging" "0" "2" "500" "1024"
ensure_container "landing-prod" "landing-web" "1" "3" "500" "1024"

ensure_bucket "praedixa-stg-client-files-fr-${PROJECT_SUFFIX}"
ensure_bucket "praedixa-prd-client-files-fr-${PROJECT_SUFFIX}"
ensure_bucket "praedixa-stg-client-exports-fr-${PROJECT_SUFFIX}"
ensure_bucket "praedixa-prd-client-exports-fr-${PROJECT_SUFFIX}"

echo "Scaleway frontend bootstrap completed."
