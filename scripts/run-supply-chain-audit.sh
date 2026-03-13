#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo "[supply-chain] $*" >&2
  exit 1
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    fail "Missing required command '$cmd'. Install it before pushing."
  fi
}

require_cmd syft
require_cmd grype
require_cmd jq

ARTIFACT_DIR="${ROOT_DIR}/.git/gate-reports/artifacts"
WORK_DIR="${ROOT_DIR}/.git/gate-work"
if ! mkdir -p "$ARTIFACT_DIR" "$WORK_DIR" 2>/dev/null; then
  ARTIFACT_DIR="${TMPDIR:-/tmp}/praedixa-gate-artifacts"
  WORK_DIR="${TMPDIR:-/tmp}/praedixa-gate-work"
  mkdir -p "$ARTIFACT_DIR" "$WORK_DIR"
fi
if [[ ! -w "$ARTIFACT_DIR" || ! -w "$WORK_DIR" ]]; then
  ARTIFACT_DIR="${TMPDIR:-/tmp}/praedixa-gate-artifacts"
  WORK_DIR="${TMPDIR:-/tmp}/praedixa-gate-work"
  mkdir -p "$ARTIFACT_DIR" "$WORK_DIR"
fi

SBOM_PATH="${ARTIFACT_DIR}/sbom.cdx.json"
GRYPE_JSON="${ARTIFACT_DIR}/grype-findings.json"
SUMMARY_JSON="${ARTIFACT_DIR}/supply-chain-evidence.json"

SYFT_EXCLUDES=(
  "./.git/**"
  "./.tools/**"
  "./.venv/**"
  "./app-api/.venv/**"
  "./node_modules/**"
  "./.next/**"
  "./app-landing/.next/**"
  "./app-webapp/.next/**"
  "./app-admin/.next/**"
  "./.open-next/**"
  "./app-landing/.open-next/**"
  "./app-webapp/.open-next/**"
  "./app-admin/.open-next/**"
  "./coverage/**"
  "./test-results/**"
  "./playwright-report/**"
  "./.claude/**"
  "./.codex/**"
  "./pnpm-lock.yaml"
  "./uv.lock"
  "./app-api/uv.lock"
)

append_nested_repo_excludes() {
  while IFS= read -r git_dir; do
    local repo_root="${git_dir%/.git}"
    local normalized_root="${repo_root#./}"
    [[ -z "$normalized_root" ]] && continue
    SYFT_EXCLUDES+=("./${normalized_root}/**")
  done < <(find . -mindepth 2 -type d -name .git -prune -print)
}

append_nested_repo_excludes

compute_sha256() {
  openssl dgst -sha256 "$1" | awk '{print $2}'
}

tool_version() {
  local cmd="$1"
  local output=""
  if output="$("$cmd" version 2>/dev/null | head -n 1)"; then
    :
  elif output="$("$cmd" --version 2>/dev/null | head -n 1)"; then
    :
  fi
  printf '%s' "$output"
}

# Generate a CycloneDX SBOM for traceability and incident response.
echo "[supply-chain] Generating SBOM..."
syft_args=(dir:. -o "cyclonedx-json=${SBOM_PATH}")
for exclude in "${SYFT_EXCLUDES[@]}"; do
  syft_args+=(--exclude "$exclude")
done
SYFT_CHECK_FOR_APP_UPDATE=false syft "${syft_args[@]}" >/dev/null

# Fail on medium+ vulnerabilities to match gate policy.
echo "[supply-chain] Scanning SBOM with grype (fail-on=medium)..."
GRYPE_CHECK_FOR_APP_UPDATE=false grype "sbom:${SBOM_PATH}" --fail-on medium -o json >"$GRYPE_JSON"

ACTIVE_SIGNAL_COUNT="$(jq '[.matches[] | select((.vulnerability.id // "") != "") | select(.vulnerability.id | test("CVE-|GHSA-"))] | length' "$GRYPE_JSON")"
echo "[supply-chain] Findings with known IDs: ${ACTIVE_SIGNAL_COUNT}"

jq -n \
  --arg summary_type "supply-chain-evidence" \
  --arg schema_version "1" \
  --arg recorded_at "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  --arg status "pass" \
  --arg syft_version "$(tool_version syft)" \
  --arg grype_version "$(tool_version grype)" \
  --arg sbom_path "$SBOM_PATH" \
  --arg sbom_sha256 "$(compute_sha256 "$SBOM_PATH")" \
  --arg scan_path "$GRYPE_JSON" \
  --arg scan_sha256 "$(compute_sha256 "$GRYPE_JSON")" \
  --argjson active_signal_count "$ACTIVE_SIGNAL_COUNT" \
  '{
    summary_type: $summary_type,
    schema_version: $schema_version,
    recorded_at: $recorded_at,
    status: $status,
    policy: {
      vulnerability_fail_on: "medium"
    },
    tools: ({
      syft: $syft_version,
      grype: $grype_version
    } | with_entries(select(.value != ""))),
    artifacts: {
      sbom: {
        format: "cyclonedx-json",
        path: $sbom_path,
        sha256: $sbom_sha256
      },
      vulnerability_scan: {
        engine: "grype",
        path: $scan_path,
        sha256: $scan_sha256,
        active_signal_count: $active_signal_count
      }
    }
  }' >"$SUMMARY_JSON"

echo "[supply-chain] Evidence summary: ${SUMMARY_JSON}"

echo "[supply-chain] OK"
