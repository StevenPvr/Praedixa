#!/usr/bin/env bash
set -euo pipefail

REGION="fr-par"
DNS_ZONE="praedixa.com"
CENTAURUS_HOSTNAME="${CENTAURUS_HOSTNAME:-centaurus.praedixa.com}"
NAMESPACE_NAME="centaurus-prod"
CONTAINER_NAME="centaurus-prospect"
DNS_MODE="${SCW_BOOTSTRAP_DNS_MODE:-scaleway-managed}"
VERIFY_ATTEMPTS="${SCW_BOOTSTRAP_VERIFY_ATTEMPTS:-20}"
VERIFY_SLEEP_SECONDS="${SCW_BOOTSTRAP_VERIFY_SLEEP_SECONDS:-3}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_cmd scw
require_cmd jq

require_positive_int() {
  local value="$1"
  local label="$2"
  if ! [[ "$value" =~ ^[1-9][0-9]*$ ]]; then
    echo "${label} must be a positive integer (current: ${value})" >&2
    exit 1
  fi
}

normalize_dns_target() {
  local value="$1"
  value="${value%.}"
  printf '%s.' "$value"
}

resolve_public_cname_target() {
  local hostname="$1"

  if command -v dig >/dev/null 2>&1; then
    dig +short CNAME "$hostname" | head -n1
    return 0
  fi

  if command -v nslookup >/dev/null 2>&1; then
    nslookup -type=CNAME "$hostname" 2>/dev/null |
      awk '/canonical name = / {print $NF; exit}'
    return 0
  fi

  echo "Missing required command: dig or nslookup for public DNS verification" >&2
  exit 1
}

validate_dns_mode() {
  case "$DNS_MODE" in
    scaleway-managed|external-verified) ;;
    *)
      echo "Unsupported SCW_BOOTSTRAP_DNS_MODE: ${DNS_MODE}" >&2
      echo "Supported values: scaleway-managed, external-verified" >&2
      exit 1
      ;;
  esac
}

if [[ "$CENTAURUS_HOSTNAME" != *.praedixa.com ]]; then
  echo "CENTAURUS_HOSTNAME must be under praedixa.com (current: $CENTAURUS_HOSTNAME)" >&2
  exit 1
fi

DNS_RECORD_NAME="${CENTAURUS_HOSTNAME%.praedixa.com}"

validate_dns_mode
require_positive_int "$VERIFY_ATTEMPTS" "SCW_BOOTSTRAP_VERIFY_ATTEMPTS"
require_positive_int "$VERIFY_SLEEP_SECONDS" "SCW_BOOTSTRAP_VERIFY_SLEEP_SECONDS"

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

