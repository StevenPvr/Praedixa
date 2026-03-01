#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <staging|prod>" >&2
  exit 1
fi

ENV="$1"
REGION="fr-par"

case "$ENV" in
  staging)
    NAMESPACE_NAME="landing-staging"
    CONTAINER_NAME="landing-staging"
    DOCKERFILE="app-landing/Dockerfile.scaleway"
    ;;
  prod)
    NAMESPACE_NAME="landing-prod"
    CONTAINER_NAME="landing-web"
    DOCKERFILE="app-landing/Dockerfile.scaleway"
    ;;
  *)
    echo "Unsupported environment: $ENV" >&2
    exit 1
    ;;
esac

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

DOCKER_DEFAULT_PLATFORM="${DOCKER_DEFAULT_PLATFORM:-linux/amd64}"

NS_ID=$(scw container namespace list region="$REGION" -o json | jq -r --arg n "$NAMESPACE_NAME" '.[] | select(.name==$n) | .id' | head -n1)
if [ -z "$NS_ID" ]; then
  echo "Namespace not found: $NAMESPACE_NAME" >&2
  exit 1
fi

echo "Deploying landing:${ENV} to namespace ${NAMESPACE_NAME} (${NS_ID})"
DOCKER_DEFAULT_PLATFORM="$DOCKER_DEFAULT_PLATFORM" scw container deploy \
  name="$CONTAINER_NAME" \
  namespace-id="$NS_ID" \
  dockerfile="$DOCKERFILE" \
  build-source=. \
  port=8080 \
  region="$REGION"

echo "Deployment command submitted for landing:${ENV}."
