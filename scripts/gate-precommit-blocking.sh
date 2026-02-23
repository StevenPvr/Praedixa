#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[precommit-blocking] Security delta checks..."
./scripts/gate-precommit-delta.sh

echo "[precommit-blocking] Unit + E2E tests..."
./scripts/gate-precommit-tests.sh

echo "[precommit-blocking] OK"
