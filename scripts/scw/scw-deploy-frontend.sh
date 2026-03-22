#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/scw-topology.sh"

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <webapp|admin> <staging|prod>" >&2
  exit 1
fi

APP="$1"
ENV="$2"
REGION="fr-par"
NAMESPACE_NAME="$(scw_topology_platform_field "$APP" "$ENV" "namespace_name")"
CONTAINER_NAME="$(scw_topology_platform_field "$APP" "$ENV" "container_name")"
case "$APP" in
  webapp)
    DOCKERFILE="app-webapp/Dockerfile.scaleway"
    ;;
  admin)
    DOCKERFILE="app-admin/Dockerfile.scaleway"
    ;;
  *)
    echo "Unsupported app: $APP" >&2
    exit 1
    ;;
esac

if [ -z "$NAMESPACE_NAME" ] || [ -z "$CONTAINER_NAME" ]; then
  echo "Unsupported target from Scaleway topology: ${APP}:${ENV}" >&2
  exit 1
fi

ensure_clean_git_tree() {
  if [ "${SCW_DEPLOY_ALLOW_DIRTY:-0}" = "1" ]; then
    return 0
  fi
  if ! command -v git >/dev/null 2>&1; then
    return 0
  fi
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    return 0
  fi
  if [ -n "$(git status --porcelain)" ]; then
    echo "Refusing deploy: git working tree is not clean." >&2
    echo "Commit/stash changes first, or set SCW_DEPLOY_ALLOW_DIRTY=1 to bypass." >&2
    exit 1
  fi
}

ensure_clean_git_tree

if [ ! -f "$DOCKERFILE" ]; then
  echo "Missing dockerfile: $DOCKERFILE" >&2
  exit 1
fi

NS_ID=$(scw container namespace list region="$REGION" -o json | jq -r --arg n "$NAMESPACE_NAME" '.[] | select(.name==$n) | .id' | head -n1)
if [ -z "$NS_ID" ]; then
  echo "Namespace not found: $NAMESPACE_NAME" >&2
  exit 1
fi

echo "Deploying ${APP}:${ENV} to namespace ${NAMESPACE_NAME} (${NS_ID})"
scw container deploy \
  name="$CONTAINER_NAME" \
  namespace-id="$NS_ID" \
  dockerfile="$DOCKERFILE" \
  build-source=. \
  port=8080 \
  region="$REGION"

echo "Deployment command submitted for ${APP}:${ENV}."
