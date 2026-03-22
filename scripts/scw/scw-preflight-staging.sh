#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export DNS_DELEGATION_MODE="${DNS_DELEGATION_MODE:-strict}"

exec "$SCRIPT_DIR/scw-preflight-deploy.sh" staging
