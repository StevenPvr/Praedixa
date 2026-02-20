#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FILE="app-landing/components/seo/JsonLd.tsx"
if [[ ! -f "$FILE" ]]; then
  echo "[schema] Missing ${FILE}" >&2
  exit 1
fi

required_tokens=(
  "\"@context\": \"https://schema.org\""
  "\"@graph\""
  "\"@type\": \"Organization\""
  "\"@type\": \"SoftwareApplication\""
  "\"@type\": \"WebSite\""
  "\"@type\": \"FAQPage\""
  "type=\"application/ld+json\""
)

for token in "${required_tokens[@]}"; do
  if ! grep -Fq "$token" "$FILE"; then
    echo "[schema] Missing required token in ${FILE}: $token" >&2
    exit 1
  fi
done

echo "[schema] OK"
