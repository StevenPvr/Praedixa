#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/hmac.sh"

MANIFEST_PATH=""
KEY_PATH="${PRAEDIXA_RELEASE_KEY_PATH:-${HOME}/.praedixa/release-manifest.key}"

usage() {
  echo "Usage: $0 --manifest <path> [--key-file <path>]" >&2
  exit 2
}

while (($# > 0)); do
  case "$1" in
    --manifest)
      MANIFEST_PATH="${2:-}"
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

if [[ -z "$MANIFEST_PATH" ]]; then
  usage
fi

if [[ ! -f "$MANIFEST_PATH" ]]; then
  echo "Missing manifest: $MANIFEST_PATH" >&2
  exit 1
fi

if ! require_existing_hmac_key_file "$KEY_PATH" "release manifest key"; then
  exit 1
fi

EXPECTED_SIGNATURE="$(jq -r '.signature // empty' "$MANIFEST_PATH")"
if [[ -z "$EXPECTED_SIGNATURE" ]]; then
  echo "Manifest missing signature" >&2
  exit 1
fi

UNSIGNED_TMP="$(mktemp)"
cleanup() {
  rm -f "$UNSIGNED_TMP"
}
trap cleanup EXIT

jq 'del(.signature)' "$MANIFEST_PATH" >"$UNSIGNED_TMP"

ACTUAL_SIGNATURE="$(compute_hmac_sha256_json_file "$KEY_PATH" "$UNSIGNED_TMP")"

if [[ "$ACTUAL_SIGNATURE" != "$EXPECTED_SIGNATURE" ]]; then
  echo "Invalid manifest signature" >&2
  exit 1
fi

SCHEMA_VERSION="$(jq -r '.schema_version // empty' "$MANIFEST_PATH")"
if [[ "$SCHEMA_VERSION" != "1" ]]; then
  echo "Unsupported manifest schema_version: ${SCHEMA_VERSION:-<empty>}" >&2
  exit 1
fi

verify_json_digest() {
  local label="$1"
  local path="$2"
  local expected_sha="$3"
  local actual_sha

  if [[ -z "$path" || -z "$expected_sha" ]]; then
    echo "${label} is incomplete" >&2
    exit 1
  fi

  if [[ ! -f "$path" ]]; then
    echo "Missing ${label}: $path" >&2
    exit 1
  fi

  jq empty "$path" >/dev/null
  actual_sha="$(openssl dgst -sha256 "$path" | awk '{print $2}')"
  if [[ "$actual_sha" != "$expected_sha" ]]; then
    echo "${label} digest mismatch for $path" >&2
    exit 1
  fi
}

GATE_REPORT_PATH="$(jq -r '.gate_report.path // empty' "$MANIFEST_PATH")"
GATE_REPORT_SHA="$(jq -r '.gate_report.sha256 // empty' "$MANIFEST_PATH")"
if [[ -z "$GATE_REPORT_PATH" || -z "$GATE_REPORT_SHA" ]]; then
  echo "Manifest gate_report metadata is incomplete" >&2
  exit 1
fi
verify_json_digest "gate report" "$GATE_REPORT_PATH" "$GATE_REPORT_SHA"

verify_evidence_array() {
  local label="$1"
  local manifest="$2"
  local array_path="$3"
  local count index entry_path expected_sha

  count="$(jq -r "${array_path} | if type == \"array\" then length else 0 end" "$manifest")"
  if [[ "$count" -lt 1 ]]; then
    echo "Manifest ${label} missing evidence entries" >&2
    exit 1
  fi

  for ((index = 0; index < count; index += 1)); do
    entry_path="$(jq -r "${array_path}[${index}].path // empty" "$manifest")"
    expected_sha="$(jq -r "${array_path}[${index}].sha256 // empty" "$manifest")"
    verify_json_digest "manifest ${label} evidence entry ${index}" "$entry_path" "$expected_sha"
  done
}

