#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

WORKFLOW=""
EVENT_NAME=""
BASE_SHA=""
HEAD_SHA=""
OUTPUT_PATH=""
CHANGED_FILES_PATH=""

usage() {
  cat <<'EOF' >&2
Usage: scripts/gates/ci-evaluate-scope.sh \
  --workflow <api|admin> \
  --event-name <event> \
  --base-sha <sha> \
  --head-sha <sha> \
  --output-path <path> \
  [--repo-root <path>] \
  [--changed-files-path <path>]
EOF
  exit 2
}

while (($# > 0)); do
  case "$1" in
    --workflow)
      WORKFLOW="${2:-}"
      shift 2
      ;;
    --event-name)
      EVENT_NAME="${2:-}"
      shift 2
      ;;
    --base-sha)
      BASE_SHA="${2:-}"
      shift 2
      ;;
    --head-sha)
      HEAD_SHA="${2:-}"
      shift 2
      ;;
    --output-path)
      OUTPUT_PATH="${2:-}"
      shift 2
      ;;
    --repo-root)
      ROOT_DIR="${2:-}"
      shift 2
      ;;
    --changed-files-path)
      CHANGED_FILES_PATH="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      ;;
  esac
done

if [[ -z "$WORKFLOW" || -z "$EVENT_NAME" || -z "$HEAD_SHA" || -z "$OUTPUT_PATH" ]]; then
  usage
fi

case "$WORKFLOW" in
  api|admin) ;;
  *)
    echo "Unsupported workflow '$WORKFLOW' (expected api|admin)" >&2
    exit 2
    ;;
esac

cd "$ROOT_DIR"

if [[ -z "$CHANGED_FILES_PATH" ]]; then
  CHANGED_FILES_PATH="$(mktemp)"
  trap 'rm -f "$CHANGED_FILES_PATH"' EXIT
fi

write_output() {
  local key="$1"
  local value="$2"
  printf '%s=%s\n' "$key" "$value" >>"$OUTPUT_PATH"
}

resolve_base_sha() {
  local base_sha="$1"
  local head_sha="$2"
  if [[ -n "$base_sha" && "$base_sha" != "0000000000000000000000000000000000000000" ]]; then
    printf '%s\n' "$base_sha"
    return
  fi
  git rev-list --max-parents=0 "$head_sha" | tail -n 1
}

matches_scope() {
  local pattern="$1"
  grep -Eq "$pattern" "$CHANGED_FILES_PATH"
}

ROOT_CONFIG_GROUP='package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|turbo\.json|tsconfig(\.base)?\.json|eslint\.config\.js'
CRITICAL_CI_SCRIPT_GROUP='scripts/((gates/(ci-[^/]+\.sh|gate-exhaustive-local\.sh|verify-gate-report\.sh))|(scw/(scw-release-(build|deploy|manifest-create|promote)\.sh|scw-preflight-(deploy|staging)\.sh|scw-post-deploy-smoke\.sh|scw-deploy-(landing|frontend|api|auth)\.sh|scw-configure-(landing|frontend|api|auth|centaurus|greekia|skolae)-env\.sh)))'

API_RELEVANT_SCOPE="^(\\.github/workflows/ci-api\\.yml|testing/vitest\\.setup\\.ts|${ROOT_CONFIG_GROUP}|${CRITICAL_CI_SCRIPT_GROUP}|app-api/|app-api-ts/|contracts/|packages/shared-types/|infra/auth/)"
API_DATA_ENGINE_SCOPE="^(\\.github/workflows/ci-api\\.yml|${ROOT_CONFIG_GROUP}|scripts/gates/ci-python-tool\\.sh|app-api/)"
API_ARCHITECTURE_SCOPE="^(\\.github/workflows/ci-api\\.yml|${ROOT_CONFIG_GROUP}|\\.dependency-cruiser\\.api\\.cjs|${CRITICAL_CI_SCRIPT_GROUP}|app-api-ts/|app-connectors/|packages/shared-types/|contracts/|infra/auth/)"

ADMIN_RELEVANT_SCOPE="^(\\.github/workflows/ci-admin\\.yml|testing/vitest\\.setup\\.ts|${ROOT_CONFIG_GROUP}|${CRITICAL_CI_SCRIPT_GROUP}|app-admin/|packages/shared-types/|packages/ui/|infra/auth/)"
ADMIN_ARCHITECTURE_SCOPE="^(\\.github/workflows/ci-admin\\.yml|${ROOT_CONFIG_GROUP}|\\.dependency-cruiser\\.cjs|knip\\.json|${CRITICAL_CI_SCRIPT_GROUP}|app-landing/|app-webapp/|app-admin/|packages/shared-types/|packages/ui/|infra/auth/)"

if [[ "$EVENT_NAME" == "workflow_dispatch" ]]; then
  write_output "relevant" "true"
  write_output "reason" "manual_dispatch"
  if [[ "$WORKFLOW" == "api" ]]; then
    write_output "data_engine_relevant" "true"
    write_output "data_engine_reason" "manual_dispatch"
  fi
  write_output "architecture_relevant" "true"
  write_output "architecture_reason" "manual_dispatch"
  exit 0
fi

BASE_SHA="$(resolve_base_sha "$BASE_SHA" "$HEAD_SHA")"
git diff --name-only "$BASE_SHA" "$HEAD_SHA" | tee "$CHANGED_FILES_PATH"

if [[ "$WORKFLOW" == "api" ]]; then
  if matches_scope "$API_RELEVANT_SCOPE"; then
    write_output "relevant" "true"
    write_output "reason" "api_or_ci_critical_paths_changed"
  else
    write_output "relevant" "false"
    write_output "reason" "no_api_or_ci_critical_paths_changed"
  fi

  if matches_scope "$API_DATA_ENGINE_SCOPE"; then
    write_output "data_engine_relevant" "true"
    write_output "data_engine_reason" "data_engine_or_ci_tooling_changed"
  else
    write_output "data_engine_relevant" "false"
    write_output "data_engine_reason" "no_data_engine_or_ci_tooling_changed"
  fi

  if matches_scope "$API_ARCHITECTURE_SCOPE"; then
    write_output "architecture_relevant" "true"
    write_output "architecture_reason" "api_runtime_or_ci_critical_paths_changed"
    exit 0
  fi

  write_output "architecture_relevant" "false"
  write_output "architecture_reason" "no_api_runtime_or_ci_critical_paths_changed"
  exit 0
fi

if matches_scope "$ADMIN_RELEVANT_SCOPE"; then
  write_output "relevant" "true"
  write_output "reason" "admin_or_ci_critical_paths_changed"
else
  write_output "relevant" "false"
  write_output "reason" "no_admin_or_ci_critical_paths_changed"
fi

if matches_scope "$ADMIN_ARCHITECTURE_SCOPE"; then
  write_output "architecture_relevant" "true"
  write_output "architecture_reason" "frontend_monorepo_or_ci_critical_paths_changed"
  exit 0
fi

write_output "architecture_relevant" "false"
write_output "architecture_reason" "no_frontend_monorepo_or_ci_critical_paths_changed"
