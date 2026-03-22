#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/../lib/json-log.sh"

SCRIPT_NAME="$(basename "$0")"
SCRIPT_SERVICE="release-rollback"

CURRENT_MANIFEST=""
PREVIOUS_MANIFEST=""
MANIFEST_DIR=""
ENVIRONMENT=""
SERVICES=""
KEY_PATH="${PRAEDIXA_RELEASE_KEY_PATH:-${HOME}/.praedixa/release-manifest.key}"
FORMAT="summary"
ROLLBACK_TARGETS_PATH="$REPO_ROOT/docs/deployment/rollback-targets.json"
declare -a TARGET_OVERRIDES=()

usage() {
  cat >&2 <<'EOF'
Usage: ./scripts/scw/scw-rollback-plan.sh \
  --current-manifest <path> \
  --env <staging|prod> \
  [--previous-manifest <path> | --manifest-dir <dir>] \
  [--services <comma-separated>] \
  [--target <service>=<container-name>[@region>] ...] \
  [--format <summary|json>] \
  [--key-file <path>]
EOF
  exit 2
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

canonical_path() {
  local value="$1"
  local parent
  parent="$(cd "$(dirname "$value")" && pwd)"
  printf '%s/%s\n' "$parent" "$(basename "$value")"
}

normalize_csv() {
  printf '%s' "$1" | tr ',' '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | awk 'NF'
}

verify_manifest() {
  local manifest_path="$1"
  "$SCRIPT_DIR/release-manifest-verify.sh" \
    --manifest "$manifest_path" \
    --key-file "$KEY_PATH" >/dev/null
}

manifest_value() {
  local manifest_path="$1"
  local jq_filter="$2"
  jq -r "$jq_filter" "$manifest_path"
}

inventory_target_json() {
  local service="$1"
  jq -c \
    --arg env "$ENVIRONMENT" \
    --arg service "$service" \
    '.environments[$env][$service] // {}' \
    "$ROLLBACK_TARGETS_PATH"
}

manifest_target_json() {
  local manifest_path="$1"
  local service="$2"
  jq -c \
    --arg env "$ENVIRONMENT" \
    --arg service "$service" \
    '.targets[$env][$service] // {}' \
    "$manifest_path"
}

override_target_json() {
  local service="$1"
  local entry service_name raw_target container_name region

  for entry in "${TARGET_OVERRIDES[@]}"; do
    service_name="${entry%%=*}"
    raw_target="${entry#*=}"
    if [[ "$service_name" != "$service" ]]; then
      continue
    fi

    container_name="${raw_target%@*}"
    region="fr-par"
    if [[ "$raw_target" == *"@"* ]]; then
      region="${raw_target##*@}"
    fi

    jq -cn \
      --arg container_name "$container_name" \
      --arg region "$region" \
      '{ container_name: $container_name, region: $region }'
    return 0
  done

  return 1
}

resolve_target_json() {
  local manifest_path="$1"
  local service="$2"
  local manifest_target inventory_target container_name region requires_override override_target

  manifest_target="$(manifest_target_json "$manifest_path" "$service")"
  container_name="$(printf '%s' "$manifest_target" | jq -r '.container_name // ""')"
  region="$(printf '%s' "$manifest_target" | jq -r '.region // ""')"
  if [[ -n "$container_name" && -n "$region" ]]; then
    printf '%s\n' "$manifest_target"
    return 0
  fi

  override_target="$(override_target_json "$service" || true)"
  if [[ -n "$override_target" ]]; then
    printf '%s\n' "$override_target"
    return 0
  fi

  inventory_target="$(inventory_target_json "$service")"
  requires_override="$(printf '%s' "$inventory_target" | jq -r '.requires_target_override // false')"
  container_name="$(printf '%s' "$inventory_target" | jq -r '.container_name // ""')"
  region="$(printf '%s' "$inventory_target" | jq -r '.region // ""')"

  if [[ "$requires_override" == "true" ]]; then
    return 1
  fi

  if [[ -n "$container_name" && -n "$region" ]]; then
    jq -cn \
      --arg container_name "$container_name" \
      --arg region "$region" \
      '{ container_name: $container_name, region: $region }'
    return 0
  fi

  return 1
}

collect_services() {
  if [[ -n "$SERVICES" ]]; then
    normalize_csv "$SERVICES"
    return
  fi

  jq -r \
    --arg env "$ENVIRONMENT" \
    '.targets[$env] | keys[]?' \
    "$CURRENT_MANIFEST"
}

build_plan_json() {
  local current_path="$1"
  local rollback_path="$2"
  local services_json="$3"
  local targets_json="$4"

  jq -cn \
    --arg environment "$ENVIRONMENT" \
    --arg current_path "$current_path" \
    --arg rollback_path "$rollback_path" \
    --arg current_release_id "$(manifest_value "$current_path" '.release_id // ""')" \
    --arg rollback_release_id "$(manifest_value "$rollback_path" '.release_id // ""')" \
    --arg current_commit_sha "$(manifest_value "$current_path" '.commit_sha // ""')" \
    --arg rollback_commit_sha "$(manifest_value "$rollback_path" '.commit_sha // ""')" \
    --argjson services "$services_json" \
    --argjson targets "$targets_json" \
    '{
      environment: $environment,
      current_manifest: {
        path: $current_path,
        release_id: $current_release_id,
        commit_sha: $current_commit_sha
      },
      rollback_manifest: {
        path: $rollback_path,
        release_id: $rollback_release_id,
        commit_sha: $rollback_commit_sha
      },
      services: $services,
      targets: $targets
    }'
}

