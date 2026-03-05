#!/usr/bin/env bash
set -euo pipefail

REGION="fr-par"
NAMESPACE_NAME="auth-prod"
CONTAINER_NAME="auth-prod"
DOCKERFILE="infra/auth/Dockerfile.scaleway"
BUILD_SOURCE="."

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