validate_control_plane_evidence() {
  local summary_path="$1"
  local kind="$2"
  local output

  if output="$(
    node "$SCRIPT_DIR/validate-control-plane-restore-evidence.mjs" \
      --kind "$kind" \
      --summary "$summary_path" 2>&1
  )"; then
    return 0
  fi

  echo "$output" >&2
  exit 1
}

DATABASE_IMPACT="$(jq -r '.database_evidence.impact // false' "$MANIFEST_PATH")"
if [[ "$DATABASE_IMPACT" == "true" ]]; then
  verify_evidence_array "backup" "$MANIFEST_PATH" '.database_evidence.backup_evidence'
  verify_evidence_array "restore" "$MANIFEST_PATH" '.database_evidence.restore_evidence'

  BACKUP_EVIDENCE_COUNT="$(jq -r '.database_evidence.backup_evidence | if type == "array" then length else 0 end' "$MANIFEST_PATH")"
  for ((index = 0; index < BACKUP_EVIDENCE_COUNT; index += 1)); do
    summary_path="$(jq -r ".database_evidence.backup_evidence[${index}].path // empty" "$MANIFEST_PATH")"
    validate_control_plane_evidence "$summary_path" "backup"
  done

  RESTORE_EVIDENCE_COUNT="$(jq -r '.database_evidence.restore_evidence | if type == "array" then length else 0 end' "$MANIFEST_PATH")"
  for ((index = 0; index < RESTORE_EVIDENCE_COUNT; index += 1)); do
    summary_path="$(jq -r ".database_evidence.restore_evidence[${index}].path // empty" "$MANIFEST_PATH")"
    validate_control_plane_evidence "$summary_path" "restore"
  done
fi

verify_supply_chain_artifact() {
  local summary_path="$1"
  local artifact_key="$2"
  local artifact_path artifact_sha

  artifact_path="$(
    jq -r ".artifacts.${artifact_key}.path // empty" "$summary_path"
  )"
  artifact_sha="$(
    jq -r ".artifacts.${artifact_key}.sha256 // empty" "$summary_path"
  )"

  if [[ -z "$artifact_path" || -z "$artifact_sha" ]]; then
    echo "Supply-chain evidence summary is missing ${artifact_key} metadata: $summary_path" >&2
    exit 1
  fi
  verify_json_digest "supply-chain ${artifact_key} artifact" "$artifact_path" "$artifact_sha"
}

SUPPLY_CHAIN_EVIDENCE_COUNT="$(jq -r '.supply_chain_evidence | if type == "array" then length else 0 end' "$MANIFEST_PATH")"
if [[ "$SUPPLY_CHAIN_EVIDENCE_COUNT" -gt 0 ]]; then
  verify_evidence_array \
    "supply_chain" \
    "$MANIFEST_PATH" \
    '.supply_chain_evidence'

  for ((index = 0; index < SUPPLY_CHAIN_EVIDENCE_COUNT; index += 1)); do
    summary_path="$(jq -r ".supply_chain_evidence[${index}].path // empty" "$MANIFEST_PATH")"
    summary_type="$(jq -r '.summary_type // empty' "$summary_path")"
    schema_version="$(jq -r '.schema_version // empty' "$summary_path")"
    status="$(jq -r '.status // empty' "$summary_path")"

    if [[ "$summary_type" != "supply-chain-evidence" ]]; then
      echo "Unsupported supply-chain evidence summary_type in $summary_path: ${summary_type:-<empty>}" >&2
      exit 1
    fi
    if [[ "$schema_version" != "1" ]]; then
      echo "Unsupported supply-chain evidence schema_version in $summary_path: ${schema_version:-<empty>}" >&2
      exit 1
    fi
    if [[ "$status" != "pass" ]]; then
      echo "Supply-chain evidence entry ${index} must have status=pass" >&2
      exit 1
    fi
    verify_supply_chain_artifact "$summary_path" "sbom"
    verify_supply_chain_artifact "$summary_path" "vulnerability_scan"
  done
fi

echo "[release-manifest] OK ($MANIFEST_PATH)"
