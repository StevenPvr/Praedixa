#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCW_TOPOLOGY_PATH_DEFAULT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/infra/opentofu/platform-topology.json"
SCW_TOPOLOGY_PATH="${SCW_TOPOLOGY_PATH:-$SCW_TOPOLOGY_PATH_DEFAULT}"
SCW_TOPOLOGY_SOURCE="${SCW_TOPOLOGY_SOURCE:-auto}"
SCW_TOPOLOGY_CACHE_DIR="${SCW_TOPOLOGY_CACHE_DIR:-${TMPDIR:-/tmp}/praedixa-scw-topology-cache}"
source "$SCRIPT_DIR/iac-state.sh"

require_scw_topology() {
  if [[ ! -f "$SCW_TOPOLOGY_PATH" ]]; then
    echo "Missing Scaleway topology catalog: $SCW_TOPOLOGY_PATH" >&2
    exit 1
  fi

  command -v jq >/dev/null 2>&1 || {
    echo "Missing required command: jq" >&2
    exit 1
  }
}

ensure_scw_topology_cache_dir() {
  mkdir -p "$SCW_TOPOLOGY_CACHE_DIR"
}

read_scw_topology_file_json() {
  require_scw_topology
  cat "$SCW_TOPOLOGY_PATH"
}

scw_topology_cache_file() {
  local environment="$1"
  local output_name="$2"
  ensure_scw_topology_cache_dir
  printf '%s/%s-%s.json\n' "$SCW_TOPOLOGY_CACHE_DIR" "$environment" "$output_name"
}

read_scw_topology_state_output_json() {
  local environment="$1"
  local output_name="$2"

  case "$SCW_TOPOLOGY_SOURCE" in
    file)
      return 1
      ;;
    auto|state) ;;
    *)
      echo "Unsupported SCW_TOPOLOGY_SOURCE: $SCW_TOPOLOGY_SOURCE" >&2
      exit 1
      ;;
  esac

  if ! iac_environment_has_backend "$environment"; then
    if [[ "$SCW_TOPOLOGY_SOURCE" == "state" ]]; then
      echo "Missing backend.hcl for IaC environment: $environment" >&2
      exit 1
    fi
    return 1
  fi

  local cache_file
  cache_file="$(scw_topology_cache_file "$environment" "$output_name")"

  if [[ -f "$cache_file" ]]; then
    cat "$cache_file"
    return 0
  fi

  local output_json
  if ! output_json="$(iac_output_json "$environment" "$output_name" 2>/dev/null)"; then
    if [[ "$SCW_TOPOLOGY_SOURCE" == "state" ]]; then
      echo "Unable to read IaC state output '${output_name}' for ${environment}" >&2
      exit 1
    fi
    return 1
  fi

  printf '%s' "$output_json" >"$cache_file"
  cat "$cache_file"
}

read_scw_topology_service_contracts_json() {
  local environment="$1"
  read_scw_topology_state_output_json "$environment" "service_contracts"
}

scw_topology_platform_field() {
  local service="$1"
  local environment="$2"
  local field="$3"

  local service_contracts_json=""
  if service_contracts_json="$(read_scw_topology_service_contracts_json "$environment" 2>/dev/null)"; then
    jq -r \
      --arg service "$service" \
      --arg field "$field" \
      '.[$service][$field] // .[$service].scaling[$field] // ""' <<<"$service_contracts_json"
    return 0
  fi

  read_scw_topology_file_json | jq -r \
    --arg service "$service" \
    --arg environment "$environment" \
    --arg field "$field" \
    '.platform.services[$service][$environment][$field] // ""'
}

scw_topology_private_network_name() {
  local environment="$1"

  read_scw_topology_file_json | jq -r \
    --arg environment "$environment" \
    '.platform.private_networks[$environment].name // ""'
}

scw_topology_rdb_instance_name() {
  local service="$1"
  local environment="$2"

  local service_contracts_json=""
  if service_contracts_json="$(read_scw_topology_service_contracts_json "$environment" 2>/dev/null)"; then
    jq -r \
      --arg service "$service" \
      '.[$service].rdb_instance_name // ""' <<<"$service_contracts_json"
    return 0
  fi

  read_scw_topology_file_json | jq -r \
    --arg service "$service" \
    --arg environment "$environment" \
    '.platform.rdb_instances[$service][$environment].name // ""'
}

scw_topology_first_public_host() {
  local service="$1"
  local environment="$2"

  local service_contracts_json=""
  if service_contracts_json="$(read_scw_topology_service_contracts_json "$environment" 2>/dev/null)"; then
    jq -r \
      --arg service "$service" \
      '.[$service].public_hosts[0] // ""' <<<"$service_contracts_json"
    return 0
  fi

  read_scw_topology_file_json | jq -r \
    --arg service "$service" \
    --arg environment "$environment" \
    '.platform.services[$service][$environment].public_hosts[0] // ""'
}

scw_topology_platform_scaling_field() {
  local service="$1"
  local environment="$2"
  local field="$3"

  local service_contracts_json=""
  if service_contracts_json="$(read_scw_topology_service_contracts_json "$environment" 2>/dev/null)"; then
    jq -r \
      --arg service "$service" \
      --arg field "$field" \
      '.[$service].scaling[$field] // ""' <<<"$service_contracts_json"
    return 0
  fi

  read_scw_topology_file_json | jq -r \
    --arg service "$service" \
    --arg environment "$environment" \
    --arg field "$field" \
    '.platform.services[$service][$environment].scaling[$field] // ""'
}

scw_topology_targets_json() {
  local staging_targets=""
  local prod_targets=""

  if staging_targets="$(read_scw_topology_state_output_json "staging" "platform_targets" 2>/dev/null)" &&
    prod_targets="$(read_scw_topology_state_output_json "prod" "platform_targets" 2>/dev/null)"; then
    jq -cn \
      --argjson staging "$staging_targets" \
      --argjson prod "$prod_targets" \
      '{staging: $staging, prod: $prod}'
    return 0
  fi

  read_scw_topology_file_json | jq -c '
      {
        staging: {
          landing: {
            region: .region,
            container_name: .platform.services.landing.staging.container_name
          },
          webapp: {
            region: .region,
            container_name: .platform.services.webapp.staging.container_name
          },
          admin: {
            region: .region,
            container_name: .platform.services.admin.staging.container_name
          },
          api: {
            region: .region,
            container_name: .platform.services.api.staging.container_name
          }
        },
        prod: {
          landing: {
            region: .region,
            container_name: .platform.services.landing.prod.container_name
          },
          webapp: {
            region: .region,
            container_name: .platform.services.webapp.prod.container_name
          },
          admin: {
            region: .region,
            container_name: .platform.services.admin.prod.container_name
          },
          api: {
            region: .region,
            container_name: .platform.services.api.prod.container_name
          },
          auth: {
            region: .region,
            container_name: .platform.services.auth.prod.container_name
          }
        }
      }'
}
