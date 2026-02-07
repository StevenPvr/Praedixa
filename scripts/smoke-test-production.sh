#!/bin/bash
# Praedixa API — Production smoke tests
#
# Verifies critical behaviors of the deployed API:
#   1. Health endpoint is reachable and returns 200
#   2. Protected endpoints reject unauthenticated requests (401)
#   3. CORS preflight accepts the webapp origin
#
# Usage:
#   ./scripts/smoke-test-production.sh                          # default: https://api.praedixa.com
#   API_URL=https://staging-api.praedixa.com ./scripts/smoke-test-production.sh
set -e

API_URL="${API_URL:-https://api.praedixa.com}"
PASS=0
FAIL=0

echo "=== Praedixa API Smoke Tests ==="
echo "Target: $API_URL"
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
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
run_test "GET /health" "200" "$HTTP_CODE"

# 2. Auth guard — unauthenticated request should return 401
echo "[2/3] Auth guard"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/dashboard/summary")
run_test "GET /api/v1/dashboard/summary" "401" "$HTTP_CODE"

# 3. CORS preflight — should return 200 for allowed origin
echo "[3/3] CORS preflight"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X OPTIONS \
    -H "Origin: https://app.praedixa.com" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: Authorization" \
    "$API_URL/api/v1/dashboard/summary")
run_test "OPTIONS /api/v1/dashboard/summary" "200" "$HTTP_CODE"

# Summary
echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
    exit 1
fi
