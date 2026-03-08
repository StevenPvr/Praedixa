#!/usr/bin/env bash
set -euo pipefail

REGION="fr-par"
CONTAINER_ID=""
ENV_FILE=""
SECRETS_FILE=""
HTTP_OPTION=""
SANDBOX=""
PRIVATE_NETWORK_ID=""
REDEPLOY="true"
WAIT_FOR_READY="0"

usage() {
  echo "Usage: $0 --container-id <id> [--region <region>] [--env-file <json>] [--secrets-file <json>] [--http-option <value>] [--sandbox <value>] [--private-network-id <id>] [--redeploy <true|false>] [--wait]" >&2
  exit 2
}

while (($# > 0)); do
  case "$1" in
    --container-id)
      CONTAINER_ID="${2:-}"
      shift 2
      ;;
    --region)
      REGION="${2:-}"
      shift 2
      ;;
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    --secrets-file)
      SECRETS_FILE="${2:-}"
      shift 2
      ;;
    --http-option)
      HTTP_OPTION="${2:-}"
      shift 2
      ;;
    --sandbox)
      SANDBOX="${2:-}"
      shift 2
      ;;
    --private-network-id)
      PRIVATE_NETWORK_ID="${2:-}"
      shift 2
      ;;
    --redeploy)
      REDEPLOY="${2:-}"
      shift 2
      ;;
    --wait)
      WAIT_FOR_READY="1"
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      ;;
  esac
done

if [ -z "$CONTAINER_ID" ]; then
  usage
fi

command -v curl >/dev/null 2>&1 || {
  echo "Missing required command: curl" >&2
  exit 1
}
command -v jq >/dev/null 2>&1 || {
  echo "Missing required command: jq" >&2
  exit 1
}
command -v scw >/dev/null 2>&1 || {
  echo "Missing required command: scw" >&2
  exit 1
}

ensure_json_file() {
  local path="$1"
  if [ -n "$path" ] && [ ! -f "$path" ]; then
    echo "JSON file not found: $path" >&2
    exit 1
  fi
}

ensure_json_file "$ENV_FILE"
ensure_json_file "$SECRETS_FILE"

get_scw_config_value() {
  local key="$1"
  scw config get "$key" 2>/dev/null | tr -d '\r'
}

SCW_API_TOKEN="${SCW_SECRET_KEY:-}"
if [ -z "$SCW_API_TOKEN" ]; then
  SCW_API_TOKEN="$(get_scw_config_value secret-key)"
fi
if [ -z "$SCW_API_TOKEN" ]; then
  echo "Missing Scaleway API token: set SCW_SECRET_KEY or configure scw CLI." >&2
  exit 1
fi

SCW_API_URL="${SCW_API_URL:-https://api.scaleway.com}"

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

normalized_env_file="$TMP_DIR/env.json"
normalized_secrets_file="$TMP_DIR/secrets.json"
printf '{}' >"$normalized_env_file"
printf '{}' >"$normalized_secrets_file"

if [ -n "$ENV_FILE" ]; then
  cp "$ENV_FILE" "$normalized_env_file"
fi
if [ -n "$SECRETS_FILE" ]; then
  cp "$SECRETS_FILE" "$normalized_secrets_file"
fi

payload_file="$TMP_DIR/payload.json"
jq -n \
  --slurpfile env "$normalized_env_file" \
  --slurpfile secrets "$normalized_secrets_file" \
  --arg http_option "$HTTP_OPTION" \
  --arg sandbox "$SANDBOX" \
  --arg private_network_id "$PRIVATE_NETWORK_ID" \
  --arg redeploy "$REDEPLOY" \
  '
    {
      environment_variables: ($env[0] // {}),
      redeploy: ($redeploy == "true"),
      privacy: "unknown_privacy",
      protocol: "unknown_protocol",
      secret_environment_variables: (
        (($secrets[0] // {}) | to_entries | map({ key: .key, value: .value })) as $entries
        | if ($entries | length) == 0 then null else $entries end
      ),
      http_option: (if $http_option == "" then "unknown_http_option" else $http_option end),
      sandbox: (if $sandbox == "" then "unknown_sandbox" else $sandbox end)
    }
    + (if $private_network_id == "" then {} else { private_network_id: $private_network_id } end)
  ' >"$payload_file"

response_file="$TMP_DIR/response.json"
http_status="$(
  curl -sS -o "$response_file" -w '%{http_code}' \
    -X PATCH \
    -H "Content-Type: application/json" \
    -H "X-Auth-Token: ${SCW_API_TOKEN}" \
    --data-binary @"$payload_file" \
    "${SCW_API_URL}/containers/v1beta1/regions/${REGION}/containers/${CONTAINER_ID}"
)"

if [[ ! "$http_status" =~ ^2 ]]; then
  message="$(jq -r '.message // .error.message // "Unknown Scaleway API error"' "$response_file" 2>/dev/null || true)"
  echo "Scaleway container update failed (${http_status}): ${message:-unknown error}" >&2
  exit 1
fi

if [ "$WAIT_FOR_READY" != "1" ]; then
  exit 0
fi

for _ in {1..90}; do
  status="$(scw container container get "$CONTAINER_ID" region="$REGION" -o json | jq -r '.status // ""')"
  case "$status" in
    ready)
      exit 0
      ;;
    error)
      echo "Container ${CONTAINER_ID} entered error state while waiting for readiness." >&2
      exit 1
      ;;
  esac
  sleep 2
done

echo "Container ${CONTAINER_ID} did not become ready in time." >&2
exit 1