emit_summary() {
  local plan_json="$1"
  local rollback_manifest services_csv

  rollback_manifest="$(printf '%s' "$plan_json" | jq -r '.rollback_manifest.path')"
  services_csv="$(printf '%s' "$plan_json" | jq -r '.services | join(",")')"

  cat <<EOF
Rollback plan ready
Environment: $(printf '%s' "$plan_json" | jq -r '.environment')
Current manifest: $(printf '%s' "$plan_json" | jq -r '.current_manifest.path')
Rollback manifest: $rollback_manifest
Services: $services_csv
Deploy command:
  ./scripts/scw/scw-release-deploy.sh --manifest "$rollback_manifest" --env "$(printf '%s' "$plan_json" | jq -r '.environment')" --services "$services_csv"
EOF
}

find_previous_manifest() {
  local current_path="$1"
  local current_created_at current_release_id best_path="" best_created_at=""
  local candidate_path candidate_created_at candidate_release_id

  current_created_at="$(manifest_value "$current_path" '.created_at // ""')"
  current_release_id="$(manifest_value "$current_path" '.release_id // ""')"

  while IFS= read -r candidate_path || [[ -n "$candidate_path" ]]; do
    if [[ -z "$candidate_path" ]]; then
      continue
    fi

    candidate_path="$(canonical_path "$candidate_path")"
    if [[ "$candidate_path" == "$current_path" ]]; then
      continue
    fi

    if ! verify_manifest "$candidate_path" 2>/dev/null; then
      continue
    fi

    candidate_release_id="$(manifest_value "$candidate_path" '.release_id // ""')"
    candidate_created_at="$(manifest_value "$candidate_path" '.created_at // ""')"

    if [[ -n "$current_release_id" && "$candidate_release_id" == "$current_release_id" ]]; then
      continue
    fi

    if [[ -n "$current_created_at" && -n "$candidate_created_at" && "$candidate_created_at" > "$current_created_at" ]]; then
      continue
    fi

    if supports_manifest_for_requested_services "$candidate_path"; then
      if [[ -z "$best_path" || "$candidate_created_at" > "$best_created_at" ]]; then
        best_path="$candidate_path"
        best_created_at="$candidate_created_at"
      fi
    fi
  done < <(find "$MANIFEST_DIR" -type f -name '*.json' | sort)

  if [[ -z "$best_path" ]]; then
    echo "Unable to locate a previous signed manifest in ${MANIFEST_DIR}" >&2
    exit 1
  fi

  printf '%s\n' "$best_path"
}

supports_manifest_for_requested_services() {
  local manifest_path="$1"
  local service registry_image

  while IFS= read -r service || [[ -n "$service" ]]; do
    if [[ -z "$service" ]]; then
      continue
    fi

    registry_image="$(jq -r --arg service "$service" '.images[$service].registry_image // ""' "$manifest_path")"
    if [[ -z "$registry_image" ]]; then
      return 1
    fi

    if ! resolve_target_json "$manifest_path" "$service" >/dev/null 2>&1; then
      return 1
    fi
  done <<<"$REQUESTED_SERVICES_LINES"

  return 0
}

while (($# > 0)); do
  case "$1" in
    --current-manifest)
      CURRENT_MANIFEST="${2:-}"
      shift 2
      ;;
    --previous-manifest)
      PREVIOUS_MANIFEST="${2:-}"
      shift 2
      ;;
    --manifest-dir)
      MANIFEST_DIR="${2:-}"
      shift 2
      ;;
    --env)
      ENVIRONMENT="${2:-}"
      shift 2
      ;;
    --services)
      SERVICES="${2:-}"
      shift 2
      ;;
    --target)
      TARGET_OVERRIDES+=("${2:-}")
      shift 2
      ;;
    --format)
      FORMAT="${2:-}"
      shift 2
      ;;
    --key-file)
      KEY_PATH="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      ;;
  esac
