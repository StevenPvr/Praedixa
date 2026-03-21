#!/usr/bin/env bash
set -euo pipefail

create_kcadm_config_file() {
  mktemp "${TMPDIR:-/tmp}/kcadm.XXXXXX"
}

run_kcadm_with_password() {
  local password="$1"
  shift
  KC_CLI_PASSWORD="$password" "$@"
}
