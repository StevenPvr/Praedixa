#!/usr/bin/env bash
set -euo pipefail

IAC_ROOT_DEFAULT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/infra/opentofu"
IAC_ROOT="${IAC_ROOT:-$IAC_ROOT_DEFAULT}"
IAC_ENVIRONMENTS_DIR="${IAC_ENVIRONMENTS_DIR:-$IAC_ROOT/environments}"
IAC_CLI="${IAC_CLI:-}"

resolve_iac_cli() {
  if [ -n "$IAC_CLI" ]; then
    printf '%s\n' "$IAC_CLI"
    return 0
  fi

  if command -v tofu >/dev/null 2>&1; then
    printf '%s\n' "tofu"
    return 0
  fi

  if command -v terraform >/dev/null 2>&1; then
    printf '%s\n' "terraform"
    return 0
  fi

  return 1
}

require_iac_cli() {
  if ! resolve_iac_cli >/dev/null 2>&1; then
    echo "Missing IaC CLI: install OpenTofu ('tofu') or Terraform ('terraform')." >&2
    exit 1
  fi
}

iac_environment_dir() {
  local environment="$1"
  local environment_dir="$IAC_ENVIRONMENTS_DIR/$environment"

  if [ ! -d "$environment_dir" ]; then
    echo "Unknown IaC environment: $environment" >&2
    exit 1
  fi

  printf '%s\n' "$environment_dir"
}

iac_backend_config_path() {
  local environment="$1"

  if [ -n "${SCW_IAC_BACKEND_CONFIG_PATH:-}" ]; then
    printf '%s\n' "$SCW_IAC_BACKEND_CONFIG_PATH"
    return 0
  fi

  local environment_dir
  environment_dir="$(iac_environment_dir "$environment")"
  local backend_path="$environment_dir/backend.hcl"

  if [ -f "$backend_path" ]; then
    printf '%s\n' "$backend_path"
    return 0
  fi

  return 1
}

iac_environment_has_backend() {
  local environment="$1"
  iac_backend_config_path "$environment" >/dev/null 2>&1
}

iac_init_environment() {
  local environment="$1"
  local backend_mode="${2:-auto}"
  local cli
  cli="$(resolve_iac_cli)"

  local environment_dir
  environment_dir="$(iac_environment_dir "$environment")"

  local -a command=(
    "$cli"
    "-chdir=$environment_dir"
    init
    "-input=false"
    "-no-color"
  )

  case "$backend_mode" in
    false)
      command+=("-backend=false")
      ;;
    auto)
      if iac_environment_has_backend "$environment"; then
        command+=("-backend-config=$(iac_backend_config_path "$environment")")
      else
        command+=("-backend=false")
      fi
      ;;
    true)
      if ! iac_environment_has_backend "$environment"; then
        echo "Missing backend.hcl for IaC environment: $environment" >&2
        exit 1
      fi
      command+=("-backend-config=$(iac_backend_config_path "$environment")")
      ;;
    *)
      echo "Unsupported backend mode: $backend_mode" >&2
      exit 1
      ;;
  esac

  "${command[@]}" >/dev/null
}

iac_validate_environment() {
  local environment="$1"
  local cli
  cli="$(resolve_iac_cli)"
  local environment_dir
  environment_dir="$(iac_environment_dir "$environment")"

  iac_init_environment "$environment" false
  "$cli" "-chdir=$environment_dir" validate -no-color
}

iac_output_json() {
  local environment="$1"
  local output_name="$2"
  local cli
  cli="$(resolve_iac_cli)"
  local environment_dir
  environment_dir="$(iac_environment_dir "$environment")"

  iac_init_environment "$environment" true
  "$cli" "-chdir=$environment_dir" output -json "$output_name"
}
