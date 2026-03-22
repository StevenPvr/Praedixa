#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CAMUNDA_VERSION="${CAMUNDA_VERSION:-8.8}"
CAMUNDA_HOME="$ROOT_DIR/.meta/.tools/camunda"
ARCHIVE_NAME="docker-compose-${CAMUNDA_VERSION}.zip"
ARCHIVE_PATH="$CAMUNDA_HOME/$ARCHIVE_NAME"
EXTRACTED_DIR="$CAMUNDA_HOME/docker-compose-${CAMUNDA_VERSION}"
ARTIFACT_URL="https://github.com/camunda/camunda-distributions/releases/download/docker-compose-${CAMUNDA_VERSION}/${ARCHIVE_NAME}"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/dev/camunda-dev.sh download [--full]
  ./scripts/dev/camunda-dev.sh up [--full]
  ./scripts/dev/camunda-dev.sh down [--full] [--volumes]
  ./scripts/dev/camunda-dev.sh status [--full]
  ./scripts/dev/camunda-dev.sh logs [--full]

Defaults:
  - lightweight stack (`docker-compose.yaml`)
  - pinned official artifact version via CAMUNDA_VERSION (default: 8.8)
EOF
}

require_command() {
  if command -v "$1" >/dev/null 2>&1; then
    return
  fi
  echo "Missing required command: $1" >&2
  exit 1
}

ensure_artifact() {
  require_command curl
  require_command unzip
  mkdir -p "$CAMUNDA_HOME"

  if [[ ! -f "$ARCHIVE_PATH" ]]; then
    echo "Downloading Camunda Docker Compose ${CAMUNDA_VERSION}..."
    curl -L --fail --output "$ARCHIVE_PATH" "$ARTIFACT_URL"
  fi

  if [[ ! -f "$EXTRACTED_DIR/docker-compose.yaml" ]]; then
    echo "Extracting Camunda Docker Compose ${CAMUNDA_VERSION}..."
    rm -rf "$EXTRACTED_DIR"
    mkdir -p "$EXTRACTED_DIR"
    unzip -qo "$ARCHIVE_PATH" -d "$EXTRACTED_DIR"
  fi

  if [[ ! -f "$EXTRACTED_DIR/docker-compose.yaml" ]]; then
    echo "Camunda artifact extraction failed: $EXTRACTED_DIR/docker-compose.yaml missing" >&2
    exit 1
  fi
}

compose_args_for_mode() {
  local mode="$1"
  if [[ "$mode" == "full" ]]; then
    printf '%s\n' "-f" "docker-compose-full.yaml"
    return
  fi
  printf '%s\n' "-f" "docker-compose.yaml"
}

run_compose() {
  local mode="$1"
  shift
  mapfile -t file_args < <(compose_args_for_mode "$mode")
  (
    cd "$EXTRACTED_DIR"
    docker compose "${file_args[@]}" "$@"
  )
}

command_name="${1:-}"
if [[ -z "$command_name" ]]; then
  usage
  exit 1
fi
shift || true

stack_mode="lightweight"
remove_volumes="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --full)
      stack_mode="full"
      ;;
    --volumes)
      remove_volumes="true"
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
  shift
done

case "$command_name" in
  download)
    ensure_artifact
    echo "Camunda artifact ready in $EXTRACTED_DIR"
    ;;
  up)
    ensure_artifact
    run_compose "$stack_mode" up -d
    if [[ "$stack_mode" == "full" ]]; then
      cat <<'EOF'
Camunda full stack started.
- Orchestration Cluster REST API: http://localhost:8088/v2
- Web UI login: demo / demo
- OAuth token URL: http://localhost:18080/auth/realms/camunda-platform/protocol/openid-connect/token
EOF
    else
      cat <<'EOF'
Camunda lightweight stack started.
- Orchestration Cluster REST API: http://localhost:8088/v2
- APIs are unprotected by default in this mode
- Web UI login: demo / demo
EOF
    fi
    ;;
  down)
    ensure_artifact
    if [[ "$remove_volumes" == "true" ]]; then
      run_compose "$stack_mode" down -v
    else
      run_compose "$stack_mode" down
    fi
    ;;
  status)
    ensure_artifact
    run_compose "$stack_mode" ps
    ;;
  logs)
    ensure_artifact
    run_compose "$stack_mode" logs -f --tail 200
    ;;
  *)
    echo "Unknown command: $command_name" >&2
    usage
    exit 1
    ;;
esac
