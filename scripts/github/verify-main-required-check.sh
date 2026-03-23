#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo "[verify-main-required-check] $*" >&2
  exit 1
}

command -v gh >/dev/null 2>&1 || fail "Missing required command 'gh'."
command -v jq >/dev/null 2>&1 || fail "Missing required command 'jq'."

REPO="${GITHUB_REPOSITORY:-StevenPvr/Praedixa}"
REF="${1:-main}"
CHECK_NAME="${REQUIRED_CHECK_NAME:-Autorite - Required}"

payload="$(gh api -H "Accept: application/vnd.github+json" "repos/${REPO}/commits/${REF}/check-runs")"

jq -e --arg check_name "$CHECK_NAME" '
  [
    .check_runs[]
    | select(.name == $check_name and .status == "completed" and .conclusion == "success")
  ] | length > 0
' >/dev/null <<<"$payload" || fail "Required check ${CHECK_NAME} is not green on ${REPO}:${REF}."

echo "[verify-main-required-check] OK (${REPO}:${REF} -> ${CHECK_NAME})"
