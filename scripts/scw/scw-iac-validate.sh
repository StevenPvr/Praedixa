#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/../lib/iac-state.sh"

TARGET="${1:-all}"

case "$TARGET" in
  staging|prod|all) ;;
  *)
    echo "Usage: $0 [staging|prod|all]" >&2
    exit 1
    ;;
esac

require_iac_cli
IAC_BIN="$(resolve_iac_cli)"

echo "[iac] validating root contract with ${IAC_BIN}"
"$IAC_BIN" -chdir="$REPO_ROOT/infra/opentofu" init -backend=false -input=false -no-color >/dev/null
"$IAC_BIN" -chdir="$REPO_ROOT/infra/opentofu" validate -no-color

validate_env() {
  local environment="$1"
  echo "[iac] validating environment ${environment}"
  iac_validate_environment "$environment"
}

if [[ "$TARGET" == "all" || "$TARGET" == "staging" ]]; then
  validate_env "staging"
fi

if [[ "$TARGET" == "all" || "$TARGET" == "prod" ]]; then
  validate_env "prod"
fi

echo "[iac] OK"
