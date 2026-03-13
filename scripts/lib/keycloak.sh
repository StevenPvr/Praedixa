#!/usr/bin/env bash
set -euo pipefail

run_kcadm_with_password() {
  local password="$1"
  shift
  KC_CLI_PASSWORD="$password" "$@"
}
