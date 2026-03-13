import type { NextRequest } from "next/server";
import { requireRateLimitKeySalt } from "./policy";

function shouldTrustProxyIpHeaders(): boolean {
  return process.env.AUTH_TRUST_X_FORWARDED_FOR === "1";
}

function hashString(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export async function hashIdentifier(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${requireRateLimitKeySalt()}:${value}`),
  );

  const bytes = new Uint8Array(digest);
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }

  return hex.slice(0, 32);
}

const FALLBACK_FINGERPRINT_LOG_INTERVAL_MS = 5 * 60_000;
const MAX_FINGERPRINT_HEADER_LENGTH = 128;
let nextFallbackFingerprintLogAt = 0;

function normalizeIp(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^"+|"+$/g, "");
  if (!trimmed || trimmed.length > 64) return null;

  let candidate = trimmed;
  if (candidate.includes(".") && candidate.includes(":")) {
    const [host, port] = candidate.split(":");
    if (host && port && /^\d+$/.test(port)) {
      candidate = host;
    }
  }

  if (!/^[0-9A-Fa-f:.]+$/.test(candidate)) {
    return null;
  }

  return candidate.toLowerCase();
}

function normalizeFingerprintValue(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;

  const sliced = trimmed.slice(0, MAX_FINGERPRINT_HEADER_LENGTH);
  return /^[\x20-\x7E]+$/.test(sliced) ? sliced : null;
}

function buildHeaderFingerprint(request: NextRequest): string {
  const headers = request.headers;
  const parts = [
    `ua:${hashString(normalizeFingerprintValue(headers.get("user-agent")) ?? "unknown")}`,
    `lang:${hashString(normalizeFingerprintValue(headers.get("accept-language")) ?? "unknown")}`,
    `accept:${hashString(normalizeFingerprintValue(headers.get("accept")) ?? "*/*")}`,
    `chua:${hashString(normalizeFingerprintValue(headers.get("sec-ch-ua")) ?? "unknown")}`,
    `platform:${hashString(
      normalizeFingerprintValue(headers.get("sec-ch-ua-platform")) ?? "unknown",
    )}`,
    `mobile:${hashString(
      normalizeFingerprintValue(headers.get("sec-ch-ua-mobile")) ?? "unknown",
    )}`,
  ];

  if (request.nextUrl?.origin) {
    parts.push(`origin:${hashString(request.nextUrl.origin)}`);
  }

  return parts.join("|");
}

function logFallbackFingerprintUsage(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const now = Date.now();
  if (now < nextFallbackFingerprintLogAt) {
    return;
  }

  nextFallbackFingerprintLogAt = now + FALLBACK_FINGERPRINT_LOG_INTERVAL_MS;
  // eslint-disable-next-line no-console
  console.warn(
    "[auth-rate-limit] Using header fingerprint fallback. Configure AUTH_TRUST_X_FORWARDED_FOR=1 behind a trusted proxy/CDN to enable stronger client isolation.",
  );
}

export function getRawClientKey(request: NextRequest): string {
  const headers = request.headers;
  if (headers && typeof headers.get === "function") {
    if (shouldTrustProxyIpHeaders()) {
      const cfIp = normalizeIp(headers.get("cf-connecting-ip"));
      if (cfIp) return cfIp;

      const realIp = normalizeIp(headers.get("x-real-ip"));
      if (realIp) return realIp;

      const forwardedFor = headers.get("x-forwarded-for");
      if (forwardedFor) {
        for (const entry of forwardedFor.split(",")) {
          const parsed = normalizeIp(entry);
          if (parsed) return parsed;
        }
      }
    }

    logFallbackFingerprintUsage();
    return `fp:${buildHeaderFingerprint(request)}`;
  }

  return "unknown";
}

export function resetFingerprintRateLimitState(): void {
  nextFallbackFingerprintLogAt = 0;
}

export function hashFallbackIdentifier(value: string): string {
  return hashString(value);
}
