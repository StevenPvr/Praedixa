#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

source "${ROOT_DIR}/scripts/lib/local-env.sh"

autofill_database_url_from_local_env "${ROOT_DIR}"
autofill_keycloak_admin_username_from_local_env "${ROOT_DIR}"
autofill_keycloak_admin_password_from_local_env "${ROOT_DIR}"

exec pnpm --dir "${ROOT_DIR}/app-api-ts" dev
