#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "${ROOT_DIR}/scripts/lib/local-env.sh"

API_URL="${API_URL:-http://127.0.0.1:8000}"
EVENT_TYPE="${EVENT_TYPE:-email.delivered}"
FROM_EMAIL="${FROM_EMAIL:-}"
SUBJECT="${SUBJECT:-Your Praedixa workspace is ready}"
RECIPIENT_EMAIL=""

usage() {
  echo "Usage: $0 --email <invitee@example.com> [--event <email.sent|email.delivered|email.delivery_delayed|email.bounced|email.complained|email.failed>] [--api-url <url>] [--from <sender@example.com>] [--subject <subject>]" >&2
  exit 2
}

while (($# > 0)); do
  case "$1" in
    --)
      shift
      ;;
    --email)
      RECIPIENT_EMAIL="${2:-}"
      shift 2
      ;;
    --event)
      EVENT_TYPE="${2:-}"
      shift 2
      ;;
    --api-url)
      API_URL="${2:-}"
      shift 2
      ;;
    --from)
      FROM_EMAIL="${2:-}"
      shift 2
      ;;
    --subject)
      SUBJECT="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      ;;
  esac
done

if [[ -z "${RECIPIENT_EMAIL}" ]]; then
  usage
fi

autofill_resend_webhook_secret_from_local_env "${ROOT_DIR}" >/dev/null
autofill_resend_from_email_from_local_env "${ROOT_DIR}" >/dev/null

WEBHOOK_SECRET="${RESEND_WEBHOOK_SECRET:-whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw}"
FROM_EMAIL="${FROM_EMAIL:-${RESEND_FROM_EMAIL:-hello@praedixa.com}}"

tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "${tmp_dir}"
}
trap cleanup EXIT

payload_file="${tmp_dir}/payload.json"
headers_file="${tmp_dir}/headers.json"

WEBHOOK_SECRET="${WEBHOOK_SECRET}" \
RECIPIENT_EMAIL="${RECIPIENT_EMAIL}" \
EVENT_TYPE="${EVENT_TYPE}" \
FROM_EMAIL="${FROM_EMAIL}" \
SUBJECT="${SUBJECT}" \
PAYLOAD_FILE="${payload_file}" \
HEADERS_FILE="${headers_file}" \
pnpm --dir "${ROOT_DIR}/app-api-ts" exec node --input-type=module <<'NODE'
import { writeFileSync } from "node:fs";
import { Webhook } from "svix";

const now = new Date();
const payload = {
  type: process.env.EVENT_TYPE,
  created_at: now.toISOString(),
  data: {
    created_at: now.toISOString(),
    email_id: `demo-${Date.now()}`,
    from: process.env.FROM_EMAIL,
    subject: process.env.SUBJECT,
    to: [process.env.RECIPIENT_EMAIL],
  },
};

if (process.env.EVENT_TYPE === "email.bounced") {
  payload.data.bounce = {
    message: "Mailbox unavailable during local demo.",
    type: "hard",
    subType: "mailbox_not_found",
  };
}

if (process.env.EVENT_TYPE === "email.failed") {
  payload.data.last_error = {
    message: "Local demo provider failure.",
  };
}

const rawBody = JSON.stringify(payload);
const messageId = `msg_${Date.now()}`;
const signer = new Webhook(process.env.WEBHOOK_SECRET);
const signature = signer.sign(messageId, now, rawBody);
const timestampSeconds = Math.floor(now.getTime() / 1000).toString();

writeFileSync(process.env.PAYLOAD_FILE, rawBody);
writeFileSync(
  process.env.HEADERS_FILE,
  JSON.stringify({
    "content-type": "application/json",
    "svix-id": messageId,
    "svix-timestamp": timestampSeconds,
    "svix-signature": signature,
  }),
);
NODE

response_file="${tmp_dir}/response.json"
http_status="$(
  curl -sS -o "${response_file}" -w '%{http_code}' \
    -X POST "${API_URL%/}/api/v1/webhooks/resend/email-delivery" \
    -H "Content-Type: application/json" \
    -H "svix-id: $(jq -r '.["svix-id"]' "${headers_file}")" \
    -H "svix-timestamp: $(jq -r '.["svix-timestamp"]' "${headers_file}")" \
    -H "svix-signature: $(jq -r '.["svix-signature"]' "${headers_file}")" \
    --data-binary @"${payload_file}"
)"

if [[ ! "${http_status}" =~ ^2 ]]; then
  echo "[demo:delivery] webhook simulation failed (${http_status})" >&2
  cat "${response_file}" >&2
  exit 1
fi

echo "[demo:delivery] simulated ${EVENT_TYPE} for ${RECIPIENT_EMAIL}"
cat "${response_file}"
