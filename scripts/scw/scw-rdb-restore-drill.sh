#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

INSTANCE_ID=""
BACKUP_ID=""
DATABASE_NAME=""
RESTORED_DATABASE_NAME=""
OUTPUT_DIR=""
REGION="${SCW_REGION:-fr-par}"
WAIT_SECONDS="${SCW_RESTORE_DRILL_WAIT_SECONDS:-600}"
POLL_INTERVAL_SECONDS="${SCW_RESTORE_DRILL_POLL_SECONDS:-10}"
INVENTORY_PATH="${REPO_ROOT}/docs/security/control-plane-metadata-inventory.json"
declare -a CHECK_RESULTS=()
declare -a CHECK_EVIDENCE_ENTRIES=()

usage() {
  echo "Usage: $0 --instance-id <id> --backup-id <id> --database-name <name> --output-dir <dir> [--restored-database-name <name>] [--region <region>] [--wait-seconds <n>] [--poll-seconds <n>] [--check <check_id=pass|fail>] [--check-evidence <check_id=/abs/path/to/evidence.json>]" >&2
  exit 2
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_positive_integer() {
  local value="$1"
  local label="$2"
  if ! [[ "$value" =~ ^[1-9][0-9]*$ ]]; then
    echo "Invalid value for ${label}: expected positive integer, got '${value}'" >&2
    exit 1
  fi
}

while (($# > 0)); do
  case "$1" in
    --instance-id)
      INSTANCE_ID="${2:-}"
      shift 2
      ;;
    --backup-id)
      BACKUP_ID="${2:-}"
      shift 2
      ;;
    --database-name)
      DATABASE_NAME="${2:-}"
      shift 2
      ;;
    --restored-database-name)
      RESTORED_DATABASE_NAME="${2:-}"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="${2:-}"
      shift 2
      ;;
    --region)
      REGION="${2:-}"
      shift 2
      ;;
    --wait-seconds)
      WAIT_SECONDS="${2:-}"
      shift 2
      ;;
    --poll-seconds)
      POLL_INTERVAL_SECONDS="${2:-}"
      shift 2
      ;;
    --check)
      CHECK_RESULTS+=("${2:-}")
      shift 2
      ;;
    --check-evidence)
      CHECK_EVIDENCE_ENTRIES+=("${2:-}")
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      ;;
  esac
done

if [[ -z "$INSTANCE_ID" || -z "$BACKUP_ID" || -z "$DATABASE_NAME" || -z "$OUTPUT_DIR" ]]; then
  usage
fi

require_positive_integer "$WAIT_SECONDS" "--wait-seconds"
require_positive_integer "$POLL_INTERVAL_SECONDS" "--poll-seconds"
require_cmd scw
require_cmd jq
require_cmd date
require_cmd node

mkdir -p "$OUTPUT_DIR"

node "$REPO_ROOT/scripts/validate-control-plane-restore-evidence.mjs" \
  --kind inventory \
  --inventory "$INVENTORY_PATH" >/dev/null

INVENTORY_VERSION="$(jq -r '.inventory_version // empty' "$INVENTORY_PATH")"
if [[ -z "$INVENTORY_VERSION" ]]; then
  echo "Missing inventory_version in $INVENTORY_PATH" >&2
  exit 1
fi

REQUIRED_CHECKS_JSON="$(jq -c '.required_restore_checks' "$INVENTORY_PATH")"

declare -A PROVIDED_CHECK_STATUS=()
declare -A PROVIDED_CHECK_EVIDENCE=()
while IFS= read -r required_check_id || [ -n "$required_check_id" ]; do
  if [ -n "$required_check_id" ]; then
    PROVIDED_CHECK_STATUS["$required_check_id"]=""
    PROVIDED_CHECK_EVIDENCE["$required_check_id"]=""
  fi
done <<<"$(printf '%s' "$REQUIRED_CHECKS_JSON" | jq -r '.[].check_id')"

