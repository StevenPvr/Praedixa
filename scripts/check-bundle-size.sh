#!/bin/sh
# check-bundle-size.sh — Measure and enforce bundle size limits
#
# Usage: scripts/check-bundle-size.sh <app-dir>
# Example: scripts/check-bundle-size.sh apps/webapp
#
# Checks:
#   1. Server handler (worker.js) gzip size < 3 MiB (Cloudflare Workers limit)
#   2. Client JS total < 500 KB (performance budget, warning only)
#
# Returns exit code 1 if server handler exceeds limit.
set -e

APP_DIR="${1:?Usage: check-bundle-size.sh <app-dir>}"
WORKER_FILE="${APP_DIR}/.open-next/worker.js"
CLIENT_DIR="${APP_DIR}/.next/static/chunks"

# Thresholds (in bytes)
SERVER_LIMIT=$((3 * 1024 * 1024))  # 3 MiB
CLIENT_WARN=$((500 * 1024))        # 500 KB

EXIT_CODE=0

# --- Server handler (gzip) ---
if [ -f "$WORKER_FILE" ]; then
  RAW_SIZE=$(wc -c < "$WORKER_FILE" | tr -d ' ')
  GZIP_SIZE=$(gzip -c "$WORKER_FILE" | wc -c | tr -d ' ')
  GZIP_KB=$((GZIP_SIZE / 1024))
  LIMIT_KB=$((SERVER_LIMIT / 1024))

  echo "Server handler: ${GZIP_KB} KB gzip (limit: ${LIMIT_KB} KB)"

  if [ "$GZIP_SIZE" -gt "$SERVER_LIMIT" ]; then
    echo "::error::Server handler exceeds 3 MiB gzip limit (${GZIP_KB} KB)"
    EXIT_CODE=1
  fi
else
  echo "::warning::Server handler not found at ${WORKER_FILE} — skipping server check"
fi

# --- Client JS (uncompressed total) ---
if [ -d "$CLIENT_DIR" ]; then
  # Sum all .js files in chunks directory
  CLIENT_SIZE=$(find "$CLIENT_DIR" -name '*.js' -exec cat {} + 2>/dev/null | wc -c | tr -d ' ')
  CLIENT_KB=$((CLIENT_SIZE / 1024))
  WARN_KB=$((CLIENT_WARN / 1024))

  echo "Client JS total: ${CLIENT_KB} KB (budget: ${WARN_KB} KB)"

  if [ "$CLIENT_SIZE" -gt "$CLIENT_WARN" ]; then
    echo "::warning::Client JS total exceeds ${WARN_KB} KB budget (${CLIENT_KB} KB)"
  fi
else
  echo "::warning::Client chunks not found at ${CLIENT_DIR} — skipping client check"
fi

exit $EXIT_CODE
