#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_API_DIR="$ROOT_DIR/app-api"

if [[ ! -d "$APP_API_DIR" ]]; then
  echo "Missing app-api directory: $APP_API_DIR" >&2
  exit 1
fi

output="$(cd "$APP_API_DIR" && uv run alembic heads)"
trimmed_output="$(printf '%s\n' "$output" | sed '/^[[:space:]]*$/d')"

if [[ -z "$trimmed_output" ]]; then
  echo "alembic heads returned no migration head" >&2
  exit 1
fi

head_count="$(printf '%s\n' "$trimmed_output" | wc -l | tr -d '[:space:]')"
if [[ "$head_count" != "1" ]]; then
  echo "Expected exactly 1 Alembic head, got $head_count" >&2
  printf '%s\n' "$trimmed_output" >&2
  exit 1
fi

echo "[alembic-heads] OK"
printf '%s\n' "$trimmed_output"
