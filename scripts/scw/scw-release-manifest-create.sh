#!/usr/bin/env bash
set -euo pipefail

REF=""
GATE_REPORT=""
OUTPUT_PATH=""
KEY_PATH="${PRAEDIXA_RELEASE_KEY_PATH:-${HOME}/.praedixa/release-manifest.key}"
DATABASE_IMPACT=0
declare -a IMAGE_ENTRIES=()
declare -a BACKUP_EVIDENCE_PATHS=()
declare -a RESTORE_EVIDENCE_PATHS=()
declare -a SUPPLY_CHAIN_EVIDENCE_PATHS=()

usage() {
  echo "Usage: $0 --ref <git-ref> --output <manifest.json> --gate-report <path> --image <service>=<registry-image@sha256:...> [--image ...] [--database-impact] [--backup-evidence <summary.json>] [--restore-evidence <summary.json>] [--supply-chain-evidence <summary.json>] [--key-file <path>]" >&2
  exit 2
}

while (($# > 0)); do
  case "$1" in
    --ref)
      REF="${2:-}"
      shift 2
      ;;
    --gate-report)
      GATE_REPORT="${2:-}"
      shift 2
      ;;
    --output)
      OUTPUT_PATH="${2:-}"
      shift 2
      ;;
    --image)
      IMAGE_ENTRIES+=("${2:-}")
      shift 2
      ;;
    --database-impact)
      DATABASE_IMPACT=1
      shift
      ;;
    --backup-evidence)
      BACKUP_EVIDENCE_PATHS+=("${2:-}")
      shift 2
      ;;
    --restore-evidence)
      RESTORE_EVIDENCE_PATHS+=("${2:-}")
      shift 2
      ;;
    --supply-chain-evidence)
      SUPPLY_CHAIN_EVIDENCE_PATHS+=("${2:-}")
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

if [[ -z "$REF" || -z "$OUTPUT_PATH" || -z "$GATE_REPORT" || "${#IMAGE_ENTRIES[@]}" -eq 0 ]]; then
  usage
fi

if [[ ! -f "$GATE_REPORT" ]]; then
  echo "Gate report not found: $GATE_REPORT" >&2
  exit 1
fi
jq empty "$GATE_REPORT" >/dev/null

if [[ "$DATABASE_IMPACT" -eq 1 ]]; then
  if [[ "${#BACKUP_EVIDENCE_PATHS[@]}" -eq 0 || "${#RESTORE_EVIDENCE_PATHS[@]}" -eq 0 ]]; then
    echo "--database-impact requires at least one --backup-evidence and one --restore-evidence" >&2
    exit 1
  fi
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT_DIR/scripts/lib/scw-topology.sh"
COMMIT_SHA="$(git -C "$ROOT_DIR" rev-parse "$REF")"
TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

compute_sha256() {
  openssl dgst -sha256 "$1" | awk '{print $2}'
}

build_evidence_array() {
  local evidence_kind="$1"
  shift

  if [[ "$#" -eq 0 ]]; then
    printf '[]'
    return
  fi

  local evidence_json='[]'
  local path sha256

  for path in "$@"; do
    if [[ -z "$path" || ! -f "$path" ]]; then
      echo "Missing ${evidence_kind} evidence file: ${path:-<empty>}" >&2
      exit 1
    fi

    jq empty "$path" >/dev/null
    sha256="$(compute_sha256 "$path")"

    evidence_json="$(
      jq -n \
        --argjson base "$evidence_json" \
        --arg path "$path" \
        --arg sha256 "$sha256" \
        --slurpfile summary "$path" \
        '$base + [{
          path: $path,
          sha256: $sha256,
          summary: $summary[0]
        }]'
    )"
  done

  printf '%s' "$evidence_json"
}

IMAGES_JSON="{}"
for entry in "${IMAGE_ENTRIES[@]}"; do
  service="${entry%%=*}"
  registry_image="${entry#*=}"
  if [[ -z "$service" || -z "$registry_image" || "$registry_image" != *@sha256:* ]]; then
    echo "Invalid --image entry: $entry" >&2
    exit 1
  fi
  IMAGES_JSON="$(
    jq -n \
      --argjson base "$IMAGES_JSON" \
      --arg service "$service" \
      --arg registry_image "$registry_image" \
      '$base + { ($service): { registry_image: $registry_image } }'
  )"
done

BACKUP_EVIDENCE_JSON="$(build_evidence_array "backup" "${BACKUP_EVIDENCE_PATHS[@]}")"
RESTORE_EVIDENCE_JSON="$(build_evidence_array "restore" "${RESTORE_EVIDENCE_PATHS[@]}")"
SUPPLY_CHAIN_EVIDENCE_JSON="$(
  build_evidence_array "supply-chain" "${SUPPLY_CHAIN_EVIDENCE_PATHS[@]}"
)"

TARGETS_JSON="$(scw_topology_targets_json)"

UNSIGNED_PATH="$TMP_DIR/release-manifest-unsigned.json"

jq -n \
  --arg schema_version "1" \
  --arg release_id "$(date -u +"%Y%m%dT%H%M%SZ")-${COMMIT_SHA:0:12}" \
  --arg commit_sha "$COMMIT_SHA" \
  --arg ref "$REF" \
  --arg created_at "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  --arg gate_report_path "$GATE_REPORT" \
  --arg gate_report_sha "$(compute_sha256 "$GATE_REPORT")" \
  --argjson database_impact "$DATABASE_IMPACT" \
  --argjson images "$IMAGES_JSON" \
  --argjson backup_evidence "$BACKUP_EVIDENCE_JSON" \
  --argjson restore_evidence "$RESTORE_EVIDENCE_JSON" \
  --argjson supply_chain_evidence "$SUPPLY_CHAIN_EVIDENCE_JSON" \
  --argjson targets "$TARGETS_JSON" \
  '{
    schema_version: $schema_version,
    release_id: $release_id,
    commit_sha: $commit_sha,
    git_ref: $ref,
    created_at: $created_at,
    gate_report: {
      path: $gate_report_path,
      sha256: $gate_report_sha
    },
    database_evidence: (
      if $database_impact == 1 then {
        impact: true,
        backup_evidence: $backup_evidence,
        restore_evidence: $restore_evidence
      } else null end
    ),
    supply_chain_evidence: (
      if ($supply_chain_evidence | length) > 0 then $supply_chain_evidence else null end
    ),
    images: $images,
    targets: $targets
  }' >"$UNSIGNED_PATH"

./scripts/release-manifest-sign.sh \
  --unsigned "$UNSIGNED_PATH" \
  --output "$OUTPUT_PATH" \
  --key-file "$KEY_PATH" >/dev/null

echo "$OUTPUT_PATH"
