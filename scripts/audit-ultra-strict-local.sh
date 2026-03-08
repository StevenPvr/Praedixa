#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export UV_CACHE_DIR="${TMPDIR:-/tmp}/praedixa-uv-cache"
export UV_TOOL_DIR="${TMPDIR:-/tmp}/praedixa-uv-tools"
mkdir -p "$UV_CACHE_DIR" "$UV_TOOL_DIR"

fail() {
  echo "[audit-ultra-strict] $*" >&2
  exit 1
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

require_cmd() {
  local cmd="$1"
  if ! has_cmd "$cmd"; then
    fail "Missing required command '$cmd'."
  fi
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
    echo "[audit-ultra-strict] WARN: semgrep binary failed (rc=${rc}), trying uv tool..." >&2
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

run_checkov() {
  if has_cmd checkov; then
    checkov "$@"
    return
  fi
  if has_cmd uv; then
    uv tool run --from checkov checkov "$@"
    return
  fi
  fail "Checkov is not available (install checkov or uv)."
}

detect_terraform() {
  if find . -type f -name "*.tf" \
    -not -path "*/.terraform/*" \
    -not -path "./.claude/*" \
    -not -path "./.codex/*" | grep -q .; then
    HAS_TERRAFORM="true"
  else
    HAS_TERRAFORM="false"
  fi
}

scan_dirs=(
  .claude
  .codex
  .tools
  node_modules
  .next
  dist
  build
  .venv
  __pycache__
  .terraform
  coverage
  playwright-report
  test-results
)

while IFS= read -r git_dir; do
  repo_root="${git_dir%/.git}"
  normalized_root="${repo_root#./}"
  [[ -z "$normalized_root" ]] && continue
  scan_dirs+=("$normalized_root")
done < <(find . -mindepth 2 -type d -name .git -prune -print)

skip_dir_args=()
for d in "${scan_dirs[@]}"; do
  skip_dir_args+=(--skip-dirs "$d")
done

echo "[audit-ultra-strict] Detecting project layout..."
detect_terraform

echo "[audit-ultra-strict] Checking required tools..."
require_cmd trivy
if [[ "$HAS_TERRAFORM" == "true" ]]; then
  require_cmd terraform
  require_cmd tflint
fi

echo "[audit-ultra-strict] Semgrep..."
run_semgrep --error --config scripts/semgrep/custom-critical-rules.yml .

echo "[audit-ultra-strict] Trivy secrets..."
trivy fs "${skip_dir_args[@]}" \
  --scanners secret \
  --severity UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL \
  --exit-code 1 \
  --ignorefile .trivyignore \
  .

echo "[audit-ultra-strict] Trivy vulnerabilities..."
trivy fs "${skip_dir_args[@]}" \
  --scanners vuln \
  --severity UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL \
  --exit-code 1 \
  --ignorefile .trivyignore \
  .

echo "[audit-ultra-strict] Checkov..."
run_checkov \
  --directory . \
  --framework terraform,github_actions,dockerfile \
  --config-file .checkov.yml \
  --quiet

echo "[audit-ultra-strict] Trivy misconfig..."
trivy config "${skip_dir_args[@]}" \
  --severity UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL \
  --exit-code 1 \
  .

if [[ "$HAS_TERRAFORM" == "true" ]]; then
  echo "[audit-ultra-strict] Terraform fmt..."
  terraform fmt -check -recursive

  echo "[audit-ultra-strict] Terraform validate..."
  mapfile -t tf_dirs < <(find . -type f -name "*.tf" \
    -not -path "*/.terraform/*" \
    -not -path "./.claude/*" \
    -not -path "./.codex/*" \
    -print0 | xargs -0 -n1 dirname | sort -u)
  for d in "${tf_dirs[@]}"; do
    echo "  - validate $d"
    (
      cd "$d"
      terraform init -backend=false -upgrade=false -input=false >/dev/null
      terraform validate
    )
  done

  echo "[audit-ultra-strict] TFLint..."
  tflint --init
  tflint --recursive -f compact
fi

echo "[audit-ultra-strict] OK"
