#!/usr/bin/env sh
set -eu
if (set -o pipefail) >/dev/null 2>&1; then
  set -o pipefail
fi

if [ "${CI:-}" = "true" ]; then
  exit 0
fi

if ! command -v git >/dev/null 2>&1; then
  exit 0
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  exit 0
fi

if ! command -v pre-commit >/dev/null 2>&1; then
  echo "pre-commit not found; skipping hook install"
  exit 0
fi

pre-commit install --install-hooks
