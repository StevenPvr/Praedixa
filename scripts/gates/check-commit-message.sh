#!/usr/bin/env bash
set -euo pipefail

MESSAGE_FILE="${1:?Usage: check-commit-message.sh <commit-message-file>}"

if [[ ! -f "$MESSAGE_FILE" ]]; then
  echo "[commit-msg] Missing commit message file: ${MESSAGE_FILE}" >&2
  exit 2
fi

SUBJECT="$(
  sed -n '/^[[:space:]]*#/d; /^[[:space:]]*$/d; 1p' "$MESSAGE_FILE" | tr -d '\r'
)"

if [[ -z "$SUBJECT" ]]; then
  echo "[commit-msg] Empty commit message subject" >&2
  exit 1
fi

if ((${#SUBJECT} > 100)); then
  echo "[commit-msg] Subject too long (${#SUBJECT}/100): ${SUBJECT}" >&2
  exit 1
fi

CONVENTIONAL_PATTERN='^(build|chore|ci|content|docs|feat|fix|infra|perf|refactor|release|revert|security|style|test)(\([a-z0-9][a-z0-9._/-]*\))?!?: .+'

if [[ "$SUBJECT" =~ ^(Merge|Revert\ \") ]]; then
  exit 0
fi

if [[ "$SUBJECT" =~ ^(fixup!\ |squash!\ ) ]]; then
  SUBJECT="${SUBJECT#*! }"
fi

if [[ ! "$SUBJECT" =~ $CONVENTIONAL_PATTERN ]]; then
  cat >&2 <<'EOF'
[commit-msg] Commit message must follow Conventional Commits.
Examples:
  feat(landing): improve sector CTA hierarchy
  fix(api-ts): harden tenant scope filter
  chore(monorepo): refresh security gates
EOF
  exit 1
fi
