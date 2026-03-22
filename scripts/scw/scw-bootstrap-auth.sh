#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/scw-topology.sh"

REGION="fr-par"
DNS_ZONE="praedixa.com"
AUTH_HOSTNAME="${AUTH_HOSTNAME:-$(scw_topology_first_public_host "auth" "prod")}"
NAMESPACE_NAME="$(scw_topology_platform_field "auth" "prod" "namespace_name")"
CONTAINER_NAME="$(scw_topology_platform_field "auth" "prod" "container_name")"

AUTH_HOSTNAME="${AUTH_HOSTNAME#https://}"
AUTH_HOSTNAME="${AUTH_HOSTNAME#http://}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_cmd scw
require_cmd jq

ensure_namespace() {
  local ns_json ns_id status
  ns_json="$(scw container namespace list region="$REGION" -o json)"
  ns_id="$(printf '%s' "$ns_json" | jq -r --arg n "$NAMESPACE_NAME" '.[] | select(.name==$n) | .id' | head -n1)"

  if [ -z "$ns_id" ]; then
    echo "[create] namespace $NAMESPACE_NAME"
    scw container namespace create name="$NAMESPACE_NAME" region="$REGION" >/dev/null
  else
    echo "[skip] namespace $NAMESPACE_NAME exists"
  fi

  for _ in {1..60}; do
    ns_json="$(scw container namespace list region="$REGION" -o json)"
    ns_id="$(printf '%s' "$ns_json" | jq -r --arg n "$NAMESPACE_NAME" '.[] | select(.name==$n) | .id' | head -n1)"
    status="$(printf '%s' "$ns_json" | jq -r --arg n "$NAMESPACE_NAME" '.[] | select(.name==$n) | .status' | head -n1)"
    if [ "$status" = "ready" ]; then
      echo "[ready] namespace $NAMESPACE_NAME ($ns_id)"
      return
    fi
    sleep 2
  done

  echo "Namespace $NAMESPACE_NAME did not become ready in time" >&2
  exit 1
}

ensure_container() {
  local ns_json ns_id containers_json container_id
  ns_json="$(scw container namespace list region="$REGION" -o json)"
  ns_id="$(printf '%s' "$ns_json" | jq -r --arg n "$NAMESPACE_NAME" '.[] | select(.name==$n) | .id' | head -n1)"
  if [ -z "$ns_id" ]; then
    echo "Namespace not found: $NAMESPACE_NAME" >&2
    exit 1
  fi

  containers_json="$(scw container container list namespace-id="$ns_id" region="$REGION" -o json)"
  container_id="$(printf '%s' "$containers_json" | jq -r --arg n "$CONTAINER_NAME" '.[] | select(.name==$n) | .id' | head -n1)"

  if [ -n "$container_id" ]; then
    echo "[skip] container $CONTAINER_NAME exists in $NAMESPACE_NAME"
    return
  fi

  echo "[create] container $CONTAINER_NAME in $NAMESPACE_NAME"
  scw container container create \
    namespace-id="$ns_id" \
    name="$CONTAINER_NAME" \
    min-scale="$(scw_topology_platform_scaling_field "auth" "prod" "min_scale")" \
    max-scale="$(scw_topology_platform_scaling_field "auth" "prod" "max_scale")" \
    memory-limit="$(scw_topology_platform_scaling_field "auth" "prod" "memory_limit")" \
    cpu-limit="$(scw_topology_platform_scaling_field "auth" "prod" "cpu_limit")" \
    port=8080 \
    protocol=http1 \
    privacy=public \
    region="$REGION" >/dev/null
}

sync_domain_binding_and_dns() {
  local container_json container_id domain_name existing_domain
  container_json="$(scw container container list region="$REGION" -o json | jq -c --arg n "$CONTAINER_NAME" '.[] | select(.name==$n)' | head -n1)"
  if [ -z "$container_json" ]; then
    echo "Container not found: $CONTAINER_NAME" >&2
    exit 1
  fi

  container_id="$(printf '%s' "$container_json" | jq -r '.id')"
  domain_name="$(printf '%s' "$container_json" | jq -r '.domain_name // ""')"
  if [ -z "$domain_name" ]; then
    echo "Container domain_name is empty for $CONTAINER_NAME" >&2
    exit 1
  fi
  domain_name="${domain_name%.}."

  existing_domain="$(scw container domain list region="$REGION" -o json | jq -c --arg h "$AUTH_HOSTNAME" '.[] | select(.hostname==$h)' | head -n1)"
  if [ -z "$existing_domain" ]; then
    echo "[create] container domain binding $AUTH_HOSTNAME -> $CONTAINER_NAME"
    scw container domain create hostname="$AUTH_HOSTNAME" container-id="$container_id" region="$REGION" >/dev/null
  else
    local existing_container_id
    existing_container_id="$(printf '%s' "$existing_domain" | jq -r '.container_id')"
    if [ "$existing_container_id" != "$container_id" ]; then
      local existing_domain_id
      existing_domain_id="$(printf '%s' "$existing_domain" | jq -r '.id')"
      echo "[rebind] container domain $AUTH_HOSTNAME to $CONTAINER_NAME"
      scw container domain delete "$existing_domain_id" region="$REGION" >/dev/null
      scw container domain create hostname="$AUTH_HOSTNAME" container-id="$container_id" region="$REGION" >/dev/null
    else
      echo "[skip] container domain $AUTH_HOSTNAME already bound to $CONTAINER_NAME"
    fi
  fi

  echo "[set] DNS CNAME auth -> $domain_name"
  scw dns record set "$DNS_ZONE" name=auth type=CNAME ttl=300 values.0="$domain_name" >/dev/null
}

ensure_namespace
ensure_container
sync_domain_binding_and_dns

echo "Scaleway auth bootstrap completed."
