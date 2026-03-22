#!/usr/bin/env bash
set -euo pipefail

target="${1:-}"

cat >&2 <<EOF
Legacy local landing deploy is disabled for security reasons.

Reason:
- staging/prod landing deploys must only happen from the immutable release runner
- local \`build-source=.\` deploys are no longer allowed

Use the release runner flow instead:
1. ./scripts/scw/scw-release-build.sh --service landing --ref <git-ref> --tag <tag> --registry-prefix <registry>
2. ./scripts/scw/scw-release-manifest-create.sh --ref <git-ref> --output <manifest> --image "landing=<registry-image@sha256>"
3. ./scripts/scw/scw-release-deploy.sh --manifest <manifest> --env ${target:-staging}

This script now exits intentionally.
EOF

exit 1
