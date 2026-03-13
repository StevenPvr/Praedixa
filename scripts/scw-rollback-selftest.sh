#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

assert_eq() {
  local expected="$1"
  local actual="$2"
  local label="$3"
  if [[ "$expected" != "$actual" ]]; then
    echo "[selftest] ${label}: expected '${expected}', got '${actual}'" >&2
    exit 1
  fi
}

compute_sha256() {
  openssl dgst -sha256 "$1" | awk '{print $2}'
}

create_gate_report() {
  local output_path="$1"
  cat >"$output_path" <<'EOF'
{"status":"pass","mode":"manual"}
EOF
}

create_manifest() {
  local output_path="$1"
  local release_id="$2"
  local created_at="$3"
  local commit_sha="$4"
  local gate_report_path="$5"
  local images_json="$6"
  local targets_json="$7"
  local unsigned_path="${output_path%.json}.unsigned.json"
  local gate_sha

  gate_sha="$(compute_sha256 "$gate_report_path")"

  jq -n \
    --arg schema_version "1" \
    --arg release_id "$release_id" \
    --arg commit_sha "$commit_sha" \
    --arg git_ref "$release_id" \
    --arg created_at "$created_at" \
    --arg gate_report_path "$gate_report_path" \
    --arg gate_report_sha "$gate_sha" \
    --argjson images "$images_json" \
    --argjson targets "$targets_json" \
    '{
      schema_version: $schema_version,
      release_id: $release_id,
      commit_sha: $commit_sha,
      git_ref: $git_ref,
      created_at: $created_at,
      gate_report: {
        path: $gate_report_path,
        sha256: $gate_report_sha
      },
      database_evidence: null,
      supply_chain_evidence: null,
      images: $images,
      targets: $targets
    }' >"$unsigned_path"

  "$SCRIPT_DIR/release-manifest-sign.sh" \
    --unsigned "$unsigned_path" \
    --output "$output_path" \
    --key-file "$KEY_FILE" >/dev/null
}

require_cmd jq
require_cmd openssl

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

KEY_FILE="$TMP_DIR/release-manifest.key"
printf 'praedixa-selftest-release-key\n' >"$KEY_FILE"
chmod 600 "$KEY_FILE"

MANIFEST_DIR="$TMP_DIR/manifests"
mkdir -p "$MANIFEST_DIR"

CURRENT_GATE="$TMP_DIR/current-gate.json"
PREVIOUS_GATE="$TMP_DIR/previous-gate.json"
OLDER_GATE="$TMP_DIR/older-gate.json"
CONNECTORS_CURRENT_GATE="$TMP_DIR/connectors-current-gate.json"
CONNECTORS_PREVIOUS_GATE="$TMP_DIR/connectors-previous-gate.json"

create_gate_report "$CURRENT_GATE"
create_gate_report "$PREVIOUS_GATE"
create_gate_report "$OLDER_GATE"
create_gate_report "$CONNECTORS_CURRENT_GATE"
create_gate_report "$CONNECTORS_PREVIOUS_GATE"

STAGING_TARGETS='{
  "staging": {
    "webapp": { "region": "fr-par", "container_name": "webapp-staging" },
    "admin": { "region": "fr-par", "container_name": "admin-staging" },
    "api": { "region": "fr-par", "container_name": "api-staging" }
  },
  "prod": {}
}'

create_manifest \
  "$MANIFEST_DIR/20260313T080000Z-older.json" \
  "20260313T080000Z-older" \
  "2026-03-13T08:00:00Z" \
  "1111111111111111111111111111111111111111" \
  "$OLDER_GATE" \
  '{"webapp":{"registry_image":"registry/praedixa/webapp@sha256:old1"},"admin":{"registry_image":"registry/praedixa/admin@sha256:old2"},"api":{"registry_image":"registry/praedixa/api@sha256:old3"}}' \
  "$STAGING_TARGETS"

