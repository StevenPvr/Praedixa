#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source "${ROOT_DIR}/scripts/lib/pnpm.sh"
CI_PYTHON_TOOL="${ROOT_DIR}/scripts/ci-python-tool.sh"

MODE="manual"
REPORT_PATH=""
GATE_ALLOW_MISSING_TOOLS="${GATE_ALLOW_MISSING_TOOLS:-0}"
DRY_RUN="0"
CONFIG_PATH="${ROOT_DIR}/scripts/gate.config.yaml"
POLICY_PATH="${ROOT_DIR}/scripts/security-policy.yaml"
EXCEPTIONS_PATH="${ROOT_DIR}/scripts/security-exceptions.yaml"

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

case "$MODE" in
  pre-commit|pre-push|manual) ;;
  *)
    echo "[gate] Unsupported mode '$MODE' (expected pre-commit|pre-push|manual)" >&2
    exit 2
    ;;
esac

if ! command -v jq >/dev/null 2>&1; then
  echo "[gate] Missing jq" >&2
  exit 1
fi

if ! setup_pnpm; then
  echo "[gate] Missing pnpm (tried PATH, PNPM_HOME, local pnpm tools, corepack, npx)." >&2
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

policy_json() {
  python3 - <<'PY' "$POLICY_PATH"
import json
import sys
from pathlib import Path
import yaml

path = Path(sys.argv[1])
data = yaml.safe_load(path.read_text(encoding='utf-8'))
print(json.dumps(data, ensure_ascii=False))
PY
}

exceptions_summary_json() {
  python3 - <<'PY' "$EXCEPTIONS_PATH"
import json
import sys
from datetime import date
from pathlib import Path
import yaml

path = Path(sys.argv[1])
data = yaml.safe_load(path.read_text(encoding='utf-8'))
exceptions = data.get('exceptions', []) if isinstance(data, dict) else []

today = date.today()
active = 0
expired = 0
for item in exceptions:
    if not isinstance(item, dict):
        continue
    status = str(item.get('status', '')).strip().lower()
    if status != 'active':
        continue
    try:
        expires = date.fromisoformat(str(item.get('expires_at', '')))
    except ValueError:
        expired += 1
        continue
    if expires < today:
        expired += 1
    else:
        active += 1

print(json.dumps({
    'total': len(exceptions),
    'active': active,
    'expired': expired,
}, ensure_ascii=False))
PY
}

run_precommit_layer() {
  run_check "policy:exceptions" "governance" "high" "python3 scripts/validate-security-exceptions.py --quiet"
  run_check "layer-a:precommit-blocking" "security" "high" "./scripts/gate-precommit-blocking.sh"
}

run_prepush_layer() {
  run_check "policy:exceptions" "governance" "high" "python3 scripts/validate-security-exceptions.py --quiet"
  run_check "layer-b:prepush-deep" "security" "high" "./scripts/gate-prepush-deep.sh"
}

run_manual_exhaustive_layer() {
  run_check "tooling:codeql-installed" "tooling" "medium" "assert_required_tool codeql"
  run_check "tooling:k6-installed" "tooling" "medium" "assert_required_tool k6"

  run_check "layer-b:prepush-deep" "security" "high" "./scripts/gate-prepush-deep.sh"

  run_check "quality:static-monorepo" "quality" "low" "./scripts/gate-quality-static.sh"
  run_check "performance:budget-baselines" "quality" "medium" "pnpm performance:validate-budgets"
  run_check "tests:vitest-coverage" "quality" "low" "pnpm test:coverage"
  run_check "tests:api-ts" "quality" "low" "pnpm --filter @praedixa/api-ts test"
  run_check "tests:pytest-data" "quality" "low" "cd app-api && uv run pytest tests/"
  run_check "quality:alembic-heads" "quality" "low" "./scripts/check-alembic-heads.sh"
  run_check "build:next-monorepo" "quality" "low" "pnpm build"
  run_check "security:invariants-full" "security" "medium" "python3 scripts/check-security-invariants.py --mode full"

  run_check "security:codeql" "security" "medium" "./scripts/run-codeql-local.sh"
  run_check "security:dynamic-api-audits" "security" "medium" "./scripts/run-api-dynamic-audits.sh"

  run_check "architecture:dependency-cruiser" "architecture" "low" "pnpm architecture:dependency-cruiser"
  run_check "architecture:knip" "architecture" "low" "pnpm architecture:knip"
  run_check "architecture:ts-guardrails" "architecture" "low" "pnpm architecture:ts-guardrails"
  run_check "architecture:import-linter" "architecture" "low" "\"${CI_PYTHON_TOOL}\" --cwd app-api import-linter --config .importlinter"
  run_check "quality:deptry" "quality" "low" "\"${CI_PYTHON_TOOL}\" --cwd app-api deptry . --config pyproject.toml"
  run_check "quality:python-complexity-baseline" "quality" "low" "python3 scripts/check-python-complexity-baseline.py"
  run_check "quality:radon-maintainability" "quality" "low" "\"${CI_PYTHON_TOOL}\" radon mi app-api/app -s -n A"

  run_check "e2e:playwright-chromium-ready" "quality" "low" "./scripts/check-playwright-chromium.sh"
  run_check "e2e:api-edge-webapp" "quality" "low" "pnpm e2e:ports:free && PW_REUSE_SERVER=0 pnpm playwright test testing/e2e/webapp/api-edge-cases.spec.ts --project=webapp --workers=1 --retries=0"
  run_check "e2e:critical-ui" "quality" "low" "pnpm e2e:ports:free && PW_REUSE_SERVER=0 pnpm playwright test testing/e2e/landing/pilot-form.spec.ts --project=landing --workers=1 --retries=0 && pnpm e2e:ports:free && PW_REUSE_SERVER=0 pnpm playwright test testing/e2e/webapp/sidebar-interactions.spec.ts --project=webapp --workers=1 --retries=0"
  run_check "e2e:admin-navigation-a11y" "quality" "low" "pnpm e2e:ports:free && PW_REUSE_SERVER=0 pnpm playwright test testing/e2e/admin/navigation.spec.ts --project=admin --workers=1 --retries=0"

  run_check "performance:bundle-size-landing" "performance" "low" "./scripts/check-bundle-size.sh app-landing"
  run_check "performance:frontend-audits" "performance" "low" "./scripts/run-frontend-audits.sh"
}

