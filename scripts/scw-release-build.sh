#!/usr/bin/env bash
set -euo pipefail

SERVICE=""
REF=""
TAG=""
REGISTRY_PREFIX=""
REGION="fr-par"
OUTPUT_PATH=""
RUN_GATES="0"

usage() {
  echo "Usage: $0 --service <landing|webapp|admin|api|auth> --tag <tag> --registry-prefix <registry-prefix> [--ref <git-ref>] [--region <region>] [--output <json>] [--run-gates]" >&2
  exit 2
}

while (($# > 0)); do
  case "$1" in
    --service)
      SERVICE="${2:-}"
      shift 2
      ;;
    --ref)
      REF="${2:-}"
      shift 2
      ;;
    --tag)
      TAG="${2:-}"
      shift 2
      ;;
    --registry-prefix)
      REGISTRY_PREFIX="${2:-}"
      shift 2
      ;;
    --region)
      REGION="${2:-}"
      shift 2
      ;;
    --output)
      OUTPUT_PATH="${2:-}"
      shift 2
      ;;
    --run-gates)
      RUN_GATES="1"
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      ;;
  esac
done

if [[ -z "$SERVICE" || -z "$TAG" || -z "$REGISTRY_PREFIX" ]]; then
  usage
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK_DIR="$ROOT_DIR"
TMP_DIR="$(mktemp -d)"

cleanup() {
  if [[ -n "$REF" && -d "$TMP_DIR/worktree" ]]; then
    git -C "$ROOT_DIR" worktree remove --force "$TMP_DIR/worktree" >/dev/null 2>&1 || true
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

if [[ -n "$REF" ]]; then
  git -C "$ROOT_DIR" worktree add --detach "$TMP_DIR/worktree" "$REF" >/dev/null
  WORK_DIR="$TMP_DIR/worktree"
fi

if [[ "$RUN_GATES" == "1" ]]; then
  (cd "$WORK_DIR" && ./scripts/gate-exhaustive-local.sh --mode manual)
fi

case "$SERVICE" in
  landing)
    DOCKERFILE="app-landing/Dockerfile.scaleway"
    IMAGE_NAME="landing"
    ;;
  webapp)
    DOCKERFILE="app-webapp/Dockerfile.scaleway"
    IMAGE_NAME="webapp"
    ;;
  admin)
    DOCKERFILE="app-admin/Dockerfile.scaleway"
    IMAGE_NAME="admin"
    ;;
  api)
    DOCKERFILE="app-api-ts/Dockerfile"
    IMAGE_NAME="api"
    ;;
  auth)
    DOCKERFILE="infra/auth/Dockerfile.scaleway"
    IMAGE_NAME="auth"
    ;;
  *)
    echo "Unsupported service: $SERVICE" >&2
    exit 1
    ;;
esac

if [[ ! -f "$WORK_DIR/$DOCKERFILE" ]]; then
  echo "Missing dockerfile in release worktree: $DOCKERFILE" >&2
  exit 1
fi

IMAGE_REF="${REGISTRY_PREFIX}/${IMAGE_NAME}:${TAG}"
METADATA_FILE="$TMP_DIR/${SERVICE}-metadata.json"

docker buildx build \
  --platform linux/amd64 \
  --file "$WORK_DIR/$DOCKERFILE" \
  --tag "$IMAGE_REF" \
  --push \
  --metadata-file "$METADATA_FILE" \
  "$WORK_DIR" >/dev/null

DIGEST="$(jq -r '."containerimage.digest" // .containerimage.digest // empty' "$METADATA_FILE")"
if [[ -z "$DIGEST" ]]; then
  echo "Unable to extract image digest for $SERVICE from $METADATA_FILE" >&2
  exit 1
fi

COMMIT_SHA="$(git -C "$WORK_DIR" rev-parse HEAD)"
RESULT_JSON="$(jq -n \
  --arg service "$SERVICE" \
  --arg dockerfile "$DOCKERFILE" \
  --arg region "$REGION" \
  --arg image_ref "$IMAGE_REF" \
  --arg digest "$DIGEST" \
  --arg registry_image "${IMAGE_REF%@*}@${DIGEST}" \
  --arg commit_sha "$COMMIT_SHA" \
  --arg built_at "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  '{
    service: $service,
    dockerfile: $dockerfile,
    region: $region,
    image_ref: $image_ref,
    digest: $digest,
    registry_image: $registry_image,
    commit_sha: $commit_sha,
    built_at: $built_at
  }')"

if [[ -n "$OUTPUT_PATH" ]]; then
  printf '%s\n' "$RESULT_JSON" >"$OUTPUT_PATH"
fi

printf '%s\n' "$RESULT_JSON"
