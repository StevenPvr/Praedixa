#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

COMMIT_SHA="${GITHUB_SHA:-$(git rev-parse HEAD)}"
REPORT_PATH="${ROOT_DIR}/.git/gate-reports/${COMMIT_SHA}.json"

echo "[ci-authoritative] Security delta gate..."
uv run --with pyyaml bash ./scripts/gates/gate-precommit-delta.sh

echo "[ci-authoritative] Exhaustive signed gate..."
uv run --with pyyaml bash ./scripts/gates/gate-exhaustive-local.sh --mode manual --report-path "${REPORT_PATH}"

echo "[ci-authoritative] Signed report verification..."
uv run --with pyyaml bash ./scripts/gates/verify-gate-report.sh \
  --report-path "${REPORT_PATH}" \
  --mode manual \
  --max-age-seconds 21600

echo "[ci-authoritative] Runtime secret contract..."
node scripts/validate-runtime-secret-inventory.mjs
node scripts/validate-runtime-env-inventory.mjs
node scripts/validate-runtime-env-contracts.mjs
node scripts/validate-build-ready-status.mjs
node scripts/validate-github-workflow-pnpm-order.mjs
node scripts/validate-turbo-env-coverage.mjs

echo "[ci-authoritative] Durable release-contract tests..."
node --test \
  scripts/__tests__/validate-build-ready-status.test.mjs \
  scripts/__tests__/validate-github-workflow-pnpm-order.test.mjs \
  scripts/__tests__/validate-turbo-env-coverage.test.mjs \
  scripts/__tests__/runtime-env-contracts.test.mjs \
  scripts/__tests__/validate-runtime-env-inventory.test.mjs \
  scripts/__tests__/validate-runtime-secret-inventory.test.mjs \
  scripts/__tests__/release-manifest-gate-report.test.mjs \
  scripts/__tests__/release-manifest-logging.test.mjs \
  scripts/__tests__/release-manifest-supply-chain.test.mjs \
  scripts/__tests__/control-plane-restore-evidence.test.mjs

echo "[ci-authoritative] Build-ready report..."
node scripts/generate-build-ready-report.mjs --sha "${COMMIT_SHA}"

echo "[ci-authoritative] OK"
