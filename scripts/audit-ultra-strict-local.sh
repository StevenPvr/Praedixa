#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

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
  if has_cmd semgrep; then
    semgrep "$@"
    return
  fi
  if has_cmd uv; then
    uv tool run --from semgrep semgrep "$@"
    return
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
run_semgrep scan --config auto --error

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
