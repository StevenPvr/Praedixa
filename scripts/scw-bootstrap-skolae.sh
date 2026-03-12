#!/usr/bin/env bash
set -euo pipefail

REGION="fr-par"
DNS_ZONE="praedixa.com"
SKOLAE_HOSTNAME="${SKOLAE_HOSTNAME:-skolae.praedixa.com}"
NAMESPACE_NAME="skolae-prod"
CONTAINER_NAME="skolae-prospect"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_cmd scw
require_cmd jq

if [[ "$SKOLAE_HOSTNAME" != *.praedixa.com ]]; then
  echo "SKOLAE_HOSTNAME must be under praedixa.com (current: $SKOLAE_HOSTNAME)" >&2
  exit 1
fi

DNS_RECORD_NAME="${SKOLAE_HOSTNAME%.praedixa.com}"

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
    min-scale=1 \
    max-scale=2 \
    memory-limit=512 \
    cpu-limit=500 \
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

  existing_domain="$(scw container domain list region="$REGION" -o json | jq -c --arg h "$SKOLAE_HOSTNAME" '.[] | select(.hostname==$h)' | head -n1)"
  if [ -z "$existing_domain" ]; then
    echo "[create] container domain binding $SKOLAE_HOSTNAME -> $CONTAINER_NAME"
    if ! scw container domain create hostname="$SKOLAE_HOSTNAME" container-id="$container_id" region="$REGION" >/dev/null; then
      echo "[warn] container domain binding could not be completed yet for $SKOLAE_HOSTNAME" >&2
    fi
  else
    local existing_container_id existing_domain_id
    existing_container_id="$(printf '%s' "$existing_domain" | jq -r '.container_id')"
    if [ "$existing_container_id" != "$container_id" ]; then
      existing_domain_id="$(printf '%s' "$existing_domain" | jq -r '.id')"
      echo "[rebind] container domain $SKOLAE_HOSTNAME to $CONTAINER_NAME"
      scw container domain delete "$existing_domain_id" region="$REGION" >/dev/null
      if ! scw container domain create hostname="$SKOLAE_HOSTNAME" container-id="$container_id" region="$REGION" >/dev/null; then
        echo "[warn] container domain rebinding could not be completed yet for $SKOLAE_HOSTNAME" >&2
      fi
    else
      echo "[skip] container domain $SKOLAE_HOSTNAME already bound to $CONTAINER_NAME"
    fi
  fi

  echo "[set] DNS CNAME ${DNS_RECORD_NAME} -> $domain_name"
  if ! scw dns record set "$DNS_ZONE" name="$DNS_RECORD_NAME" type=CNAME ttl=300 values.0="$domain_name" >/dev/null; then
    echo "[warn] DNS zone $DNS_ZONE not managed in Scaleway or record update failed; add CNAME manually if needed" >&2
  fi
}

ensure_namespace
ensure_container
sync_domain_binding_and_dns

echo "Scaleway skolae bootstrap completed."
