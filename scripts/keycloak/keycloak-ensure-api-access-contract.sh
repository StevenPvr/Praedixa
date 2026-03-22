#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
KCADM_BIN="${KCADM_BIN:-$SCRIPT_DIR/kcadm}"
USER_PROFILE_CONTRACT_PATH="${USER_PROFILE_CONTRACT_PATH:-$REPO_ROOT/infra/auth/user-profile-praedixa.json}"
REALM_EXPORT_PATH="${REALM_EXPORT_PATH:-$REPO_ROOT/infra/auth/realm-praedixa.json}"
source "$SCRIPT_DIR/../lib/keycloak.sh"
source "$SCRIPT_DIR/../lib/local-env.sh"

KEYCLOAK_SERVER_URL="${KEYCLOAK_SERVER_URL:-https://auth.praedixa.com}"
KEYCLOAK_ADMIN_REALM="${KEYCLOAK_ADMIN_REALM:-master}"
KEYCLOAK_ADMIN_USERNAME="${KEYCLOAK_ADMIN_USERNAME:-kcadmin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-praedixa}"
KEYCLOAK_CLIENT_IDS="${KEYCLOAK_CLIENT_IDS:-praedixa-webapp,praedixa-admin}"

TARGET_USER_EMAIL="${TARGET_USER_EMAIL:-}"
TARGET_USER_USERNAME="${TARGET_USER_USERNAME:-}"
TARGET_ROLE="${TARGET_ROLE:-}"
TARGET_ORGANIZATION_ID="${TARGET_ORGANIZATION_ID:-}"
TARGET_SITE_ID="${TARGET_SITE_ID:-}"
TARGET_PERMISSIONS="${TARGET_PERMISSIONS:-}"

KNOWN_ROLE_PRIORITY_JSON='["super_admin","org_admin","hr_manager","manager","employee","viewer"]'

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

if [ ! -f "$REALM_EXPORT_PATH" ]; then
  echo "Keycloak realm export is missing: $REALM_EXPORT_PATH" >&2
  exit 1
fi

autofill_keycloak_admin_password_from_local_env "$REPO_ROOT"
require_non_empty "$KEYCLOAK_ADMIN_PASSWORD" "KEYCLOAK_ADMIN_PASSWORD"

if [ -n "$TARGET_USER_EMAIL" ] && [ -z "$TARGET_ORGANIZATION_ID" ]; then
  echo "TARGET_ORGANIZATION_ID is required when TARGET_USER_EMAIL is set" >&2
  exit 1
fi

if [ -n "$TARGET_USER_USERNAME" ] && [ -z "$TARGET_ORGANIZATION_ID" ]; then
  echo "TARGET_ORGANIZATION_ID is required when TARGET_USER_USERNAME is set" >&2
  exit 1
fi

if [ -n "$TARGET_ROLE" ]; then
  if ! printf '%s' "$KNOWN_ROLE_PRIORITY_JSON" \
    | jq -e --arg role "$TARGET_ROLE" 'index($role) != null' >/dev/null; then
    echo "TARGET_ROLE must be one of the canonical roles in ${KNOWN_ROLE_PRIORITY_JSON}" >&2
    exit 1
  fi
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

normalize_mapper_payload() {
  jq -cS '{name, protocol, protocolMapper, consentRequired, config}'
}

read_realm_mapper_payload() {
  local client_id="$1"
  local mapper_name="$2"
  local payload

  payload="$(
    jq -ce \
      --arg client_id "$client_id" \
      --arg mapper_name "$mapper_name" '
        .clients // []
        | map(select(.clientId == $client_id))
        | .[0].protocolMappers // []
        | map(select(.name == $mapper_name))
        | .[0]
      ' "$REALM_EXPORT_PATH"
  )"

  if [ -z "$payload" ] || [ "$payload" = "null" ]; then
    echo "Mapper ${mapper_name} is missing from versioned realm export for client ${client_id}" >&2
    exit 1
  fi

  printf '%s' "$payload"
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

assert_mapper_matches_realm_export() {
  local client_id="$1"
  local mapper_name="$2"
  local client_uuid actual_mapper expected_mapper

  client_uuid="$(get_client_uuid "$client_id")"
  actual_mapper="$(
    "$KCADM_BIN" get "clients/${client_uuid}/protocol-mappers/models" -r "$KEYCLOAK_REALM" \
      | jq -ce --arg mapper_name "$mapper_name" '
          map(select(.name == $mapper_name))
          | .[0]
          | {name, protocol, protocolMapper, consentRequired, config}
        '
  )"

  if [ -z "$actual_mapper" ] || [ "$actual_mapper" = "null" ]; then
    echo "Mapper verification failed for ${mapper_name} on ${client_id}: mapper missing live" >&2
    exit 1
  fi

  expected_mapper="$(
    read_realm_mapper_payload "$client_id" "$mapper_name" | normalize_mapper_payload
  )"

  actual_mapper="$(printf '%s' "$actual_mapper" | normalize_mapper_payload)"

  if [ "$actual_mapper" != "$expected_mapper" ]; then
    echo "Mapper verification failed for ${mapper_name} on ${client_id}: live config drift detected" >&2
    exit 1
  fi
}

