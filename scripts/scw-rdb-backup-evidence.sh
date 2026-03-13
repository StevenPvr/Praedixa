#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

INSTANCE_ID=""
DATABASE_NAME=""
OUTPUT_DIR=""
REGION="${SCW_REGION:-fr-par}"
CREATE_MANUAL_BACKUP=0
BACKUP_NAME_PREFIX="pre-change"
INVENTORY_PATH="${SCRIPT_DIR}/../docs/security/control-plane-metadata-inventory.json"

usage() {
  echo "Usage: $0 --instance-id <id> --output-dir <dir> [--database-name <name>] [--region <region>] [--create-manual-backup] [--backup-name-prefix <prefix>]" >&2
  exit 2
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

while (($# > 0)); do
  case "$1" in
    --instance-id)
      INSTANCE_ID="${2:-}"
      shift 2
      ;;
    --database-name)
      DATABASE_NAME="${2:-}"
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
    --create-manual-backup)
      CREATE_MANUAL_BACKUP=1
      shift
      ;;
    --backup-name-prefix)
      BACKUP_NAME_PREFIX="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      ;;
  esac
done

if [[ -z "$INSTANCE_ID" || -z "$OUTPUT_DIR" ]]; then
  usage
fi

if [[ "$CREATE_MANUAL_BACKUP" -eq 1 && -z "$DATABASE_NAME" ]]; then
  echo "--database-name is required with --create-manual-backup" >&2
  exit 1
fi

require_cmd scw
require_cmd jq
require_cmd date
require_cmd node

mkdir -p "$OUTPUT_DIR"

node "$SCRIPT_DIR/validate-control-plane-restore-evidence.mjs" \
  --kind inventory \
  --inventory "$INVENTORY_PATH" >/dev/null

INVENTORY_VERSION="$(jq -r '.inventory_version // empty' "$INVENTORY_PATH")"
if [[ -z "$INVENTORY_VERSION" ]]; then
  echo "Missing inventory_version in $INVENTORY_PATH" >&2
  exit 1
fi

timestamp_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
timestamp_compact="$(date -u +%Y%m%dT%H%M%SZ)"

instance_json="$(scw rdb instance get "$INSTANCE_ID" region="$REGION" -o json)"
printf '%s\n' "$instance_json" >"$OUTPUT_DIR/instance.json"

backups_json="$(scw rdb backup list instance-id="$INSTANCE_ID" region="$REGION" -o json)"
printf '%s\n' "$backups_json" >"$OUTPUT_DIR/backups.json"

backup_count="$(printf '%s' "$backups_json" | jq 'length')"
if [[ "$backup_count" -le 0 ]]; then
  echo "No backups found for instance $INSTANCE_ID in region $REGION" >&2
  exit 1
fi

latest_backup_id="$(
  printf '%s' "$backups_json" | jq -r '
    sort_by(.created_at // .createdAt // .updated_at // .updatedAt // "")
    | last
    | (.id // "")
  '
)"

latest_backup_created_at="$(
  printf '%s' "$backups_json" | jq -r '
    sort_by(.created_at // .createdAt // .updated_at // .updatedAt // "")
    | last
    | (.created_at // .createdAt // .updated_at // .updatedAt // "")
  '
)"

manual_backup_json='null'
manual_backup_id='null'
if [[ "$CREATE_MANUAL_BACKUP" -eq 1 ]]; then
  backup_name="${BACKUP_NAME_PREFIX}-${timestamp_compact}"
  manual_backup_json="$(
    scw rdb backup create \
      instance-id="$INSTANCE_ID" \
      database-name="$DATABASE_NAME" \
      name="$backup_name" \
      region="$REGION" \
      -o json
  )"
  printf '%s\n' "$manual_backup_json" >"$OUTPUT_DIR/manual-backup.json"
  manual_backup_id="$(printf '%s' "$manual_backup_json" | jq -r '.id // null')"
fi

jq -n \
  --arg summaryType "database-backup-evidence" \
  --arg schemaVersion "1" \
  --arg inventoryVersion "$INVENTORY_VERSION" \
  --arg status "pass" \
  --arg timestamp "$timestamp_utc" \
  --arg instanceId "$INSTANCE_ID" \
  --arg region "$REGION" \
  --arg databaseName "${DATABASE_NAME:-}" \
  --arg latestBackupId "$latest_backup_id" \
  --arg latestBackupCreatedAt "$latest_backup_created_at" \
  --argjson backupCount "$backup_count" \
  --arg manualBackupId "$manual_backup_id" \
  --argjson checks "$(
    jq -n \
      --arg manualBackupStatus "$(
        if [[ "$CREATE_MANUAL_BACKUP" -eq 1 ]]; then
          printf 'pass'
        else
          printf 'not_applicable'
        fi
      )" \
      '[
        {
          check_id: "instance_snapshot_recorded",
          status: "pass"
        },
        {
          check_id: "latest_backup_identified",
          status: "pass"
        },
        {
          check_id: "manual_backup_requested_or_not_required",
          status: $manualBackupStatus
        }
      ]'
  )" \
  '{
    summary_type: $summaryType,
    schema_version: $schemaVersion,
    inventory_version: $inventoryVersion,
    status: $status,
    recorded_at: $timestamp,
    instance_id: $instanceId,
    region: $region,
    database_name: ($databaseName | select(length > 0)),
    backup_count: $backupCount,
    latest_backup_id: $latestBackupId,
    latest_backup_created_at: $latestBackupCreatedAt,
    manual_backup_id: (
      $manualBackupId | if . == "" or . == "null" then null else . end
    ),
    checks: $checks
  }' >"$OUTPUT_DIR/summary.json"

node "$SCRIPT_DIR/validate-control-plane-restore-evidence.mjs" \
  --kind backup \
  --inventory "$INVENTORY_PATH" \
  --summary "$OUTPUT_DIR/summary.json" >/dev/null

echo "Backup evidence written to $OUTPUT_DIR"
