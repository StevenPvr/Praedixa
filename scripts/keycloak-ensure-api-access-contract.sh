#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KCADM_BIN="${KCADM_BIN:-$SCRIPT_DIR/kcadm}"
USER_PROFILE_CONTRACT_PATH="${USER_PROFILE_CONTRACT_PATH:-$SCRIPT_DIR/../infra/auth/user-profile-praedixa.json}"
source "$SCRIPT_DIR/lib/keycloak.sh"

KEYCLOAK_SERVER_URL="${KEYCLOAK_SERVER_URL:-https://auth.praedixa.com}"
KEYCLOAK_ADMIN_REALM="${KEYCLOAK_ADMIN_REALM:-master}"
KEYCLOAK_ADMIN_USERNAME="${KEYCLOAK_ADMIN_USERNAME:-kcadmin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-praedixa}"
KEYCLOAK_CLIENT_IDS="${KEYCLOAK_CLIENT_IDS:-praedixa-webapp,praedixa-admin}"
KEYCLOAK_API_AUDIENCE="${KEYCLOAK_API_AUDIENCE:-praedixa-api}"

TARGET_USER_EMAIL="${TARGET_USER_EMAIL:-}"
TARGET_USER_USERNAME="${TARGET_USER_USERNAME:-}"
TARGET_ORGANIZATION_ID="${TARGET_ORGANIZATION_ID:-}"
TARGET_SITE_ID="${TARGET_SITE_ID:-}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_non_empty() {
  local value="$1"
  local name="$2"
  if [ -z "$value" ]; then
    echo "Missing required value: $name" >&2
    exit 1
  fi
}

require_cmd jq

if [ ! -x "$KCADM_BIN" ]; then
  echo "kcadm wrapper is missing or not executable: $KCADM_BIN" >&2
  exit 1
fi

if [ ! -f "$USER_PROFILE_CONTRACT_PATH" ]; then
  echo "Keycloak user profile contract is missing: $USER_PROFILE_CONTRACT_PATH" >&2
  exit 1
fi

require_non_empty "$KEYCLOAK_ADMIN_PASSWORD" "KEYCLOAK_ADMIN_PASSWORD"

if [ -n "$TARGET_USER_EMAIL" ] && [ -z "$TARGET_ORGANIZATION_ID" ]; then
  echo "TARGET_ORGANIZATION_ID is required when TARGET_USER_EMAIL is set" >&2
  exit 1
fi

if [ -n "$TARGET_USER_USERNAME" ] && [ -z "$TARGET_ORGANIZATION_ID" ]; then
  echo "TARGET_ORGANIZATION_ID is required when TARGET_USER_USERNAME is set" >&2
  exit 1
fi

login_admin() {
  echo "[auth] Logging into Keycloak admin API"
  run_kcadm_with_password "$KEYCLOAK_ADMIN_PASSWORD" \
    "$KCADM_BIN" config credentials \
    --server "$KEYCLOAK_SERVER_URL" \
    --realm "$KEYCLOAK_ADMIN_REALM" \
    --user "$KEYCLOAK_ADMIN_USERNAME" >/dev/null
}

get_client_uuid() {
  local client_id="$1"
  "$KCADM_BIN" get clients -r "$KEYCLOAK_REALM" -q "clientId=${client_id}" \
    | jq -r '.[0].id // empty'
}

mapper_payload_audience() {
  jq -n \
    --arg audience "$KEYCLOAK_API_AUDIENCE" \
    '{
      name: "audience-praedixa-api",
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

mapper_payload_user_attribute() {
  local mapper_name="$1"
  local user_attribute="$2"
  local claim_name="$3"
  jq -n \
    --arg name "$mapper_name" \
    --arg user_attribute "$user_attribute" \
    --arg claim_name "$claim_name" \
    '{
      name: $name,
      protocol: "openid-connect",
      protocolMapper: "oidc-usermodel-attribute-mapper",
      consentRequired: false,
      config: {
        "user.attribute": $user_attribute,
        "claim.name": $claim_name,
        "jsonType.label": "String",
        "id.token.claim": "false",
        "access.token.claim": "true",
        "userinfo.token.claim": "false",
        "introspection.token.claim": "true"
      }
    }'
}

