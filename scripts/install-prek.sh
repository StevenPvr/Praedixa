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

if ! command -v prek >/dev/null 2>&1; then
  echo "prek not found; skipping hook install"
  echo "Install: brew install prek  or  pip install prek"
  exit 0
fi

prek install --install-hooks -t pre-commit -t pre-push -t commit-msg
