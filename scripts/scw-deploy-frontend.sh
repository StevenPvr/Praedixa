#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <webapp|admin> <staging|prod>" >&2
  exit 1
fi

APP="$1"
ENV="$2"
REGION="fr-par"

case "${APP}:${ENV}" in
  webapp:staging)
    NAMESPACE_NAME="webapp-staging"
    CONTAINER_NAME="webapp-staging"
    DOCKERFILE="app-webapp/Dockerfile.scaleway"
    ;;
  webapp:prod)
    NAMESPACE_NAME="webapp-prod"
    CONTAINER_NAME="webapp-prod"
    DOCKERFILE="app-webapp/Dockerfile.scaleway"
    ;;
  admin:staging)
    NAMESPACE_NAME="admin-staging"
    CONTAINER_NAME="admin-staging"
    DOCKERFILE="app-admin/Dockerfile.scaleway"
    ;;
  admin:prod)
    NAMESPACE_NAME="admin-prod"
    CONTAINER_NAME="admin-prod"
    DOCKERFILE="app-admin/Dockerfile.scaleway"
    ;;
  *)
    echo "Unsupported target: ${APP}:${ENV}" >&2
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