create_manifest \
  "$MANIFEST_DIR/20260313T090000Z-previous.json" \
  "20260313T090000Z-previous" \
  "2026-03-13T09:00:00Z" \
  "2222222222222222222222222222222222222222" \
  "$PREVIOUS_GATE" \
  '{"webapp":{"registry_image":"registry/praedixa/webapp@sha256:prev1"},"admin":{"registry_image":"registry/praedixa/admin@sha256:prev2"},"api":{"registry_image":"registry/praedixa/api@sha256:prev3"}}' \
  "$STAGING_TARGETS"

create_manifest \
  "$MANIFEST_DIR/20260313T100000Z-current.json" \
  "20260313T100000Z-current" \
  "2026-03-13T10:00:00Z" \
  "3333333333333333333333333333333333333333" \
  "$CURRENT_GATE" \
  '{"webapp":{"registry_image":"registry/praedixa/webapp@sha256:cur1"},"admin":{"registry_image":"registry/praedixa/admin@sha256:cur2"},"api":{"registry_image":"registry/praedixa/api@sha256:cur3"}}' \
  "$STAGING_TARGETS"

PLAN_JSON="$(
  "$SCRIPT_DIR/scw-rollback-plan.sh" \
    --current-manifest "$MANIFEST_DIR/20260313T100000Z-current.json" \
    --manifest-dir "$MANIFEST_DIR" \
    --env staging \
    --services webapp,admin,api \
    --key-file "$KEY_FILE" \
    --format json
)"

assert_eq \
  "$MANIFEST_DIR/20260313T090000Z-previous.json" \
  "$(printf '%s' "$PLAN_JSON" | jq -r '.rollback_manifest.path')" \
  "manifest selection"

DRY_RUN_OUTPUT="$(
  "$SCRIPT_DIR/scw-rollback-execute.sh" \
    --current-manifest "$MANIFEST_DIR/20260313T100000Z-current.json" \
    --manifest-dir "$MANIFEST_DIR" \
    --env staging \
    --services webapp,admin,api \
    --key-file "$KEY_FILE" \
    --dry-run
)"

printf '%s' "$DRY_RUN_OUTPUT" | grep -q '20260313T090000Z-previous.json' || {
  echo "[selftest] rollback execute dry-run did not reference previous manifest" >&2
  exit 1
}

CONNECTORS_TARGETS='{"staging":{},"prod":{}}'

create_manifest \
  "$MANIFEST_DIR/20260313T110000Z-connectors-previous.json" \
  "20260313T110000Z-connectors-previous" \
  "2026-03-13T11:00:00Z" \
  "4444444444444444444444444444444444444444" \
  "$CONNECTORS_PREVIOUS_GATE" \
  '{"connectors":{"registry_image":"registry/praedixa/connectors@sha256:prevc"}}' \
  "$CONNECTORS_TARGETS"

create_manifest \
  "$MANIFEST_DIR/20260313T120000Z-connectors-current.json" \
  "20260313T120000Z-connectors-current" \
  "2026-03-13T12:00:00Z" \
  "5555555555555555555555555555555555555555" \
  "$CONNECTORS_CURRENT_GATE" \
  '{"connectors":{"registry_image":"registry/praedixa/connectors@sha256:curc"}}' \
  "$CONNECTORS_TARGETS"

CONNECTORS_PLAN="$(
  "$SCRIPT_DIR/scw-rollback-plan.sh" \
    --current-manifest "$MANIFEST_DIR/20260313T120000Z-connectors-current.json" \
    --previous-manifest "$MANIFEST_DIR/20260313T110000Z-connectors-previous.json" \
    --env staging \
    --services connectors \
    --target connectors=connectors-staging@fr-par \
    --key-file "$KEY_FILE" \
    --format json
)"

assert_eq \
  "connectors-staging" \
  "$(printf '%s' "$CONNECTORS_PLAN" | jq -r '.targets.connectors.container_name')" \
  "connectors target override"

echo "[selftest] OK: rollback plan and dry-run execution are reproducible"