done

if [[ -z "$CURRENT_MANIFEST" || -z "$ENVIRONMENT" ]]; then
  usage
fi

if [[ -n "$PREVIOUS_MANIFEST" && -n "$MANIFEST_DIR" ]]; then
  echo "Use either --previous-manifest or --manifest-dir, not both" >&2
  exit 1
fi

if [[ -z "$PREVIOUS_MANIFEST" && -z "$MANIFEST_DIR" ]]; then
  echo "Provide --previous-manifest or --manifest-dir" >&2
  exit 1
fi

case "$ENVIRONMENT" in
  staging | prod) ;;
  *)
    echo "Unsupported environment: $ENVIRONMENT" >&2
    exit 1
    ;;
esac

case "$FORMAT" in
  summary | json) ;;
  *)
    echo "Unsupported format: $FORMAT" >&2
    exit 1
    ;;
esac

require_cmd jq

CURRENT_MANIFEST="$(canonical_path "$CURRENT_MANIFEST")"
if [[ ! -f "$CURRENT_MANIFEST" ]]; then
  echo "Current manifest not found: $CURRENT_MANIFEST" >&2
  exit 1
fi
if [[ ! -f "$ROLLBACK_TARGETS_PATH" ]]; then
  echo "Rollback target inventory not found: $ROLLBACK_TARGETS_PATH" >&2
  exit 1
fi

verify_manifest "$CURRENT_MANIFEST"

REQUESTED_SERVICES_LINES="$(collect_services)"
if [[ -z "$REQUESTED_SERVICES_LINES" ]]; then
  echo "Unable to resolve rollback services for ${ENVIRONMENT}" >&2
  exit 1
fi

if [[ -n "$PREVIOUS_MANIFEST" ]]; then
  PREVIOUS_MANIFEST="$(canonical_path "$PREVIOUS_MANIFEST")"
  if [[ ! -f "$PREVIOUS_MANIFEST" ]]; then
    echo "Previous manifest not found: $PREVIOUS_MANIFEST" >&2
    exit 1
  fi
  verify_manifest "$PREVIOUS_MANIFEST"
  if ! supports_manifest_for_requested_services "$PREVIOUS_MANIFEST"; then
    echo "Previous manifest does not satisfy the requested services/targets for rollback" >&2
    exit 1
  fi
else
  if [[ ! -d "$MANIFEST_DIR" ]]; then
    echo "Manifest directory not found: $MANIFEST_DIR" >&2
    exit 1
  fi
  PREVIOUS_MANIFEST="$(find_previous_manifest "$CURRENT_MANIFEST")"
fi

TARGETS_JSON='{}'
SERVICES_JSON='[]'

while IFS= read -r service || [[ -n "$service" ]]; do
  local_target_json="$(resolve_target_json "$PREVIOUS_MANIFEST" "$service" || true)"
  if [[ -z "$local_target_json" ]]; then
    echo "No rollback target metadata found for service=${service} env=${ENVIRONMENT}. Add --target ${service}=<container-name>[@region] or version the target in docs/deployment/rollback-targets.json." >&2
    exit 1
  fi

  TARGETS_JSON="$(
    jq -cn \
      --argjson base "$TARGETS_JSON" \
      --arg service "$service" \
      --argjson target "$local_target_json" \
      '$base + { ($service): $target }'
  )"
  SERVICES_JSON="$(
    jq -cn \
      --argjson base "$SERVICES_JSON" \
      --arg service "$service" \
      '$base + [$service]'
  )"
done <<<"$REQUESTED_SERVICES_LINES"

PLAN_JSON="$(build_plan_json "$CURRENT_MANIFEST" "$PREVIOUS_MANIFEST" "$SERVICES_JSON" "$TARGETS_JSON")"
json_log::emit \
  info \
  release_rollback.plan_ready \
  "Rollback plan computed" \
  environment="$ENVIRONMENT" \
  current_manifest="$(basename "$CURRENT_MANIFEST")" \
  rollback_manifest="$(basename "$PREVIOUS_MANIFEST")" \
  services="$(printf '%s' "$SERVICES_JSON" | jq -r 'join(",")')"

if [[ "$FORMAT" = "json" ]]; then
  printf '%s\n' "$PLAN_JSON"
  exit 0
fi

emit_summary "$PLAN_JSON"
