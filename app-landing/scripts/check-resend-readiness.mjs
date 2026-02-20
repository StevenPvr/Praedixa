#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RESEND_API_BASE = "https://api.resend.com";
const REQUIRED_STATUS = "verified";

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = unquote(line.slice(separator + 1));
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = value;
  }
}

function fatal(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "..");
loadEnvFile(path.join(appRoot, ".env.local"));
loadEnvFile(path.join(appRoot, ".env"));

const apiKey = process.env.RESEND_API_KEY;
const resendFrom =
  process.env.RESEND_FROM_EMAIL ?? "Praedixa <noreply@praedixa.com>";
const probeRecipient = process.env.RESEND_READINESS_TO ?? "admin@praedixa.com";
const extractedFrom = resendFrom.match(/<([^>]+)>/)?.[1] ?? resendFrom;
const extractedDomain = extractedFrom.split("@")[1]?.toLowerCase();
const requiredDomain =
  process.env.RESEND_SENDER_DOMAIN ?? extractedDomain ?? "praedixa.com";

if (!apiKey) {
  fatal("RESEND_API_KEY is missing. Refusing deploy.");
}

async function requestApi(path, init = {}) {
  let response;
  try {
    response = await fetch(`${RESEND_API_BASE}${path}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      ...init,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown network error";
    fatal(`Resend API network failure on ${path}: ${message}`);
  }

  const text = await response.text();
  let payload = null;
  if (text.length > 0) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  return { response, payload };
}

function getErrorReason(payload, response) {
  if (payload && typeof payload === "object" && "message" in payload) {
    return String(payload.message);
  }
  if (typeof payload === "string" && payload.length > 0) {
    return payload;
  }
  return `HTTP ${response.status}`;
}

function isRestrictedSendOnlyKey(payload) {
  return (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    String(payload.message).includes("restricted to only send emails")
  );
}

async function verifyByDomainStatus() {
  const { response: domainsResponse, payload: domainsPayload } =
    await requestApi("/domains");

  if (!domainsResponse.ok) {
    return { ok: false, payload: domainsPayload, response: domainsResponse };
  }

  const domains = Array.isArray(domainsPayload?.data) ? domainsPayload.data : [];
  const domain = domains.find((entry) => entry?.name === requiredDomain);

  if (!domain) {
    fatal(
      `Resend domain "${requiredDomain}" not found. Add and verify it before deploy.`,
    );
  }

  const { response: detailResponse, payload: details } = await requestApi(
    `/domains/${domain.id}`,
  );
  if (!detailResponse.ok) {
    const reason = getErrorReason(details, detailResponse);
    fatal(`Resend API request failed on /domains/${domain.id}: ${reason}`);
  }

  const records = Array.isArray(details?.records) ? details.records : [];
  const invalidRecords = records.filter(
    (record) => record?.status !== REQUIRED_STATUS,
  );
  const sendingEnabled = details?.capabilities?.sending === "enabled";
  const isVerified = details?.status === REQUIRED_STATUS;

  if (!sendingEnabled || !isVerified || invalidRecords.length > 0) {
    process.stderr.write(
      `Resend domain "${requiredDomain}" is not production-ready.\n`,
    );
    process.stderr.write(`Domain status: ${details?.status ?? "unknown"}\n`);
    process.stderr.write(
      `Sending capability: ${details?.capabilities?.sending ?? "unknown"}\n`,
    );

    if (invalidRecords.length > 0) {
      process.stderr.write("Records not verified:\n");
      for (const record of invalidRecords) {
        process.stderr.write(`${formatRecord(record)}\n`);
      }
    }

    process.stderr.write(
      "Fix in https://resend.com/domains then click Verify domain.\n",
    );
    process.exit(1);
  }

  process.stdout.write(
    `Resend readiness check passed for domain "${requiredDomain}".\n`,
  );
  process.exit(0);
}

async function verifyBySendProbe() {
  process.stderr.write(
    "Resend key is send-only; running delivery probe with custom sender.\n",
  );
  const probePayload = {
    from: resendFrom,
    to: [probeRecipient],
    subject: `[resend-readiness] ${new Date().toISOString()}`,
    html: "<p>Automated readiness probe before deploy.</p>",
  };
  const { response, payload } = await requestApi("/emails", {
    method: "POST",
    body: JSON.stringify(probePayload),
  });

  if (!response.ok) {
    const reason = getErrorReason(payload, response);
    fatal(`Resend readiness probe failed: ${reason}`);
  }

  process.stdout.write(
    `Resend readiness probe passed with "${resendFrom}" to "${probeRecipient}".\n`,
  );
}

function formatRecord(record) {
  const status = record.status ?? "unknown";
  return `- ${record.record} ${record.name} (${record.type}) -> ${status}`;
}

const domainCheck = await verifyByDomainStatus();
if (!domainCheck?.ok && isRestrictedSendOnlyKey(domainCheck?.payload)) {
  await verifyBySendProbe();
  process.exit(0);
}

if (!domainCheck?.ok) {
  const reason = getErrorReason(domainCheck.payload, domainCheck.response);
  fatal(`Resend API request failed on /domains: ${reason}`);
}
