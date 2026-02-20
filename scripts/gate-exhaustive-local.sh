#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MODE="manual"
REPORT_PATH=""
GATE_ALLOW_MISSING_TOOLS="${GATE_ALLOW_MISSING_TOOLS:-0}"
DRY_RUN="0"
CONFIG_PATH="${ROOT_DIR}/scripts/gate.config.yaml"

while (($# > 0)); do
  case "$1" in
    --mode)
      MODE="${2:-manual}"
      shift 2
      ;;
    --report-path)
      REPORT_PATH="${2:-}"
      shift 2
      ;;
    --allow-missing-tools)
      GATE_ALLOW_MISSING_TOOLS="1"
      shift
      ;;
    --dry-run)
      DRY_RUN="1"
      shift
      ;;
    *)
      echo "[gate] Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

if ! command -v jq >/dev/null 2>&1; then
  echo "[gate] Missing jq" >&2
  exit 1
fi

COMMIT_SHA="$(git rev-parse HEAD)"
TIMESTAMP_EPOCH="$(date +%s)"
TIMESTAMP_ISO="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

REPORT_DIR="${ROOT_DIR}/.git/gate-reports"
ARTIFACT_DIR="${REPORT_DIR}/artifacts"
mkdir -p "$REPORT_DIR" "$ARTIFACT_DIR" "${ROOT_DIR}/.git/gate-work"

if [[ -z "$REPORT_PATH" ]]; then
  REPORT_PATH="${REPORT_DIR}/${COMMIT_SHA}.json"
fi

CHECKS_FILE="$(mktemp)"
FAILED_COUNT=0
TOTAL_COUNT=0

cleanup() {
  rm -f "$CHECKS_FILE"
}
trap cleanup EXIT

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

assert_required_tool() {
  local tool="$1"
  if has_cmd "$tool"; then
    return 0
  fi
  if [[ "$GATE_ALLOW_MISSING_TOOLS" == "1" ]]; then
    echo "[gate] WARN: missing optional tool (allowed): ${tool}"
    return 0
  fi
  echo "[gate] Missing required tool: ${tool}" >&2
  return 1
}

tool_version() {
  local cmd="$1"
  local fallback="${2:-missing}"
  if ! has_cmd "$cmd"; then
    printf '%s' "$fallback"
    return
  fi
  (
    set +e
    "$cmd" --version 2>/dev/null | head -n 1 | tr -d '\r'
  ) || true
}

record_check() {
  local id="$1"
  local category="$2"
  local severity="$3"
  local status="$4"
  local exit_code="$5"
  local command="$6"
  local started_at="$7"
  local finished_at="$8"
  local duration_ms="$9"

  jq -cn \
    --arg id "$id" \
    --arg category "$category" \
    --arg severity_floor "$severity" \
    --arg status "$status" \
    --arg command "$command" \
    --arg started_at "$started_at" \
    --arg finished_at "$finished_at" \
    --argjson duration_ms "$duration_ms" \
    --argjson exit_code "$exit_code" \
    '{
      id: $id,
      category: $category,
      severity_floor: $severity_floor,
      status: $status,
      command: $command,
      started_at: $started_at,
      finished_at: $finished_at,
      duration_ms: $duration_ms,
      exit_code: $exit_code
    }' >>"$CHECKS_FILE"
}

run_check() {
  local id="$1"
  local category="$2"
  local severity="$3"
  local command="$4"

  TOTAL_COUNT=$((TOTAL_COUNT + 1))
  local started_at
  local finished_at
  local start_s
  local end_s
  started_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  start_s="$(date +%s)"

  echo "[gate] (${TOTAL_COUNT}) ${id}"
  local rc=0
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[gate] DRY RUN: ${command}"
  else
    set +e
    (
      cd "$ROOT_DIR"
      eval "$command"
    )
    rc=$?
    set -e
  fi

  end_s="$(date +%s)"
  finished_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  local duration_ms="$(((end_s - start_s) * 1000))"

  if [[ $rc -eq 0 ]]; then
    record_check "$id" "$category" "$severity" "pass" "$rc" "$command" "$started_at" "$finished_at" "$duration_ms"
  else
    FAILED_COUNT=$((FAILED_COUNT + 1))
    record_check "$id" "$category" "$severity" "fail" "$rc" "$command" "$started_at" "$finished_at" "$duration_ms"
  fi
}

echo "[gate] mode=${MODE} sha=${COMMIT_SHA} strict_missing_tools=$((1 - GATE_ALLOW_MISSING_TOOLS)) dry_run=${DRY_RUN}"

run_check "tooling:codeql-installed" "tooling" "low" "assert_required_tool codeql"
run_check "tooling:osv-scanner-installed" "tooling" "low" "assert_required_tool osv-scanner"
run_check "tooling:k6-installed" "tooling" "low" "assert_required_tool k6"

run_check "format:prettier-check" "quality" "low" "pnpm format:check"
run_check "lint:eslint" "quality" "low" "pnpm lint"
run_check "types:typescript" "quality" "low" "pnpm typecheck"
run_check "tests:vitest-coverage" "quality" "low" "pnpm test:coverage"
run_check "tests:pytest" "quality" "low" "cd app-api && uv run pytest"
run_check "build:next-monorepo" "quality" "low" "pnpm build"

