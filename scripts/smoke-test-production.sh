#!/bin/bash
# Praedixa API — Production smoke tests
#
# Verifies critical behaviors of the deployed API:
#   1. Versioned health endpoint is reachable and returns 200
#   2. Protected live endpoints reject unauthenticated requests (401)
#   3. CORS preflight accepts the canonical webapp origin for the target API host
#
# Usage:
#   ./scripts/smoke-test-production.sh                          # default: https://api.praedixa.com
#   API_URL=https://staging-api.praedixa.com ./scripts/smoke-test-production.sh
#   API_URL=https://custom-api.example WEBAPP_ORIGIN=https://custom-app.example ./scripts/smoke-test-production.sh
set -e

API_URL="${API_URL:-https://api.praedixa.com}"
WEBAPP_ORIGIN="${WEBAPP_ORIGIN:-}"
HEALTH_PATH="/api/v1/health"
PASS=0
FAIL=0

resolve_default_webapp_origin() {
    python3 - "$1" <<'PY'
from urllib.parse import urlsplit
import sys

host = (urlsplit(sys.argv[1]).hostname or "").lower()
mapping = {
    "api.praedixa.com": "https://app.praedixa.com",
    "staging-api.praedixa.com": "https://staging-app.praedixa.com",
}
print(mapping.get(host, ""))
PY
}

if [ -z "$WEBAPP_ORIGIN" ]; then
    WEBAPP_ORIGIN="$(resolve_default_webapp_origin "$API_URL")"
fi

if [ -z "$WEBAPP_ORIGIN" ]; then
    echo "Unable to infer WEBAPP_ORIGIN from API_URL=$API_URL. Set WEBAPP_ORIGIN explicitly." >&2
    exit 1
fi

echo "=== Praedixa API Smoke Tests ==="
echo "Target: $API_URL"
echo "Webapp origin: $WEBAPP_ORIGIN"
echo ""

# Helper: run a single test
run_test() {
    local name="$1"
    local expected="$2"
    local actual="$3"

    printf "  %-30s" "$name"
    if [ "$actual" = "$expected" ]; then
        echo "OK (HTTP $actual)"
        PASS=$((PASS + 1))
    else
        echo "FAIL (expected $expected, got $actual)"
        FAIL=$((FAIL + 1))
    fi
}

# 1. Health check — should return 200
echo "[1/3] Health check"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL$HEALTH_PATH")
run_test "GET $HEALTH_PATH" "200" "$HTTP_CODE"

# 2. Auth guard — unauthenticated request should return 401
echo "[2/3] Auth guard"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/live/dashboard/summary")
run_test "GET /api/v1/live/dashboard/summary" "401" "$HTTP_CODE"

# 3. CORS preflight — should return 200 for allowed origin
echo "[3/3] CORS preflight"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X OPTIONS \
    -H "Origin: $WEBAPP_ORIGIN" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: Authorization" \
    "$API_URL/api/v1/live/dashboard/summary")
run_test "OPTIONS /api/v1/live/dashboard/summary" "200" "$HTTP_CODE"

# Summary
echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
    exit 1
fi
