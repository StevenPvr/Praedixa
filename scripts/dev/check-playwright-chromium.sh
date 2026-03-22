#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "${ROOT_DIR}/scripts/lib/pnpm.sh"
setup_pnpm || {
  echo "Unable to resolve pnpm command (tried PATH, PNPM_HOME, local pnpm tools, corepack, npx)."
  exit 2
}

INSTALL_HINT="pnpm exec playwright install chromium"

if ! LIST_OUTPUT="$(pnpm exec playwright install --list 2>&1)"; then
  echo "Unable to query Playwright browsers."
  echo "${LIST_OUTPUT}"
  echo "Run dependencies install first:"
  echo "  pnpm install --frozen-lockfile"
  exit 2
fi

BROWSER_PATHS="$(
  printf '%s\n' "${LIST_OUTPUT}" | sed -n 's/^[[:space:]]*\(\/.*\)$/\1/p'
)"
CHROMIUM_PATH="$(
  printf '%s\n' "${BROWSER_PATHS}" | grep '/chromium-[0-9]' | head -n 1 || true
)"
HEADLESS_SHELL_PATH="$(
  printf '%s\n' "${BROWSER_PATHS}" | grep '/chromium_headless_shell-[0-9]' | head -n 1 || true
)"

if [[ -z "${CHROMIUM_PATH}" || -z "${HEADLESS_SHELL_PATH}" ]]; then
  echo "Playwright Chromium is not installed for this environment."
  echo "Blocking e2e hooks. Install it with:"
  echo "  ${INSTALL_HINT}"
  exit 1
fi

for browser_dir in "${CHROMIUM_PATH}" "${HEADLESS_SHELL_PATH}"; do
  if [[ ! -d "${browser_dir}" || ! -f "${browser_dir}/INSTALLATION_COMPLETE" ]]; then
    echo "Playwright browser cache is incomplete: ${browser_dir}"
    echo "Blocking e2e hooks. Install it with:"
    echo "  ${INSTALL_HINT}"
    exit 1
  fi
done
