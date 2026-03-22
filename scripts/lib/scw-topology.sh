#!/usr/bin/env bash
set -euo pipefail

SCW_TOPOLOGY_PATH_DEFAULT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/infra/opentofu/platform-topology.json"
SCW_TOPOLOGY_PATH="${SCW_TOPOLOGY_PATH:-$SCW_TOPOLOGY_PATH_DEFAULT}"

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

scw_topology_platform_field() {
  local service="$1"
  local environment="$2"
  local field="$3"

  require_scw_topology
  jq -r \
    --arg service "$service" \
    --arg environment "$environment" \
    --arg field "$field" \
    '.platform.services[$service][$environment][$field] // ""' \
    "$SCW_TOPOLOGY_PATH"
}

scw_topology_private_network_name() {
  local environment="$1"

  require_scw_topology
  jq -r \
    --arg environment "$environment" \
    '.platform.private_networks[$environment].name // ""' \
    "$SCW_TOPOLOGY_PATH"
}

scw_topology_rdb_instance_name() {
  local service="$1"
  local environment="$2"

  require_scw_topology
  jq -r \
    --arg service "$service" \
    --arg environment "$environment" \
    '.platform.rdb_instances[$service][$environment].name // ""' \
    "$SCW_TOPOLOGY_PATH"
}

scw_topology_first_public_host() {
  local service="$1"
  local environment="$2"

  require_scw_topology
  jq -r \
    --arg service "$service" \
    --arg environment "$environment" \
    '.platform.services[$service][$environment].public_hosts[0] // ""' \
    "$SCW_TOPOLOGY_PATH"
}

scw_topology_platform_scaling_field() {
  local service="$1"
  local environment="$2"
  local field="$3"

  require_scw_topology
  jq -r \
    --arg service "$service" \
    --arg environment "$environment" \
    --arg field "$field" \
    '.platform.services[$service][$environment].scaling[$field] // ""' \
    "$SCW_TOPOLOGY_PATH"
}

scw_topology_targets_json() {
  require_scw_topology
  jq -c '
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
    }' \
    "$SCW_TOPOLOGY_PATH"
}
