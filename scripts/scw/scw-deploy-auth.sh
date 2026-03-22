#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/scw-topology.sh"

REGION="fr-par"
NAMESPACE_NAME="$(scw_topology_platform_field "auth" "prod" "namespace_name")"
CONTAINER_NAME="$(scw_topology_platform_field "auth" "prod" "container_name")"
DOCKERFILE="infra/auth/Dockerfile.scaleway"
BUILD_SOURCE="."

if [ -z "$NAMESPACE_NAME" ] || [ -z "$CONTAINER_NAME" ]; then
  echo "Missing auth-prod topology definition" >&2
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

if [ ! -f "${BUILD_SOURCE}/${DOCKERFILE}" ]; then
  echo "Missing dockerfile: ${BUILD_SOURCE}/${DOCKERFILE}" >&2
  exit 1
fi

ensure_clean_git_tree

ns_id="$(scw container namespace list region="$REGION" -o json | jq -r --arg n "$NAMESPACE_NAME" '.[] | select(.name==$n) | .id' | head -n1)"
if [ -z "$ns_id" ]; then
  echo "Namespace not found: $NAMESPACE_NAME" >&2
  exit 1
fi

echo "Deploying auth to namespace ${NAMESPACE_NAME} (${ns_id})"
scw container deploy \
  name="$CONTAINER_NAME" \
  namespace-id="$ns_id" \
  dockerfile="$DOCKERFILE" \
  build-source="$BUILD_SOURCE" \
  port=8080 \
  region="$REGION"

echo "Scaleway auth deploy submitted."
