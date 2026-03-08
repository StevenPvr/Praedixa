#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source "${ROOT_DIR}/scripts/lib/pnpm.sh"

export UV_CACHE_DIR="${TMPDIR:-/tmp}/praedixa-uv-cache"
export UV_TOOL_DIR="${TMPDIR:-/tmp}/praedixa-uv-tools"
mkdir -p "$UV_CACHE_DIR" "$UV_TOOL_DIR"

fail() {
  echo "[prepush-deep] $*" >&2
  exit 1
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

run_semgrep() {
  local semgrep_home="${TMPDIR:-/tmp}/praedixa-semgrep-home"
  mkdir -p "${semgrep_home}/config" "${semgrep_home}/cache" "${semgrep_home}/logs"

  local cert_path=""
  if has_cmd python3; then
    cert_path="$(python3 -c 'import certifi; print(certifi.where())' 2>/dev/null || true)"
  fi

  local -a semgrep_env=(
    "HOME=${semgrep_home}"
    "XDG_CONFIG_HOME=${semgrep_home}/config"
    "XDG_CACHE_HOME=${semgrep_home}/cache"
    "SEMGREP_LOG_FILE=${semgrep_home}/logs/semgrep.log"
    "SEMGREP_SETTINGS_FILE=${semgrep_home}/config/settings.yml"
    "SEMGREP_SEND_METRICS=off"
    "SEMGREP_ENABLE_VERSION_CHECK=0"
  )
  if [[ -n "$cert_path" && -f "$cert_path" ]]; then
    semgrep_env+=(
      "SSL_CERT_FILE=${cert_path}"
      "REQUESTS_CA_BUNDLE=${cert_path}"
      "CURL_CA_BUNDLE=${cert_path}"
      "X509_CERT_FILE=${cert_path}"
    )
  fi

  if has_cmd semgrep; then
    set +e
    env "${semgrep_env[@]}" semgrep --metrics=off --disable-version-check "$@"
    local rc=$?
    set -e
    if [[ "$rc" -eq 0 || "$rc" -eq 1 ]]; then
      return "$rc"
    fi
    echo "[prepush-deep] WARN: semgrep binary failed (rc=${rc}), trying uv tool..." >&2
  fi
  if has_cmd uv; then
    set +e
    env "${semgrep_env[@]}" uv tool run --from semgrep semgrep --metrics=off --disable-version-check "$@"
    local rc=$?
    set -e
    if [[ "$rc" -eq 0 || "$rc" -eq 1 ]]; then
      return "$rc"
    fi
    fail "Semgrep unavailable (binary + uv fallback failed, rc=${rc})."
  fi
  fail "Semgrep is not available (install semgrep or uv)."
}

require_cmd() {
  local cmd="$1"
  if ! has_cmd "$cmd"; then
    fail "Missing required command '$cmd'."
  fi
}

setup_pnpm || fail "Missing pnpm (tried PATH, PNPM_HOME, local pnpm tools, corepack, npx)."
require_cmd jq
require_cmd uv
require_cmd trivy
require_cmd checkov
require_cmd osv-scanner

echo "[prepush-deep] Validate policy + exceptions..."
python3 scripts/validate-security-exceptions.py --quiet

echo "[prepush-deep] Semgrep project scan..."
run_semgrep --error --config scripts/semgrep/custom-critical-rules.yml .

echo "[prepush-deep] NPM audit..."
./scripts/run-npm-audit.sh

echo "[prepush-deep] Python dependency audit..."
(
  cd app-api
  uv run pip-audit --skip-editable
)

echo "[prepush-deep] OSV scan..."
./scripts/run-osv-scan.sh

echo "[prepush-deep] Supply chain scan + SBOM..."
./scripts/run-supply-chain-audit.sh

echo "[prepush-deep] IaC/config baseline audits..."
./scripts/audit-ultra-strict-local.sh

echo "[prepush-deep] Production config guard (full)..."
python3 scripts/check-prod-security-config.py --mode full

echo "[prepush-deep] Type + lint checks for API TS..."
pnpm --filter @praedixa/api-ts typecheck
pnpm --filter @praedixa/api-ts lint

echo "[prepush-deep] Build shared workspace packages..."
pnpm --filter @praedixa/shared-types build
pnpm --filter @praedixa/ui build

echo "[prepush-deep] Targeted frontend security tests..."
pnpm vitest run \
  app-webapp/lib/security/__tests__/csp.test.ts \
  app-admin/lib/security/__tests__/csp.test.ts \
  app-landing/lib/security/__tests__/csp.test.ts \
  app-webapp/app/auth/login/__tests__/route.test.ts \
  app-admin/app/auth/login/__tests__/route.test.ts

echo "[prepush-deep] OK"
