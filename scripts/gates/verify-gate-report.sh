#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"
source "$ROOT_DIR/scripts/lib/hmac.sh"

MODE="manual"
RUN_IF_MISSING="0"
MAX_AGE_SECONDS="21600"
KEY_PATH="${ROOT_DIR}/.git/gate-signing.key"
COMMIT_SHA="$(git rev-parse HEAD)"
REPORT_PATH="${ROOT_DIR}/.git/gate-reports/${COMMIT_SHA}.json"

while (($# > 0)); do
  case "$1" in
    --report-path)
      REPORT_PATH="${2:-}"
      shift 2
      ;;
    --max-age-seconds)
      MAX_AGE_SECONDS="${2:-}"
      shift 2
      ;;
    --mode)
      MODE="${2:-manual}"
      shift 2
      ;;
    --key-file)
      KEY_PATH="${2:-}"
      shift 2
      ;;
    --run-if-missing)
      RUN_IF_MISSING="1"
      shift
      ;;
    *)
      echo "[gate-verify] Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

if ! command -v jq >/dev/null 2>&1; then
  echo "[gate-verify] Missing jq" >&2
  exit 1
fi

rerun_gate_and_reverify() {
  echo "[gate-verify] Regenerating report with exhaustive gate..."
  ./scripts/gates/gate-exhaustive-local.sh --mode "$MODE" --report-path "$REPORT_PATH"
  exec ./scripts/gates/verify-gate-report.sh \
    --report-path "$REPORT_PATH" \
    --max-age-seconds "$MAX_AGE_SECONDS" \
    --mode "$MODE" \
    --key-file "$KEY_PATH"
}

if [[ ! -f "$REPORT_PATH" && "$RUN_IF_MISSING" == "1" ]]; then
  echo "[gate-verify] Missing report for HEAD, running exhaustive gate..."
  ./scripts/gates/gate-exhaustive-local.sh --mode "$MODE" --report-path "$REPORT_PATH"
fi

if [[ ! -f "$REPORT_PATH" ]]; then
  echo "[gate-verify] Missing gate report: $REPORT_PATH" >&2
  exit 1
fi

if ! require_existing_hmac_key_file "$KEY_PATH" "gate signing key"; then
  exit 1
fi

REPORT_SCHEMA="$(jq -r '.schema_version // empty' "$REPORT_PATH")"
if [[ "$REPORT_SCHEMA" != "2" ]]; then
  echo "[gate-verify] Unsupported report schema_version: ${REPORT_SCHEMA:-<empty>}" >&2
  exit 1
fi

REPORT_SHA="$(jq -r '.commit_sha // empty' "$REPORT_PATH")"
if [[ -z "$REPORT_SHA" || "$REPORT_SHA" != "$COMMIT_SHA" ]]; then
  echo "[gate-verify] Report commit mismatch: expected $COMMIT_SHA got ${REPORT_SHA:-<empty>}" >&2
  exit 1
fi

REPORT_TS="$(jq -r '.timestamp_epoch // empty' "$REPORT_PATH")"
if [[ -z "$REPORT_TS" ]]; then
  echo "[gate-verify] Missing report timestamp_epoch" >&2
  exit 1
fi
NOW_TS="$(date +%s)"
AGE="$((NOW_TS - REPORT_TS))"
if ((AGE < 0 || AGE > MAX_AGE_SECONDS)); then
  if [[ "$RUN_IF_MISSING" == "1" ]]; then
    rerun_gate_and_reverify
  fi
  echo "[gate-verify] Report is stale (age=${AGE}s, max=${MAX_AGE_SECONDS}s)" >&2
  exit 1
fi

REPORT_STATUS="$(jq -r '.summary.status // empty' "$REPORT_PATH")"
BLOCKING_FAILED="$(jq -r '.summary.blocking_failed_checks // empty' "$REPORT_PATH")"
if [[ -z "$BLOCKING_FAILED" ]]; then
  echo "[gate-verify] Missing summary.blocking_failed_checks" >&2
  exit 1
fi
LOW_FAILED="$(jq -r '.summary.low_failed_checks // 0' "$REPORT_PATH")"
if [[ "$BLOCKING_FAILED" != "0" ]]; then
  if [[ "$RUN_IF_MISSING" == "1" ]]; then
    rerun_gate_and_reverify
  fi
  echo "[gate-verify] Blocking checks are non-zero: ${BLOCKING_FAILED}" >&2
  exit 1
fi

if [[ "$REPORT_STATUS" != "pass" ]]; then
  if [[ "$REPORT_STATUS" == "fail" && "$LOW_FAILED" != "0" ]]; then
    echo "[gate-verify] Allowing report with low-severity warnings only (${LOW_FAILED})"
  else
    if [[ "$RUN_IF_MISSING" == "1" ]]; then
      rerun_gate_and_reverify
    fi
    echo "[gate-verify] Report status is not pass: ${REPORT_STATUS:-<empty>}" >&2
    exit 1
  fi
fi

REPORT_DRY_RUN="$(jq -r '.dry_run // false' "$REPORT_PATH")"
if [[ "$REPORT_DRY_RUN" == "true" ]]; then
  if [[ "$RUN_IF_MISSING" == "1" ]]; then
    rerun_gate_and_reverify
  fi
  echo "[gate-verify] Dry-run reports are not valid for pre-push verification" >&2
  exit 1
fi

POLICY_VERSION="$(jq -r '.policy.version // empty' "$REPORT_PATH")"
if [[ -z "$POLICY_VERSION" ]]; then
  echo "[gate-verify] Missing policy.version in report" >&2
  exit 1
fi

RISK_NOTICE="$(jq -r '.residual_risk_notice // empty' "$REPORT_PATH")"
if [[ -z "$RISK_NOTICE" ]]; then
  echo "[gate-verify] Missing residual_risk_notice in report" >&2
  exit 1
fi

SIG_EXPECTED="$(jq -r '.signature // empty' "$REPORT_PATH")"
if [[ -z "$SIG_EXPECTED" ]]; then
  echo "[gate-verify] Missing signature field in report" >&2
  exit 1
fi

UNSIGNED_TMP="$(mktemp)"
trap 'rm -f "$UNSIGNED_TMP"' EXIT
jq 'del(.signature)' "$REPORT_PATH" >"$UNSIGNED_TMP"

SIG_ACTUAL="$(compute_hmac_sha256_json_file "$KEY_PATH" "$UNSIGNED_TMP")"
if [[ "$SIG_ACTUAL" != "$SIG_EXPECTED" ]]; then
  echo "[gate-verify] Invalid signature" >&2
  exit 1
fi

echo "[gate-verify] OK (${REPORT_PATH})"
