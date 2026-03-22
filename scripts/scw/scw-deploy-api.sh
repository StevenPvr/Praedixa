#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/scw-topology.sh"

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <staging|prod>" >&2
  exit 1
fi

ENV="$1"
REGION="fr-par"
BUILD_SOURCE="."
DOCKERFILE="app-api-ts/Dockerfile"
NAMESPACE_NAME="$(scw_topology_platform_field "api" "$ENV" "namespace_name")"
CONTAINER_NAME="$(scw_topology_platform_field "api" "$ENV" "container_name")"
if [ -z "$NAMESPACE_NAME" ] || [ -z "$CONTAINER_NAME" ]; then
  echo "Unsupported api environment from Scaleway topology: $ENV" >&2
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

if [ ! -f "${BUILD_SOURCE}/${DOCKERFILE}" ]; then
  echo "Missing dockerfile: ${BUILD_SOURCE}/${DOCKERFILE}" >&2
  exit 1
fi

NS_ID=$(scw container namespace list region="$REGION" -o json | jq -r --arg n "$NAMESPACE_NAME" '.[] | select(.name==$n) | .id' | head -n1)
if [ -z "$NS_ID" ]; then
  echo "Namespace not found: $NAMESPACE_NAME" >&2
  exit 1
fi

echo "Deploying api:${ENV} to namespace ${NAMESPACE_NAME} (${NS_ID})"
scw container deploy \
  name="$CONTAINER_NAME" \
  namespace-id="$NS_ID" \
  dockerfile="$DOCKERFILE" \
  build-source="$BUILD_SOURCE" \
  port=8000 \
  region="$REGION"

echo "Deployment command submitted for api:${ENV}."
