#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/iac-state.sh"

if [ "$#" -lt 1 ] || [ "$#" -gt 3 ]; then
  echo "Usage: $0 <staging|prod> [--out <path>]" >&2
  exit 1
fi

ENVIRONMENT="$1"
shift
OUT_PATH=""

while (($# > 0)); do
  case "$1" in
    --out)
      OUT_PATH="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

require_iac_cli
IAC_BIN="$(resolve_iac_cli)"
ENV_DIR="$(iac_environment_dir "$ENVIRONMENT")"

if ! iac_environment_has_backend "$ENVIRONMENT"; then
  echo "Missing backend.hcl for IaC environment: $ENVIRONMENT" >&2
  exit 1
fi

iac_init_environment "$ENVIRONMENT" true

CMD=(
  "$IAC_BIN"
  "-chdir=$ENV_DIR"
  plan
  "-input=false"
  "-no-color"
)

if [[ -n "$OUT_PATH" ]]; then
  CMD+=("-out=$OUT_PATH")
fi

"${CMD[@]}"
