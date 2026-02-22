#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source "${ROOT_DIR}/scripts/lib/pnpm.sh"

WORK_DIR="${ROOT_DIR}/.git/gate-work"
if ! mkdir -p "${WORK_DIR}" 2>/dev/null || ! touch "${WORK_DIR}/.write-test" 2>/dev/null; then
  WORK_DIR="${TMPDIR:-/tmp}/praedixa-gate-work"
  mkdir -p "${WORK_DIR}"
else
  rm -f "${WORK_DIR}/.write-test"
fi

AUDIT_OUTPUT="${WORK_DIR}/npm-audit.json"
EVALUATED_OUTPUT="${WORK_DIR}/npm-audit-evaluated.json"

fail() {
  echo "[npm-audit] $*" >&2
  exit 1
}

command -v jq >/dev/null 2>&1 || fail "Missing required command: jq"
setup_pnpm || fail "Missing pnpm (tried PATH, PNPM_HOME, local pnpm tools, corepack, npx)."

python3 scripts/validate-security-exceptions.py --quiet || fail "Invalid security exceptions"
ACTIVE_IDENTIFIERS_JSON="$(python3 scripts/validate-security-exceptions.py --tool npm-audit --emit-identifiers --quiet)"

echo "[npm-audit] Active exception identifiers: $(jq 'length' <<<"$ACTIVE_IDENTIFIERS_JSON")"

set +e
pnpm audit --audit-level=low --ignore-registry-errors --json >"$AUDIT_OUTPUT"
audit_rc=$?
set -e

if [[ "$audit_rc" -eq 0 ]]; then
  echo "[npm-audit] OK (no vulnerabilities at or above low)."
  exit 0
fi

jq -e 'type == "object" and (.advisories | type == "object")' "$AUDIT_OUTPUT" >/dev/null || fail "pnpm audit failed and produced an unexpected JSON shape (see ${AUDIT_OUTPUT})"

jq \
  --argjson active_ids "$ACTIVE_IDENTIFIERS_JSON" \
  '
  .advisories
  | to_entries
  | map(
      . as $entry
      | ($entry.key | tostring) as $advisory_id
      | ($entry.value.github_advisory_id // "") as $ghsa
      | ($entry.value.cves // []) as $cves
      | ([ $advisory_id ] + (if $ghsa == "" then [] else [$ghsa] end) + $cves) as $observed_identifiers
      | ((
          ($entry.value.severity // "unknown")
          | ascii_downcase
          | if . == "moderate" then "medium" else . end
        )) as $severity
      | {
          advisory_id: $advisory_id,
          ghsa: (if $ghsa == "" then null else $ghsa end),
          cves: $cves,
          module_name: ($entry.value.module_name // "unknown"),
          severity: $severity,
          title: ($entry.value.title // "n/a"),
          url: ($entry.value.url // ""),
          excepted: any($observed_identifiers[]; $active_ids | index(.))
        }
    )
  ' "$AUDIT_OUTPUT" >"$EVALUATED_OUTPUT"

blocking_count="$(jq '[.[] | select(.excepted == false) | select(.severity == "critical" or .severity == "high" or .severity == "medium" or .severity == "unknown")] | length' "$EVALUATED_OUTPUT")"
non_blocking_low_count="$(jq '[.[] | select(.excepted == false and .severity == "low")] | length' "$EVALUATED_OUTPUT")"

if [[ "$non_blocking_low_count" -gt 0 ]]; then
  echo "[npm-audit] Non-blocking LOW vulnerabilities (ticket+SLA required):" >&2
  jq -r '.[] | select(.excepted == false and .severity == "low") | "- [LOW] \(.module_name): \(.title) (\(.ghsa // .advisory_id)) \(.url)"' "$EVALUATED_OUTPUT" >&2
fi

if [[ "$blocking_count" -gt 0 ]]; then
  echo "[npm-audit] Blocking vulnerabilities detected (MEDIUM+ or UNKNOWN):" >&2
  jq -r '.[] | select(.excepted == false) | select(.severity == "critical" or .severity == "high" or .severity == "medium" or .severity == "unknown") | "- [\(.severity | ascii_upcase)] \(.module_name): \(.title) (\(.ghsa // .advisory_id)) \(.url)"' "$EVALUATED_OUTPUT" >&2
  echo "[npm-audit] Full audit JSON: ${AUDIT_OUTPUT}" >&2
  echo "[npm-audit] Evaluated output: ${EVALUATED_OUTPUT}" >&2
  exit 1
fi

echo "[npm-audit] OK (no unresolved MEDIUM+ vulnerabilities)"
