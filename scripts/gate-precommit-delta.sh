#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export UV_CACHE_DIR="${TMPDIR:-/tmp}/praedixa-uv-cache"
export UV_TOOL_DIR="${TMPDIR:-/tmp}/praedixa-uv-tools"
mkdir -p "$UV_CACHE_DIR" "$UV_TOOL_DIR"

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
    echo "[precommit-delta] WARN: semgrep binary failed (rc=${rc}), trying uv tool..." >&2
  fi
  if has_cmd uv; then
    set +e
    env "${semgrep_env[@]}" uv tool run --from semgrep semgrep --metrics=off --disable-version-check "$@"
    local rc=$?
    set -e
    if [[ "$rc" -eq 0 || "$rc" -eq 1 ]]; then
      return "$rc"
    fi
    echo "[precommit-delta] Semgrep unavailable (binary + uv fallback failed, rc=${rc})." >&2
    exit 1
  fi
  echo "[precommit-delta] Missing semgrep (install semgrep or uv)." >&2
  exit 1
}

run_gitleaks() {
  if has_cmd gitleaks; then
    gitleaks git --staged --redact --exit-code 1 --config .gitleaks.toml .
    return
  fi
  echo "[precommit-delta] Missing gitleaks command." >&2
  exit 1
}

mapfile -t STAGED_FILES < <(git diff --cached --name-only --diff-filter=ACMR)

echo "[precommit-delta] Validating security exceptions..."
python3 scripts/validate-security-exceptions.py --quiet

echo "[precommit-delta] Secret scanning on staged diff..."
run_gitleaks

echo "[precommit-delta] Sensitive-file guardrails..."
python3 scripts/check-sensitive-diff-tests.py --allow-empty-diff

echo "[precommit-delta] Invariant coverage (staged)..."
python3 scripts/check-security-invariants.py --mode staged

echo "[precommit-delta] Production config guard (staged)..."
python3 scripts/check-prod-security-config.py --mode staged

if [[ ${#STAGED_FILES[@]} -eq 0 ]]; then
  echo "[precommit-delta] No staged files to scan with Semgrep"
  exit 0
fi

SEMgrep_TARGETS=()
for file in "${STAGED_FILES[@]}"; do
  case "$file" in
    *.py|*.js|*.jsx|*.ts|*.tsx|*.mjs|*.cjs)
      if [[ -f "$file" ]]; then
        SEMgrep_TARGETS+=("$file")
      fi
      ;;
  esac
done

if [[ ${#SEMgrep_TARGETS[@]} -eq 0 ]]; then
  echo "[precommit-delta] No JS/TS/Python staged files for Semgrep"
  exit 0
fi

echo "[precommit-delta] Semgrep diff scan (${#SEMgrep_TARGETS[@]} file(s))..."
run_semgrep \
  --error \
  --config scripts/semgrep/custom-critical-rules.yml \
  "${SEMgrep_TARGETS[@]}"

echo "[precommit-delta] OK"