for entry in "${CHECK_RESULTS[@]}"; do
  if [[ "$entry" != *=* ]]; then
    echo "Invalid --check entry: ${entry:-<empty>} (expected check_id=pass|fail)" >&2
    exit 2
  fi

  check_id="${entry%%=*}"
  check_status="${entry#*=}"

  if [[ -z "${PROVIDED_CHECK_STATUS[$check_id]+x}" ]]; then
    echo "Unknown --check id: $check_id" >&2
    exit 2
  fi

  if [[ "$check_status" != "pass" && "$check_status" != "fail" ]]; then
    echo "Unsupported --check status for ${check_id}: ${check_status}" >&2
    exit 2
  fi

  if [[ -n "${PROVIDED_CHECK_STATUS[$check_id]}" ]]; then
    echo "Duplicate --check for ${check_id}" >&2
    exit 2
  fi

  PROVIDED_CHECK_STATUS["$check_id"]="$check_status"
done

for entry in "${CHECK_EVIDENCE_ENTRIES[@]}"; do
  if [[ "$entry" != *=* ]]; then
    echo "Invalid --check-evidence entry: ${entry:-<empty>} (expected check_id=/abs/path)" >&2
    exit 2
  fi

  check_id="${entry%%=*}"
  check_evidence_path="${entry#*=}"

  if [[ -z "${PROVIDED_CHECK_EVIDENCE[$check_id]+x}" ]]; then
    echo "Unknown --check-evidence id: $check_id" >&2
    exit 2
  fi

  if [[ -z "$check_evidence_path" || ! -f "$check_evidence_path" ]]; then
    echo "Missing --check-evidence file for ${check_id}: ${check_evidence_path:-<empty>}" >&2
    exit 2
  fi

  if [[ -n "${PROVIDED_CHECK_EVIDENCE[$check_id]}" ]]; then
    echo "Duplicate --check-evidence for ${check_id}" >&2
    exit 2
  fi

  PROVIDED_CHECK_EVIDENCE["$check_id"]="$check_evidence_path"
done

while IFS= read -r required_check_id || [ -n "$required_check_id" ]; do
  if [[ -z "$required_check_id" ]]; then
    continue
  fi
  if [[ -z "${PROVIDED_CHECK_EVIDENCE[$required_check_id]}" ]]; then
    echo "Missing --check-evidence for required restore check ${required_check_id}" >&2
    exit 2
  fi
done <<<"$(printf '%s' "$REQUIRED_CHECKS_JSON" | jq -r '.[].check_id')"

if [[ -z "$RESTORED_DATABASE_NAME" ]]; then
  RESTORED_DATABASE_NAME="${DATABASE_NAME}_restore_$(date -u +%Y%m%dT%H%M%SZ | tr '[:upper:]' '[:lower:]')"
fi

start_epoch="$(date +%s)"
start_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

restore_json="$(
  scw rdb backup restore "$BACKUP_ID" \
    instance-id="$INSTANCE_ID" \
    database-name="$RESTORED_DATABASE_NAME" \
    region="$REGION" \
    -o json
)"
printf '%s\n' "$restore_json" >"$OUTPUT_DIR/restore.json"

deadline=$((start_epoch + WAIT_SECONDS))
found_database=0

while true; do
  databases_json="$(scw rdb database list instance-id="$INSTANCE_ID" region="$REGION" -o json)"
  printf '%s\n' "$databases_json" >"$OUTPUT_DIR/databases-last.json"

  if printf '%s' "$databases_json" | jq -e --arg name "$RESTORED_DATABASE_NAME" '.[] | select(.name == $name)' >/dev/null; then
    found_database=1
    break
  fi

  if [[ "$(date +%s)" -ge "$deadline" ]]; then
    break
  fi

  sleep "$POLL_INTERVAL_SECONDS"
done

end_epoch="$(date +%s)"
end_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
rto_seconds=$((end_epoch - start_epoch))

