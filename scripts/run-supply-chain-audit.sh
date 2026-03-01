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

echo "[supply-chain] OK"
