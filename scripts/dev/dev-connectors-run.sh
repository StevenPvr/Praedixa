#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUN_MODE="watch"

if [[ "${1:-}" == "--once" ]]; then
  RUN_MODE="once"
  shift
fi

if [[ "$#" -gt 0 ]]; then
  echo "Usage: dev-connectors-run.sh [--once]" >&2
  exit 1
fi

source "${ROOT_DIR}/scripts/lib/local-env.sh"

autofill_database_url_from_local_env "${ROOT_DIR}"
autofill_connectors_runtime_token_from_local_env "${ROOT_DIR}"
autofill_connectors_service_tokens_from_local_env "${ROOT_DIR}"

if [[ "$RUN_MODE" == "once" ]]; then
  cd "${ROOT_DIR}/app-connectors"
  exec node --import tsx src/index.ts
fi

cd "${ROOT_DIR}/app-connectors"
exec node --watch --import tsx src/index.ts