upsert_mapper() {
  local client_id="$1"
  local mapper_name="$2"
  local payload="$3"
  local client_uuid existing_mappers mapper_id update_payload

  client_uuid="$(get_client_uuid "$client_id")"
  if [ -z "$client_uuid" ]; then
    echo "Client not found in realm ${KEYCLOAK_REALM}: ${client_id}" >&2
    exit 1
  fi

  existing_mappers="$(
    "$KCADM_BIN" get "clients/${client_uuid}/protocol-mappers/models" -r "$KEYCLOAK_REALM"
  )"
  mapper_id="$(
    printf '%s' "$existing_mappers" \
      | jq -r --arg mapper_name "$mapper_name" '
          map(select(.name == $mapper_name))
          | .[0].id // empty
        '
  )"

  if [ -n "$mapper_id" ]; then
    update_payload="$(printf '%s' "$payload" | jq --arg id "$mapper_id" '. + { id: $id }')"
    printf '%s' "$update_payload" \
      | "$KCADM_BIN" update "clients/${client_uuid}/protocol-mappers/models/${mapper_id}" \
          -r "$KEYCLOAK_REALM" -f - >/dev/null
    echo "[ok] Updated mapper ${mapper_name} on client ${client_id}"
  else
    printf '%s' "$payload" \
      | "$KCADM_BIN" create "clients/${client_uuid}/protocol-mappers/models" \
          -r "$KEYCLOAK_REALM" -f - >/dev/null
    echo "[ok] Created mapper ${mapper_name} on client ${client_id}"
  fi
}

assert_mapper() {
  local client_id="$1"
  local mapper_name="$2"
  local jq_filter="$3"
  local client_uuid mapper_count

  client_uuid="$(get_client_uuid "$client_id")"
  mapper_count="$(
    "$KCADM_BIN" get "clients/${client_uuid}/protocol-mappers/models" -r "$KEYCLOAK_REALM" \
      | jq -r --arg mapper_name "$mapper_name" "$jq_filter"
  )"

  if [ "$mapper_count" != "1" ]; then
    echo "Mapper verification failed for ${mapper_name} on ${client_id} (expected 1, got ${mapper_count})" >&2
    exit 1
  fi
}

ensure_client_contract() {
  local client_id="$1"

  upsert_mapper "$client_id" "audience-praedixa-api" "$(mapper_payload_audience)"
  upsert_mapper "$client_id" "claim-organization-id" \
    "$(mapper_payload_user_attribute "claim-organization-id" "organization_id" "organization_id")"
  upsert_mapper "$client_id" "claim-site-id" \
    "$(mapper_payload_user_attribute "claim-site-id" "site_id" "site_id")"

  assert_mapper "$client_id" "audience-praedixa-api" '
    map(
      select(
        .name == $mapper_name
        and .protocolMapper == "oidc-audience-mapper"
        and .config["included.client.audience"] != null
        and .config["access.token.claim"] == "true"
      )
    ) | length
  '
  assert_mapper "$client_id" "claim-organization-id" '
    map(
      select(
        .name == $mapper_name
        and .protocolMapper == "oidc-usermodel-attribute-mapper"
        and .config["user.attribute"] == "organization_id"
        and .config["claim.name"] == "organization_id"
        and .config["access.token.claim"] == "true"
      )
    ) | length
  '
  assert_mapper "$client_id" "claim-site-id" '
    map(
      select(
        .name == $mapper_name
        and .protocolMapper == "oidc-usermodel-attribute-mapper"
        and .config["user.attribute"] == "site_id"
        and .config["claim.name"] == "site_id"
        and .config["access.token.claim"] == "true"
      )
    ) | length
  '

  echo "[ok] Verified API access contract mappers on ${client_id}"
}

merge_user_profile_contract() {
  local current_profile desired_profile

  current_profile="$("$KCADM_BIN" get users/profile -r "$KEYCLOAK_REALM")"
  desired_profile="$(cat "$USER_PROFILE_CONTRACT_PATH")"

  printf '%s' "$current_profile" \
    | jq --argjson desired "$desired_profile" '
        .attributes = reduce ($desired.attributes // [])[] as $wanted (.attributes // [];
          if any(.[]; .name == $wanted.name)
            then map(if .name == $wanted.name then $wanted else . end)
            else . + [$wanted]
          end
        )
      '
}

