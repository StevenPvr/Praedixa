#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source "${ROOT_DIR}/scripts/lib/pnpm.sh"

EXCEPTIONS_FILE="${ROOT_DIR}/scripts/npm-audit-exceptions.json"
AUDIT_OUTPUT="${ROOT_DIR}/.git/gate-work/npm-audit.json"
EVALUATED_OUTPUT="${ROOT_DIR}/.git/gate-work/npm-audit-evaluated.json"

fail() {
  echo "[npm-audit] $*" >&2
  exit 1
}

command -v jq >/dev/null 2>&1 || fail "Missing required command: jq"
setup_pnpm || fail "Missing pnpm (tried PATH, PNPM_HOME, local pnpm tools, corepack, npx)."
[[ -f "$EXCEPTIONS_FILE" ]] || fail "Missing exceptions file: ${EXCEPTIONS_FILE}"

jq -e '
  type == "object"
  and .version == 1
  and (.exceptions | type == "array")
  and all(.exceptions[];
    (.id | type == "string" and length > 0)
    and (.identifiers | type == "array" and length > 0)
    and all(.identifiers[]; type == "string" and length > 0)
    and (.ignoreUntil | type == "string" and test("^[0-9]{4}-[0-9]{2}-[0-9]{2}$"))
    and (.owner | type == "string" and length > 0)
    and (.reason | type == "string" and length > 0)
  )
' "$EXCEPTIONS_FILE" >/dev/null || fail "Invalid exceptions schema in ${EXCEPTIONS_FILE}"

today="$(date -u +%Y-%m-%d)"
expired_exceptions="$(jq --arg today "$today" '[.exceptions[] | select(.ignoreUntil < $today)]' "$EXCEPTIONS_FILE")"
expired_count="$(jq 'length' <<<"$expired_exceptions")"
if [[ "$expired_count" -gt 0 ]]; then
  echo "[npm-audit] Found expired exceptions. Review and renew/remove them:" >&2
  jq -r '.[] | "- \(.id) (expired: \(.ignoreUntil), owner: \(.owner))"' <<<"$expired_exceptions" >&2
  exit 1
fi

mkdir -p "${ROOT_DIR}/.git/gate-work"

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
  --argjson exceptions "$(cat "$EXCEPTIONS_FILE")" \
  --arg today "$today" \
  '
  def active_exceptions:
    $exceptions.exceptions | map(select(.ignoreUntil >= $today));

  .advisories
  | to_entries
  | map(
      . as $entry
      | ($entry.key | tostring) as $advisory_id
      | ($entry.value.github_advisory_id // "") as $ghsa
      | ($entry.value.cves // []) as $cves
      | ([ $advisory_id ] + (if $ghsa == "" then [] else [$ghsa] end) + $cves) as $observed_identifiers
      | {
          advisory_id: $advisory_id,
          ghsa: (if $ghsa == "" then null else $ghsa end),
          cves: $cves,
          module_name: ($entry.value.module_name // "unknown"),
          severity: ($entry.value.severity // "unknown"),
          title: ($entry.value.title // "n/a"),
          url: ($entry.value.url // ""),
          exception: (
            active_exceptions
            | map(
                select(
                  any(.identifiers[]; . as $identifier | $observed_identifiers | index($identifier))
                )
              )
            | .[0] // null
          )
        }
    )
  ' "$AUDIT_OUTPUT" >"$EVALUATED_OUTPUT"

unresolved_count="$(jq '[.[] | select(.exception == null)] | length' "$EVALUATED_OUTPUT")"

if [[ "$unresolved_count" -gt 0 ]]; then
  echo "[npm-audit] Unresolved vulnerabilities detected:" >&2
  jq -r '.[] | select(.exception == null) | "- [\(.severity)] \(.module_name): \(.title) (\(.ghsa // .advisory_id)) \(.url)"' "$EVALUATED_OUTPUT" >&2
  echo "[npm-audit] Full audit JSON: ${AUDIT_OUTPUT}" >&2
  echo "[npm-audit] Evaluated output: ${EVALUATED_OUTPUT}" >&2
  exit 1
fi

echo "[npm-audit] All findings are covered by active, time-bound exceptions:"
jq -r '.[] | "- [\(.severity)] \(.module_name): \(.ghsa // .advisory_id) ignored until \(.exception.ignoreUntil) (owner: \(.exception.owner))"' "$EVALUATED_OUTPUT"
