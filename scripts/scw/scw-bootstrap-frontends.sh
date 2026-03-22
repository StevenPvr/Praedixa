#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/scw-topology.sh"

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

ensure_namespace "$(scw_topology_platform_field "webapp" "staging" "namespace_name")"
ensure_namespace "$(scw_topology_platform_field "webapp" "prod" "namespace_name")"
ensure_namespace "$(scw_topology_platform_field "admin" "staging" "namespace_name")"
ensure_namespace "$(scw_topology_platform_field "admin" "prod" "namespace_name")"
ensure_namespace "$(scw_topology_platform_field "landing" "staging" "namespace_name")"
ensure_namespace "$(scw_topology_platform_field "landing" "prod" "namespace_name")"

ensure_container \
  "$(scw_topology_platform_field "webapp" "staging" "namespace_name")" \
  "$(scw_topology_platform_field "webapp" "staging" "container_name")" \
  "$(scw_topology_platform_scaling_field "webapp" "staging" "min_scale")" \
  "$(scw_topology_platform_scaling_field "webapp" "staging" "max_scale")" \
  "$(scw_topology_platform_scaling_field "webapp" "staging" "cpu_limit")" \
  "$(scw_topology_platform_scaling_field "webapp" "staging" "memory_limit")"
ensure_container \
  "$(scw_topology_platform_field "webapp" "prod" "namespace_name")" \
  "$(scw_topology_platform_field "webapp" "prod" "container_name")" \
  "$(scw_topology_platform_scaling_field "webapp" "prod" "min_scale")" \
  "$(scw_topology_platform_scaling_field "webapp" "prod" "max_scale")" \
  "$(scw_topology_platform_scaling_field "webapp" "prod" "cpu_limit")" \
  "$(scw_topology_platform_scaling_field "webapp" "prod" "memory_limit")"
ensure_container \
  "$(scw_topology_platform_field "admin" "staging" "namespace_name")" \
  "$(scw_topology_platform_field "admin" "staging" "container_name")" \
  "$(scw_topology_platform_scaling_field "admin" "staging" "min_scale")" \
  "$(scw_topology_platform_scaling_field "admin" "staging" "max_scale")" \
  "$(scw_topology_platform_scaling_field "admin" "staging" "cpu_limit")" \
  "$(scw_topology_platform_scaling_field "admin" "staging" "memory_limit")"
ensure_container \
  "$(scw_topology_platform_field "admin" "prod" "namespace_name")" \
  "$(scw_topology_platform_field "admin" "prod" "container_name")" \
  "$(scw_topology_platform_scaling_field "admin" "prod" "min_scale")" \
  "$(scw_topology_platform_scaling_field "admin" "prod" "max_scale")" \
  "$(scw_topology_platform_scaling_field "admin" "prod" "cpu_limit")" \
  "$(scw_topology_platform_scaling_field "admin" "prod" "memory_limit")"
ensure_container \
  "$(scw_topology_platform_field "landing" "staging" "namespace_name")" \
  "$(scw_topology_platform_field "landing" "staging" "container_name")" \
  "$(scw_topology_platform_scaling_field "landing" "staging" "min_scale")" \
  "$(scw_topology_platform_scaling_field "landing" "staging" "max_scale")" \
  "$(scw_topology_platform_scaling_field "landing" "staging" "cpu_limit")" \
  "$(scw_topology_platform_scaling_field "landing" "staging" "memory_limit")"
ensure_container \
  "$(scw_topology_platform_field "landing" "prod" "namespace_name")" \
  "$(scw_topology_platform_field "landing" "prod" "container_name")" \
  "$(scw_topology_platform_scaling_field "landing" "prod" "min_scale")" \
  "$(scw_topology_platform_scaling_field "landing" "prod" "max_scale")" \
  "$(scw_topology_platform_scaling_field "landing" "prod" "cpu_limit")" \
  "$(scw_topology_platform_scaling_field "landing" "prod" "memory_limit")"

ensure_bucket "praedixa-stg-client-files-fr-${PROJECT_SUFFIX}"
ensure_bucket "praedixa-prd-client-files-fr-${PROJECT_SUFFIX}"
ensure_bucket "praedixa-stg-client-exports-fr-${PROJECT_SUFFIX}"
ensure_bucket "praedixa-prd-client-exports-fr-${PROJECT_SUFFIX}"

echo "Scaleway frontend bootstrap completed."
