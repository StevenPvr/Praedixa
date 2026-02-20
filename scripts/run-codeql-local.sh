#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v codeql >/dev/null 2>&1; then
  echo "[codeql] Missing codeql CLI" >&2
  exit 1
fi

WORK_DIR="${ROOT_DIR}/.git/gate-work/codeql"
ARTIFACT_DIR="${ROOT_DIR}/.git/gate-reports/artifacts"
mkdir -p "$WORK_DIR" "$ARTIFACT_DIR"
rm -rf "${WORK_DIR:?}"/*

JS_DB="${WORK_DIR}/js-db"
PY_DB="${WORK_DIR}/py-db"
JS_OUT="${ARTIFACT_DIR}/codeql-javascript.sarif"
PY_OUT="${ARTIFACT_DIR}/codeql-python.sarif"

QUERY_REPO_DIR="${ROOT_DIR}/.tools/codeql-queries"

ensure_local_query_repo() {
  if [[ -d "${QUERY_REPO_DIR}/.git" ]]; then
    echo "[codeql] Updating local query repo fallback..." >&2
    git -C "$QUERY_REPO_DIR" fetch --depth 1 origin HEAD >&2
    git -C "$QUERY_REPO_DIR" reset --hard FETCH_HEAD >&2
  else
    echo "[codeql] Cloning local query repo fallback..." >&2
    rm -rf "$QUERY_REPO_DIR"
    git clone --depth 1 --filter=blob:none --sparse https://github.com/github/codeql.git "$QUERY_REPO_DIR" >&2
  fi

  git -C "$QUERY_REPO_DIR" sparse-checkout set javascript/ql python/ql shared misc >&2
}

resolve_query_suite() {
  local pack_suite="$1"
  local fallback_suite="$2"

  if codeql resolve queries "$pack_suite" >/dev/null 2>&1; then
    printf '%s' "$pack_suite"
    return 0
  fi

  echo "[codeql] Pack suite unavailable ($pack_suite), using local fallback..." >&2
  ensure_local_query_repo

  if [[ ! -f "$fallback_suite" ]]; then
    echo "[codeql] Missing fallback suite: $fallback_suite" >&2
    exit 1
  fi

  printf '%s' "$fallback_suite"
}

run_analyze() {
  local db_path="$1"
  local suite_ref="$2"
  local output_path="$3"

  if [[ "$suite_ref" == codeql/* ]]; then
    codeql database analyze "$db_path" \
      "$suite_ref" \
      --format=sarif-latest \
      --output "$output_path"
  else
    codeql database analyze "$db_path" \
      "$suite_ref" \
      --additional-packs "$QUERY_REPO_DIR" \
      --format=sarif-latest \
      --output "$output_path"
  fi
}

echo "[codeql] Creating JavaScript/TypeScript database..."
codeql database create "$JS_DB" \
  --language=javascript-typescript \
  --source-root "$ROOT_DIR"

JS_SUITE="$(resolve_query_suite \
  "codeql/javascript-queries:codeql-suites/javascript-security-and-quality.qls" \
  "${QUERY_REPO_DIR}/javascript/ql/src/codeql-suites/javascript-security-and-quality.qls")"

echo "[codeql] Analyzing JavaScript/TypeScript..."
run_analyze "$JS_DB" "$JS_SUITE" "$JS_OUT"

echo "[codeql] Creating Python database..."
codeql database create "$PY_DB" \
  --language=python \
  --source-root "${ROOT_DIR}/app-api"

PY_SUITE="$(resolve_query_suite \
  "codeql/python-queries:codeql-suites/python-security-and-quality.qls" \
  "${QUERY_REPO_DIR}/python/ql/src/codeql-suites/python-security-and-quality.qls")"

echo "[codeql] Analyzing Python..."
run_analyze "$PY_DB" "$PY_SUITE" "$PY_OUT"

echo "[codeql] OK"