run_check "security:pip-audit" "security" "low" "cd app-api && uv run pip-audit --skip-editable"
run_check "security:npm-audit" "security" "low" "./scripts/run-npm-audit.sh"
run_check "security:ultra-strict-audit" "security" "low" "./scripts/audit-ultra-strict-local.sh"
run_check "security:codeql" "security" "low" "./scripts/run-codeql-local.sh"
run_check "security:osv-scanner" "security" "low" "./scripts/run-osv-scan.sh"

run_check "architecture:dependency-cruiser" "architecture" "low" "pnpm dlx dependency-cruiser@16.10.4 --config .dependency-cruiser.cjs --output-type err app-landing app-webapp app-admin packages"
run_check "architecture:knip" "architecture" "low" "pnpm dlx knip@5.62.0 --config knip.json --strict --dependencies --no-config-hints"
run_check "architecture:import-linter" "architecture" "low" "cd app-api && uv tool run --from import-linter lint-imports --config .importlinter"
run_check "quality:deptry" "quality" "low" "cd app-api && uv tool run --from deptry deptry . --config pyproject.toml"
run_check "quality:radon-complexity" "quality" "low" "uv tool run --from radon radon cc app-api/app -s -n B"
run_check "quality:radon-maintainability" "quality" "low" "uv tool run --from radon radon mi app-api/app -s -n B"

run_check "e2e:playwright-chromium-ready" "quality" "low" "./scripts/check-playwright-chromium.sh"
run_check "e2e:api-edge-webapp" "quality" "low" "pnpm e2e:ports:free && PW_REUSE_SERVER=0 pnpm playwright test testing/e2e/webapp/api-edge-cases.spec.ts --project=webapp --workers=1 --retries=0"
run_check "e2e:critical-ui" "quality" "low" "pnpm e2e:ports:free && PW_REUSE_SERVER=0 pnpm playwright test testing/e2e/landing/pilot-form.spec.ts --project=landing --workers=1 --retries=0 && pnpm e2e:ports:free && PW_REUSE_SERVER=0 pnpm playwright test testing/e2e/webapp/sidebar-interactions.spec.ts --project=webapp --workers=1 --retries=0"
run_check "e2e:admin-navigation-a11y" "quality" "low" "pnpm e2e:ports:free && PW_REUSE_SERVER=0 pnpm playwright test testing/e2e/admin/navigation.spec.ts --project=admin --workers=1 --retries=0"

run_check "performance:bundle-size-landing" "performance" "low" "./scripts/check-bundle-size.sh app-landing"
run_check "security:dynamic-api-audits" "security" "low" "./scripts/run-api-dynamic-audits.sh"
run_check "performance:frontend-audits" "performance" "low" "./scripts/run-frontend-audits.sh"

SUMMARY_STATUS="pass"
if ((FAILED_COUNT > 0)); then
  SUMMARY_STATUS="fail"
fi

TOOL_VERSIONS_JSON="$(jq -n \
  --arg node "$(tool_version node)" \
  --arg pnpm "$(tool_version pnpm)" \
  --arg uv "$(tool_version uv)" \
  --arg python "$(tool_version python3)" \
  --arg trivy "$(tool_version trivy)" \
  --arg semgrep "$(tool_version semgrep)" \
  --arg checkov "$(tool_version checkov)" \
  --arg codeql "$(tool_version codeql)" \
  --arg k6 "$(tool_version k6)" \
  --arg osv_scanner "$(tool_version osv-scanner)" \
  '{
    node: $node,
    pnpm: $pnpm,
    uv: $uv,
    python: $python,
    trivy: $trivy,
    semgrep: $semgrep,
    checkov: $checkov,
    codeql: $codeql,
    k6: $k6,
    osv_scanner: $osv_scanner
  }')"

UNSIGNED_REPORT="$(mktemp)"
jq -s \
  --arg schema_version "1" \
  --arg mode "$MODE" \
  --arg config_path "${CONFIG_PATH#${ROOT_DIR}/}" \
  --arg commit_sha "$COMMIT_SHA" \
  --arg timestamp_utc "$TIMESTAMP_ISO" \
  --argjson timestamp_epoch "$TIMESTAMP_EPOCH" \
  --argjson dry_run "$DRY_RUN" \
  --argjson tool_versions "$TOOL_VERSIONS_JSON" \
  --arg status "$SUMMARY_STATUS" \
  --argjson total_checks "$TOTAL_COUNT" \
  --argjson failed_checks "$FAILED_COUNT" \
  '{
    schema_version: $schema_version,
    mode: $mode,
    dry_run: ($dry_run == 1),
    config_path: $config_path,
    commit_sha: $commit_sha,
    timestamp_utc: $timestamp_utc,
    timestamp_epoch: $timestamp_epoch,
    tool_versions: $tool_versions,
    checks: .,
    summary: {
      status: $status,
      total_checks: $total_checks,
      failed_checks: $failed_checks
    }
  }' "$CHECKS_FILE" >"$UNSIGNED_REPORT"

./scripts/gate-report-sign.sh --unsigned "$UNSIGNED_REPORT" --output "$REPORT_PATH" >/dev/null
rm -f "$UNSIGNED_REPORT"

echo "[gate] report: $REPORT_PATH"

if [[ "$SUMMARY_STATUS" == "fail" ]]; then
  echo "[gate] FAIL (${FAILED_COUNT}/${TOTAL_COUNT} checks failed)" >&2
  exit 1
fi

echo "[gate] PASS (${TOTAL_COUNT} checks)"
