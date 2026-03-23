#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo "[verify-main-branch-protection] $*" >&2
  exit 1
}

command -v gh >/dev/null 2>&1 || fail "Missing required command 'gh'."
command -v jq >/dev/null 2>&1 || fail "Missing required command 'jq'."

REPO="${GITHUB_REPOSITORY:-StevenPvr/Praedixa}"
BRANCH="${1:-main}"

payload="$(gh api "repos/${REPO}/branches/${BRANCH}/protection")"

jq -e '
  .required_status_checks.strict == true
  and ((.required_status_checks.contexts // []) | index("Autorite - Required") != null)
  and (.required_pull_request_reviews.required_approving_review_count // 0) == 1
  and .required_conversation_resolution.enabled == true
  and .required_linear_history.enabled == true
  and .allow_force_pushes.enabled == false
  and .allow_deletions.enabled == false
' >/dev/null <<<"$payload" || fail "Branch ${BRANCH} on ${REPO} does not match the required policy."

echo "[verify-main-branch-protection] OK (${REPO}:${BRANCH})"