get_required_mapper_names() {
  local client_id="$1"

  printf '%s\n' \
    "audience-praedixa-api" \
    "claim-role" \
    "claim-organization-id" \
    "claim-site-id"

  if [ "$client_id" = "praedixa-admin" ]; then
    printf '%s\n' "claim-permissions"
    printf '%s\n' "claim-amr"
  fi
}

ensure_client_contract() {
  local client_id="$1"
  local mapper_name payload

  while IFS= read -r mapper_name; do
    [ -n "$mapper_name" ] || continue
    payload="$(read_realm_mapper_payload "$client_id" "$mapper_name")"
    upsert_mapper "$client_id" "$mapper_name" "$payload"
    assert_mapper_matches_realm_export "$client_id" "$mapper_name"
  done < <(get_required_mapper_names "$client_id")

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
        | ($names | index("role")) != null
        and ($names | index("organization_id")) != null
        and ($names | index("site_id")) != null
        and ($names | index("permissions")) != null
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

resolve_target_role() {
  local user_id="$1"

  if [ -n "$TARGET_ROLE" ]; then
    printf '%s' "$TARGET_ROLE"
    return 0
  fi

  "$KCADM_BIN" get "users/${user_id}/role-mappings/realm" -r "$KEYCLOAK_REALM" \
    | jq -r --argjson priority "$KNOWN_ROLE_PRIORITY_JSON" '
        [ .[]?.name ] as $assigned
        | $priority
        | map(select(. as $role | $assigned | index($role) != null))
        | .[0] // empty
      '
}

permissions_json_from_csv() {
  local raw="$1"
  printf '%s' "$raw" \
    | jq -R '
        split(",")
        | map(ascii_downcase | gsub("^\\s+|\\s+$"; ""))
        | map(select(length > 0))
        | unique
      '
}

update_user_attributes() {
  local user_id="$1"
  local target_role="$2"
  local permissions_json="$3"
  local permissions_override="$4"
  local user_json updated_json

  user_json="$("$KCADM_BIN" get "users/${user_id}" -r "$KEYCLOAK_REALM")"
  updated_json="$(
    printf '%s' "$user_json" \
      | jq \
        --arg role "$target_role" \
        --arg org_id "$TARGET_ORGANIZATION_ID" \
        --arg site_id "$TARGET_SITE_ID" \
        --argjson permissions "$permissions_json" \
        --arg permissions_override "$permissions_override" '
          .attributes = (.attributes // {})
          | .attributes.role = [$role]
          | .attributes.organization_id = [$org_id]
          | if ($site_id | length) > 0
              then .attributes.site_id = [$site_id]
              else del(.attributes.site_id)
            end
          | if $permissions_override == "true"
              then .attributes.permissions = $permissions
              else .
            end
        '
  )"

  printf '%s' "$updated_json" \
    | "$KCADM_BIN" update "users/${user_id}" -r "$KEYCLOAK_REALM" -f - >/dev/null

  "$KCADM_BIN" get "users/${user_id}" -r "$KEYCLOAK_REALM" \
    | jq -e \
      --arg role "$target_role" \
      --arg org_id "$TARGET_ORGANIZATION_ID" \
      --arg site_id "$TARGET_SITE_ID" \
      --argjson permissions "$permissions_json" \
      --arg permissions_override "$permissions_override" '
        (.attributes.role // []) == [$role]
        and (.attributes.organization_id // []) == [$org_id]
        and (
          if ($site_id | length) > 0
            then (.attributes.site_id // []) == [$site_id]
            else ((.attributes.site_id // []) | length) == 0
          end
        )
        and (
          if $permissions_override == "true"
            then (.attributes.permissions // []) == $permissions
            else true
          end
        )
      ' >/dev/null
}

maybe_update_target_user() {
  local user_id target_role permissions_json permissions_override
  if [ -z "$TARGET_USER_EMAIL" ] && [ -z "$TARGET_USER_USERNAME" ]; then
    return 0
  fi

  user_id="$(resolve_target_user_id)"
  if [ -z "$user_id" ]; then
    echo "Target user not found in realm ${KEYCLOAK_REALM}" >&2
    exit 1
  fi

  target_role="$(resolve_target_role "$user_id")"
  if [ -z "$target_role" ]; then
    echo "Unable to derive canonical role for target user ${TARGET_USER_EMAIL:-$TARGET_USER_USERNAME}; set TARGET_ROLE explicitly or assign a known realm role first" >&2
    exit 1
  fi

  permissions_json='[]'
  permissions_override='false'
  if [ -n "$TARGET_PERMISSIONS" ]; then
    permissions_json="$(permissions_json_from_csv "$TARGET_PERMISSIONS")"
    permissions_override='true'
  fi

  update_user_attributes "$user_id" "$target_role" "$permissions_json" "$permissions_override"
  echo "[ok] Updated canonical token attributes for user ${TARGET_USER_EMAIL:-$TARGET_USER_USERNAME} (role ${target_role})"
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
