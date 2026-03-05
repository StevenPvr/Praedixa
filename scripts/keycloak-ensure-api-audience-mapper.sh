#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KCADM_BIN="${KCADM_BIN:-$SCRIPT_DIR/kcadm}"

REALM="${KEYCLOAK_REALM:-praedixa}"
TARGET_AUDIENCE="${KEYCLOAK_API_AUDIENCE:-praedixa-api}"
MAPPER_NAME="${KEYCLOAK_AUDIENCE_MAPPER_NAME:-audience-praedixa-api}"
CLIENT_IDS_RAW="${KEYCLOAK_CLIENT_IDS:-praedixa-webapp,praedixa-admin}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_cmd jq

if [ ! -x "$KCADM_BIN" ]; then
  echo "kcadm wrapper is missing or not executable: $KCADM_BIN" >&2
  exit 1
fi

build_mapper_payload() {
  jq -n \
    --arg name "$MAPPER_NAME" \
    --arg audience "$TARGET_AUDIENCE" \
    '{
      name: $name,
      protocol: "openid-connect",
      protocolMapper: "oidc-audience-mapper",
      consentRequired: false,
      config: {
        "included.client.audience": $audience,
        "id.token.claim": "false",
        "access.token.claim": "true",
        "introspection.token.claim": "true"
      }
    }'
}

get_client_uuid() {
  local client_id="$1"
  "$KCADM_BIN" get clients -r "$REALM" -q "clientId=${client_id}" \
    | jq -r '.[0].id // empty'
}

assert_mapper() {
  local client_uuid="$1"
  local mapper_count

  mapper_count="$(
    "$KCADM_BIN" get "clients/${client_uuid}/protocol-mappers/models" -r "$REALM" \
      | jq -r --arg mapper_name "$MAPPER_NAME" --arg audience "$TARGET_AUDIENCE" '
        map(
          select(
            .name == $mapper_name
            and .protocolMapper == "oidc-audience-mapper"
            and .config["included.client.audience"] == $audience
            and .config["access.token.claim"] == "true"
          )
        )
        | length
      '
  )"

  if [ "$mapper_count" != "1" ]; then
    echo "Audience mapper verification failed (expected 1, got ${mapper_count})" >&2
    exit 1
  fi
}

ensure_mapper_for_client() {
  local client_id="$1"
  local client_uuid existing_mappers mapper_id payload update_payload

  client_uuid="$(get_client_uuid "$client_id")"
  if [ -z "$client_uuid" ]; then
    echo "Client not found in realm ${REALM}: ${client_id}" >&2
    exit 1
  fi

  existing_mappers="$(
    "$KCADM_BIN" get "clients/${client_uuid}/protocol-mappers/models" -r "$REALM"
  )"
  mapper_id="$(
    printf '%s' "$existing_mappers" \
      | jq -r --arg mapper_name "$MAPPER_NAME" '
          map(select(.name == $mapper_name))
          | .[0].id // empty
        '
  )"

  payload="$(build_mapper_payload)"

  if [ -n "$mapper_id" ]; then
    update_payload="$(printf '%s' "$payload" | jq --arg id "$mapper_id" '. + { id: $id }')"
    printf '%s' "$update_payload" \
      | "$KCADM_BIN" update "clients/${client_uuid}/protocol-mappers/models/${mapper_id}" -r "$REALM" -f - >/dev/null
    echo "[ok] Updated mapper ${MAPPER_NAME} on client ${client_id}"
  else
    printf '%s' "$payload" \
      | "$KCADM_BIN" create "clients/${client_uuid}/protocol-mappers/models" -r "$REALM" -f - >/dev/null
    echo "[ok] Created mapper ${MAPPER_NAME} on client ${client_id}"
  fi

  assert_mapper "$client_uuid"
  echo "[ok] Verified mapper ${MAPPER_NAME} on client ${client_id}"
}

IFS=',' read -r -a CLIENT_IDS <<< "$CLIENT_IDS_RAW"
if [ "${#CLIENT_IDS[@]}" -eq 0 ]; then
  echo "No client ids configured (KEYCLOAK_CLIENT_IDS)" >&2
  exit 1
fi

for raw_client_id in "${CLIENT_IDS[@]}"; do
  client_id="${raw_client_id//[[:space:]]/}"
  if [ -z "$client_id" ]; then
    continue
  fi
  ensure_mapper_for_client "$client_id"
done

echo "Audience mapper is configured for realm ${REALM}."
