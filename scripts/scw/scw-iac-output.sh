#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/iac-state.sh"

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <staging|prod> <output-name>" >&2
  exit 1
fi

ENVIRONMENT="$1"
OUTPUT_NAME="$2"

require_iac_cli
iac_output_json "$ENVIRONMENT" "$OUTPUT_NAME"
