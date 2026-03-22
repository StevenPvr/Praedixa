#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

WORKDIR="$ROOT_DIR"

usage() {
  cat <<'EOF' >&2
Usage: scripts/gates/ci-python-tool.sh [--cwd <path>] <tool> [args...]

Supported tools:
  import-linter
  deptry
  radon
  schemathesis
EOF
  exit 2
}

while (($# > 0)); do
  case "$1" in
    --cwd)
      WORKDIR="${2:-}"
      shift 2
      ;;
    --help|-h)
      usage
      ;;
    *)
      break
      ;;
  esac
done

if (($# == 0)); then
  usage
fi

if ! command -v uv >/dev/null 2>&1; then
  echo "Missing required tool: uv" >&2
  exit 1
fi

TOOL_KEY="$1"
shift

case "$TOOL_KEY" in
  import-linter)
    PACKAGE_SPEC="import-linter==2.11"
    TOOL_COMMAND="lint-imports"
    ;;
  deptry)
    PACKAGE_SPEC="deptry==0.24.0"
    TOOL_COMMAND="deptry"
    ;;
  radon)
    PACKAGE_SPEC="radon==6.0.1"
    TOOL_COMMAND="radon"
    ;;
  schemathesis)
    PACKAGE_SPEC="schemathesis==4.12.0"
    TOOL_COMMAND="st"
    ;;
  *)
    echo "Unsupported CI Python tool: $TOOL_KEY" >&2
    exit 2
    ;;
esac

cd "$WORKDIR"
uv tool run --from "$PACKAGE_SPEC" "$TOOL_COMMAND" "$@"