ensure_domain_binding_and_dns() {
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
  domain_name="$(normalize_dns_target "$domain_name")"

  existing_domain="$(scw container domain list region="$REGION" -o json | jq -c --arg h "$CENTAURUS_HOSTNAME" '.[] | select(.hostname==$h)' | head -n1)"
  if [ -z "$existing_domain" ]; then
    echo "[create] container domain binding $CENTAURUS_HOSTNAME -> $CONTAINER_NAME"
    scw container domain create hostname="$CENTAURUS_HOSTNAME" container-id="$container_id" region="$REGION" >/dev/null
  else
    local existing_container_id existing_domain_id
    existing_container_id="$(printf '%s' "$existing_domain" | jq -r '.container_id')"
    if [ "$existing_container_id" != "$container_id" ]; then
      existing_domain_id="$(printf '%s' "$existing_domain" | jq -r '.id')"
      echo "[rebind] container domain $CENTAURUS_HOSTNAME to $CONTAINER_NAME"
      scw container domain delete "$existing_domain_id" region="$REGION" >/dev/null
      scw container domain create hostname="$CENTAURUS_HOSTNAME" container-id="$container_id" region="$REGION" >/dev/null
    else
      echo "[skip] container domain $CENTAURUS_HOSTNAME already bound to $CONTAINER_NAME"
    fi
  fi

  for _ in $(seq 1 "$VERIFY_ATTEMPTS"); do
    local binding_json bound_container_id binding_status
    binding_json="$(scw container domain list region="$REGION" -o json | jq -c --arg h "$CENTAURUS_HOSTNAME" '.[] | select(.hostname==$h)' | head -n1)"
    bound_container_id="$(printf '%s' "${binding_json:-null}" | jq -r '.container_id // ""')"
    binding_status="$(printf '%s' "${binding_json:-null}" | jq -r '.status // ""')"
    if [ "$bound_container_id" = "$container_id" ]; then
      if [ -z "$binding_status" ] || [ "$binding_status" = "ready" ] || [ "$binding_status" = "pending" ]; then
        echo "[verified] container domain $CENTAURUS_HOSTNAME bound to $CONTAINER_NAME"
        break
      fi
      if [ "$binding_status" = "error" ]; then
        echo "Container domain binding for $CENTAURUS_HOSTNAME is in error state" >&2
        exit 1
      fi
    fi

    if [ "$_" -eq "$VERIFY_ATTEMPTS" ]; then
      echo "Container domain binding for $CENTAURUS_HOSTNAME was not observable after verification window" >&2
      exit 1
    fi
    sleep "$VERIFY_SLEEP_SECONDS"
  done

  if [ "$DNS_MODE" = "scaleway-managed" ]; then
    echo "[set] DNS CNAME ${DNS_RECORD_NAME} -> $domain_name"
    scw dns record set "$DNS_ZONE" name="$DNS_RECORD_NAME" type=CNAME ttl=300 values.0="$domain_name" >/dev/null

    for _ in $(seq 1 "$VERIFY_ATTEMPTS"); do
      local record_json record_target
      record_json="$(scw dns record list dns-zone="$DNS_ZONE" -o json | jq -c --arg n "$DNS_RECORD_NAME" '.[] | select(.name==$n and .type=="CNAME")' | head -n1)"
      record_target="$(printf '%s' "${record_json:-null}" | jq -r '(.data // .record // .value // (.records[0]? // .values[0]? // "")) | tostring')"
      if [ "$(normalize_dns_target "$record_target")" = "$domain_name" ]; then
        echo "[verified] Scaleway DNS CNAME ${DNS_RECORD_NAME} -> $domain_name"
        break
      fi

      if [ "$_" -eq "$VERIFY_ATTEMPTS" ]; then
        echo "Scaleway DNS record ${DNS_RECORD_NAME}.${DNS_ZONE} does not point to ${domain_name}" >&2
        exit 1
      fi
      sleep "$VERIFY_SLEEP_SECONDS"
    done
  else
    echo "[verify] external DNS CNAME ${DNS_RECORD_NAME} -> $domain_name"
  fi

  for _ in $(seq 1 "$VERIFY_ATTEMPTS"); do
    local public_cname_target
    public_cname_target="$(resolve_public_cname_target "$CENTAURUS_HOSTNAME" | tr -d '[:space:]')"
    if [ -n "$public_cname_target" ] && [ "$(normalize_dns_target "$public_cname_target")" = "$domain_name" ]; then
      echo "[verified] public DNS CNAME ${CENTAURUS_HOSTNAME} -> $domain_name"
      return
    fi

    if [ "$_" -eq "$VERIFY_ATTEMPTS" ]; then
      echo "Public DNS for $CENTAURUS_HOSTNAME does not resolve to expected CNAME target ${domain_name}" >&2
      echo "Current observed CNAME target: ${public_cname_target:-<none>}" >&2
      exit 1
    fi
    sleep "$VERIFY_SLEEP_SECONDS"
  done
}

ensure_namespace
ensure_container
ensure_domain_binding_and_dns

echo "Scaleway centaurus bootstrap completed."