LAYER=""
case "$MODE" in
  pre-commit)
    LAYER="A"
    ;;
  pre-push)
    LAYER="B"
    ;;
  manual)
    LAYER="C"
    ;;
esac

echo "[gate] mode=${MODE} layer=${LAYER} sha=${COMMIT_SHA} strict_missing_tools=$((1 - GATE_ALLOW_MISSING_TOOLS)) dry_run=${DRY_RUN}"

case "$MODE" in
  pre-commit)
    run_precommit_layer
    ;;
  pre-push)
    run_prepush_layer
    ;;
  manual)
    run_manual_exhaustive_layer
    ;;
esac

SUMMARY_STATUS="pass"
if ((FAILED_COUNT > 0)); then
  SUMMARY_STATUS="fail"
fi

BLOCKING_FAILED_COUNT="$(jq -s '[.[] | select(.status == "fail") | select(.severity_floor == "critical" or .severity_floor == "high" or .severity_floor == "medium")] | length' "$CHECKS_FILE")"
LOW_FAILED_COUNT="$(jq -s '[.[] | select(.status == "fail" and .severity_floor == "low")] | length' "$CHECKS_FILE")"

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
  --arg gitleaks "$(tool_version gitleaks)" \
  --arg syft "$(tool_version syft)" \
  --arg grype "$(tool_version grype)" \
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
    osv_scanner: $osv_scanner,
    gitleaks: $gitleaks,
    syft: $syft,
    grype: $grype
  }')"

POLICY_JSON="$(policy_json)"
EXCEPTIONS_SUMMARY_JSON="$(exceptions_summary_json)"

UNSIGNED_REPORT="$(mktemp)"
jq -s \
  --arg schema_version "2" \
  --arg mode "$MODE" \
  --arg layer "$LAYER" \
  --arg config_path "${CONFIG_PATH#${ROOT_DIR}/}" \
  --arg policy_path "${POLICY_PATH#${ROOT_DIR}/}" \
  --arg exceptions_path "${EXCEPTIONS_PATH#${ROOT_DIR}/}" \
  --arg commit_sha "$COMMIT_SHA" \
  --arg timestamp_utc "$TIMESTAMP_ISO" \
  --argjson timestamp_epoch "$TIMESTAMP_EPOCH" \
  --argjson dry_run "$DRY_RUN" \
  --argjson tool_versions "$TOOL_VERSIONS_JSON" \
  --argjson policy "$POLICY_JSON" \
  --argjson exceptions_summary "$EXCEPTIONS_SUMMARY_JSON" \
  --arg status "$SUMMARY_STATUS" \
  --argjson total_checks "$TOTAL_COUNT" \
  --argjson failed_checks "$FAILED_COUNT" \
  --argjson blocking_failed_checks "$BLOCKING_FAILED_COUNT" \
  --argjson low_failed_checks "$LOW_FAILED_COUNT" \
  '{
    schema_version: $schema_version,
    mode: $mode,
    layer: $layer,
    dry_run: ($dry_run == 1),
    config_path: $config_path,
    policy_path: $policy_path,
    exceptions_path: $exceptions_path,
    commit_sha: $commit_sha,
    timestamp_utc: $timestamp_utc,
    timestamp_epoch: $timestamp_epoch,
    tool_versions: $tool_versions,
    policy: $policy,
    exceptions_summary: $exceptions_summary,
    residual_risk_notice: "Unknown zero-days cannot be fully detected automatically.",
    checks: .,
    summary: {
      status: $status,
      total_checks: $total_checks,
      failed_checks: $failed_checks,
      blocking_failed_checks: $blocking_failed_checks,
      low_failed_checks: $low_failed_checks
    }
  }' "$CHECKS_FILE" >"$UNSIGNED_REPORT"

./scripts/gate-report-sign.sh --unsigned "$UNSIGNED_REPORT" --output "$REPORT_PATH" >/dev/null
rm -f "$UNSIGNED_REPORT"

echo "[gate] report: $REPORT_PATH"

if [[ "$SUMMARY_STATUS" == "fail" ]]; then
  echo "[gate] FAIL (${FAILED_COUNT}/${TOTAL_COUNT} checks failed; blocking=${BLOCKING_FAILED_COUNT})" >&2
  exit 1
fi

echo "[gate] PASS (${TOTAL_COUNT} checks)"
