#!/usr/bin/env bash
set -euo pipefail

resolve_pnpm_descriptor() {
  local candidate=""

  if command -v pnpm >/dev/null 2>&1; then
    candidate="$(command -v pnpm)"
    if "${candidate}" --version >/dev/null 2>&1; then
      printf 'bin:%s\n' "${candidate}"
      return 0
    fi
  fi

  if [[ -n "${PNPM_HOME:-}" && -x "${PNPM_HOME}/pnpm" ]]; then
    candidate="${PNPM_HOME}/pnpm"
    if "${candidate}" --version >/dev/null 2>&1; then
      printf 'bin:%s\n' "${candidate}"
      return 0
    fi
  fi

  if [[ -x "${HOME}/Library/pnpm/pnpm" ]]; then
    candidate="${HOME}/Library/pnpm/pnpm"
    if "${candidate}" --version >/dev/null 2>&1; then
      printf 'bin:%s\n' "${candidate}"
      return 0
    fi
  fi

  local tools_root="${HOME}/Library/pnpm/.tools/pnpm"
  if [[ -d "${tools_root}" ]]; then
    local latest_version
    latest_version="$(ls -1 "${tools_root}" 2>/dev/null | sort -V | tail -n 1 || true)"
    if [[ -n "${latest_version}" && -x "${tools_root}/${latest_version}/bin/pnpm" ]]; then
      candidate="${tools_root}/${latest_version}/bin/pnpm"
      if "${candidate}" --version >/dev/null 2>&1; then
        printf 'bin:%s\n' "${candidate}"
        return 0
      fi
    fi
  fi

  if command -v corepack >/dev/null 2>&1; then
    printf 'corepack\n'
    return 0
  fi

  if command -v npx >/dev/null 2>&1; then
    printf 'npx\n'
    return 0
  fi

  return 1
}

setup_pnpm() {
  local descriptor
  if ! descriptor="$(resolve_pnpm_descriptor)"; then
    return 1
  fi

  local wrapper_dir=""
  local wrapper_path=""
  case "${descriptor}" in
    bin:*)
      PNPM_MODE="bin"
      PNPM_BIN="${descriptor#bin:}"
      export PATH="$(dirname "${PNPM_BIN}"):${PATH}"
      ;;
    corepack)
      PNPM_MODE="corepack"
      PNPM_BIN=""
      wrapper_dir="${PWD}/.git/gate-work/bin"
      wrapper_path="${wrapper_dir}/pnpm"
      mkdir -p "${wrapper_dir}"
      cat >"${wrapper_path}" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
exec corepack pnpm "$@"
EOF
      chmod +x "${wrapper_path}"
      export PATH="${wrapper_dir}:${PATH}"
      ;;
    npx)
      PNPM_MODE="npx"
      PNPM_BIN=""
      wrapper_dir="${PWD}/.git/gate-work/bin"
      wrapper_path="${wrapper_dir}/pnpm"
      mkdir -p "${wrapper_dir}"
      cat >"${wrapper_path}" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
exec npx --yes pnpm "$@"
EOF
      chmod +x "${wrapper_path}"
      export PATH="${wrapper_dir}:${PATH}"
      ;;
    *)
      return 1
      ;;
  esac

  command -v pnpm >/dev/null 2>&1
  pnpm --version >/dev/null 2>&1

  PNPM_BIN="$(command -v pnpm)"
  export PNPM_MODE PNPM_BIN PATH
}