ensure_user_profile_contract() {
  local merged_profile

  merged_profile="$(merge_user_profile_contract)"
  printf '%s' "$merged_profile" \
    | "$KCADM_BIN" update users/profile -r "$KEYCLOAK_REALM" -f - >/dev/null

  "$KCADM_BIN" get users/profile -r "$KEYCLOAK_REALM" \
    | jq -e '
        [ .attributes[]?.name ] as $names
        | ($names | index("organization_id")) != null
        and ($names | index("site_id")) != null
      ' >/dev/null

  echo "[ok] Verified user profile contract for realm ${KEYCLOAK_REALM}"
}

lookup_user_id() {
  local field="$1"
  local value="$2"
  "$KCADM_BIN" get users -r "$KEYCLOAK_REALM" -q "${field}=${value}" \
    | jq -r --arg field "$field" --arg value "$value" '
        map(select(((.[$field] // "") | ascii_downcase) == ($value | ascii_downcase)))
        | .[0].id // empty
      '
}

resolve_target_user_id() {
  local user_id=""

  if [ -n "$TARGET_USER_USERNAME" ]; then
    user_id="$(lookup_user_id "username" "$TARGET_USER_USERNAME")"
  fi

  if [ -z "$user_id" ] && [ -n "$TARGET_USER_EMAIL" ]; then
    user_id="$(lookup_user_id "email" "$TARGET_USER_EMAIL")"
  fi

  if [ -z "$user_id" ] && [ -n "$TARGET_USER_EMAIL" ]; then
    user_id="$(lookup_user_id "username" "$TARGET_USER_EMAIL")"
  fi

  printf '%s' "$user_id"
}

update_user_attributes() {
  local user_id="$1"
  local user_json updated_json

  user_json="$("$KCADM_BIN" get "users/${user_id}" -r "$KEYCLOAK_REALM")"
  updated_json="$(
    printf '%s' "$user_json" \
      | jq \
        --arg org_id "$TARGET_ORGANIZATION_ID" \
        --arg site_id "$TARGET_SITE_ID" '
          .attributes = (.attributes // {})
          | .attributes.organization_id = [$org_id]
          | if ($site_id | length) > 0
              then .attributes.site_id = [$site_id]
              else del(.attributes.site_id)
            end
        '
  )"

  printf '%s' "$updated_json" \
    | "$KCADM_BIN" update "users/${user_id}" -r "$KEYCLOAK_REALM" -f - >/dev/null

  "$KCADM_BIN" get "users/${user_id}" -r "$KEYCLOAK_REALM" \
    | jq -e \
      --arg org_id "$TARGET_ORGANIZATION_ID" \
      --arg site_id "$TARGET_SITE_ID" '
        (.attributes.organization_id // []) == [$org_id]
        and (
          if ($site_id | length) > 0
            then (.attributes.site_id // []) == [$site_id]
            else ((.attributes.site_id // []) | length) == 0
          end
        )
      ' >/dev/null
}

maybe_update_target_user() {
  local user_id
  if [ -z "$TARGET_USER_EMAIL" ] && [ -z "$TARGET_USER_USERNAME" ]; then
    return 0
  fi

  user_id="$(resolve_target_user_id)"
  if [ -z "$user_id" ]; then
    echo "Target user not found in realm ${KEYCLOAK_REALM}" >&2
    exit 1
  fi

  update_user_attributes "$user_id"
  echo "[ok] Updated tenant attributes for user ${TARGET_USER_EMAIL:-$TARGET_USER_USERNAME}"
}

login_admin
ensure_user_profile_contract

IFS=',' read -r -a CLIENT_IDS <<< "$KEYCLOAK_CLIENT_IDS"
for raw_client_id in "${CLIENT_IDS[@]}"; do
  client_id="${raw_client_id//[[:space:]]/}"
  if [ -z "$client_id" ]; then
    continue
  fi
  ensure_client_contract "$client_id"
done

maybe_update_target_user

echo "[ok] Keycloak API access contract is aligned for realm ${KEYCLOAK_REALM}"
