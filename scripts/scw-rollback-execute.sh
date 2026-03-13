#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/json-log.sh"

SCRIPT_NAME="$(basename "$0")"
SCRIPT_SERVICE="release-rollback"

CURRENT_MANIFEST=""
PREVIOUS_MANIFEST=""
MANIFEST_DIR=""
ENVIRONMENT=""
SERVICES=""
KEY_PATH="${PRAEDIXA_RELEASE_KEY_PATH:-${HOME}/.praedixa/release-manifest.key}"
RUN_SMOKE=0
DRY_RUN=0
LANDING_URL=""
AUTH_URL=""
CONNECTORS_URL=""
declare -a TARGET_OVERRIDES=()

usage() {
  cat >&2 <<'EOF'
Usage: ./scripts/scw-rollback-execute.sh \
  --current-manifest <path> \
  --env <staging|prod> \
  [--previous-manifest <path> | --manifest-dir <dir>] \
  [--services <comma-separated>] \
  [--target <service>=<container-name>[@region>] ...] \
  [--run-smoke] \
  [--landing-url <url>] \
  [--auth-url <url>] \
  [--connectors-url <url>] \
  [--dry-run] \
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

build_plan_command() {
  PLAN_CMD=(
    "$SCRIPT_DIR/scw-rollback-plan.sh"
    --current-manifest "$CURRENT_MANIFEST"
    --env "$ENVIRONMENT"
    --key-file "$KEY_PATH"
    --format json
  )

  if [[ -n "$PREVIOUS_MANIFEST" ]]; then
    PLAN_CMD+=(--previous-manifest "$PREVIOUS_MANIFEST")
  fi
  if [[ -n "$MANIFEST_DIR" ]]; then
    PLAN_CMD+=(--manifest-dir "$MANIFEST_DIR")
  fi
  if [[ -n "$SERVICES" ]]; then
    PLAN_CMD+=(--services "$SERVICES")
  fi
  if [[ "${#TARGET_OVERRIDES[@]}" -gt 0 ]]; then
    local target
    for target in "${TARGET_OVERRIDES[@]}"; do
      PLAN_CMD+=(--target "$target")
    done
  fi
}

build_smoke_command() {
  SMOKE_CMD=(
    "$SCRIPT_DIR/scw-post-deploy-smoke.sh"
    --env "$ENVIRONMENT"
    --services "$ROLLBACK_SERVICES"
  )

  if [[ -n "$LANDING_URL" ]]; then
    SMOKE_CMD+=(--landing-url "$LANDING_URL")
  fi
  if [[ -n "$AUTH_URL" ]]; then
    SMOKE_CMD+=(--auth-url "$AUTH_URL")
  fi
  if [[ -n "$CONNECTORS_URL" ]]; then
    SMOKE_CMD+=(--connectors-url "$CONNECTORS_URL")
  fi
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
    --run-smoke)
      RUN_SMOKE=1
      shift
      ;;
    --landing-url)
      LANDING_URL="${2:-}"
      shift 2
      ;;
    --auth-url)
      AUTH_URL="${2:-}"
      shift 2
      ;;
    --connectors-url)
      CONNECTORS_URL="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
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

require_cmd jq

build_plan_command
PLAN_JSON="$("${PLAN_CMD[@]}")"

ROLLBACK_MANIFEST="$(printf '%s' "$PLAN_JSON" | jq -r '.rollback_manifest.path')"
ROLLBACK_SERVICES="$(printf '%s' "$PLAN_JSON" | jq -r '.services | join(",")')"

DEPLOY_CMD=(
  "$SCRIPT_DIR/scw-release-deploy.sh"
  --manifest "$ROLLBACK_MANIFEST"
  --env "$ENVIRONMENT"
  --services "$ROLLBACK_SERVICES"
  --key-file "$KEY_PATH"
)

build_smoke_command

if [[ "$DRY_RUN" -eq 1 ]]; then
  json_log::emit \
    info \
    release_rollback.dry_run \
    "Rollback dry-run generated" \
    environment="$ENVIRONMENT" \
    rollback_manifest="$(basename "$ROLLBACK_MANIFEST")" \
    services="$ROLLBACK_SERVICES"
  printf '%s\n' "$PLAN_JSON"
  printf 'Deploy command:\n  %q' "${DEPLOY_CMD[0]}"
  if [[ "${#DEPLOY_CMD[@]}" -gt 1 ]]; then
    printf ' %q' "${DEPLOY_CMD[@]:1}"
  fi
  printf '\n'
  if [[ "$RUN_SMOKE" -eq 1 ]]; then
    printf 'Smoke command:\n  %q' "${SMOKE_CMD[0]}"
    if [[ "${#SMOKE_CMD[@]}" -gt 1 ]]; then
      printf ' %q' "${SMOKE_CMD[@]:1}"
    fi
    printf '\n'
  fi
  exit 0
fi

json_log::emit \
  info \
  release_rollback.started \
  "Rollback execution started" \
  environment="$ENVIRONMENT" \
  rollback_manifest="$(basename "$ROLLBACK_MANIFEST")" \
  services="$ROLLBACK_SERVICES"

"${DEPLOY_CMD[@]}"

if [[ "$RUN_SMOKE" -eq 1 ]]; then
  "${SMOKE_CMD[@]}"
fi

json_log::emit \
  info \
  release_rollback.completed \
  "Rollback execution completed" \
  environment="$ENVIRONMENT" \
  rollback_manifest="$(basename "$ROLLBACK_MANIFEST")" \
  services="$ROLLBACK_SERVICES"