CONTROL_PLANE_CHECKS_JSON='[]'
restore_status="pass"
while IFS= read -r required_check_json || [ -n "$required_check_json" ]; do
  if [[ -z "$required_check_json" ]]; then
    continue
  fi

  check_id="$(printf '%s' "$required_check_json" | jq -r '.check_id')"
  check_target="$(printf '%s' "$required_check_json" | jq -r '.target')"
  check_description="$(printf '%s' "$required_check_json" | jq -r '.description')"
  check_evidence_hint="$(printf '%s' "$required_check_json" | jq -r '.evidence_hint')"
  check_status="${PROVIDED_CHECK_STATUS[$check_id]}"
  check_evidence_path="${PROVIDED_CHECK_EVIDENCE[$check_id]}"

  if [[ -z "$check_status" ]]; then
    check_status="fail"
  fi

  check_evidence_sha="$(openssl dgst -sha256 "$check_evidence_path" | awk '{print $2}')"

  if [[ "$check_status" != "pass" ]]; then
    restore_status="fail"
  fi

  CONTROL_PLANE_CHECKS_JSON="$(
    jq -n \
      --argjson base "$CONTROL_PLANE_CHECKS_JSON" \
      --arg checkId "$check_id" \
      --arg target "$check_target" \
      --arg description "$check_description" \
      --arg evidenceHint "$check_evidence_hint" \
      --arg status "$check_status" \
      --arg evidencePath "$check_evidence_path" \
      --arg evidenceSha "$check_evidence_sha" \
      '$base + [{
        check_id: $checkId,
        target: $target,
        description: $description,
        evidence_hint: $evidenceHint,
        status: $status,
        evidence: {
          path: $evidencePath,
          sha256: $evidenceSha
        }
      }]'
  )"
done <<<"$(printf '%s' "$REQUIRED_CHECKS_JSON" | jq -c '.[]')"

if [[ "$found_database" -ne 1 ]]; then
  restore_status="fail"
fi

ALL_CHECKS_JSON="$(
  jq -n \
    --argjson controlPlaneChecks "$CONTROL_PLANE_CHECKS_JSON" \
    --arg databasesPath "$OUTPUT_DIR/databases-last.json" \
    --arg databasesSha "$(openssl dgst -sha256 "$OUTPUT_DIR/databases-last.json" | awk '{print $2}')" \
    --arg visibilityStatus "$(
      if [[ "$found_database" -eq 1 ]]; then
        printf 'pass'
      else
        printf 'fail'
      fi
    )" \
    '$controlPlaneChecks + [{
      check_id: "restored_database_visible",
      target: "database_presence",
      description: "La base restauree apparait bien sur l instance cible dans la fenetre d attente.",
      evidence_hint: "scw rdb database list",
      status: $visibilityStatus,
      evidence: {
        path: $databasesPath,
        sha256: $databasesSha
      }
    }]'
)"

jq -n \
  --arg summaryType "database-restore-evidence" \
  --arg schemaVersion "1" \
  --arg inventoryVersion "$INVENTORY_VERSION" \
  --arg status "$restore_status" \
  --arg startedAt "$start_utc" \
  --arg endedAt "$end_utc" \
  --arg instanceId "$INSTANCE_ID" \
  --arg backupId "$BACKUP_ID" \
  --arg region "$REGION" \
  --arg sourceDatabaseName "$DATABASE_NAME" \
  --arg restoredDatabaseName "$RESTORED_DATABASE_NAME" \
  --argjson rtoSeconds "$rto_seconds" \
  --argjson verifiedDatabasePresence "$found_database" \
  --argjson checks "$ALL_CHECKS_JSON" \
  '{
    summary_type: $summaryType,
    schema_version: $schemaVersion,
    inventory_version: $inventoryVersion,
    status: $status,
    started_at: $startedAt,
    ended_at: $endedAt,
    instance_id: $instanceId,
    backup_id: $backupId,
    region: $region,
    source_database_name: $sourceDatabaseName,
    restored_database_name: $restoredDatabaseName,
    rto_seconds: $rtoSeconds,
    verified_database_presence: ($verifiedDatabasePresence == 1),
    checks: $checks
  }' >"$OUTPUT_DIR/summary.json"

node "$REPO_ROOT/scripts/validate-control-plane-restore-evidence.mjs" \
  --kind restore \
  --inventory "$INVENTORY_PATH" \
  --summary "$OUTPUT_DIR/summary.json" >/dev/null

if [[ "$restore_status" != "pass" ]]; then
  echo "Restore drill failed: database visibility or required control-plane checks did not pass" >&2
  exit 1
fi

echo "Restore drill evidence written to $OUTPUT_DIR"
