import {
  RATE_LIMIT_WINDOW_MS,
  MAX_REQUESTS_PER_WINDOW,
  MAX_RATE_LIMIT_ENTRIES,
} from "./constants";

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function stripPort(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("[") && trimmed.includes("]")) {
    const endIndex = trimmed.indexOf("]");
    return trimmed.slice(1, endIndex);
  }

  const colonCount = trimmed.split(":").length - 1;
  if (colonCount === 1 && trimmed.includes(".")) {
    return trimmed.split(":")[0] ?? trimmed;
  }

  return trimmed;
}

function isValidIpv4(value: string): boolean {
  const segments = value.split(".");
  if (segments.length !== 4) return false;

  return segments.every((segment) => {
    if (!/^\d+$/.test(segment)) return false;
    const octet = Number.parseInt(segment, 10);
    return !Number.isNaN(octet) && octet >= 0 && octet <= 255;
  });
}

function isLikelyIpv6(value: string): boolean {
  return value.includes(":") && /^[0-9a-f:.]+$/i.test(value);
}

function normalizeIp(value: string | null): string | null {
  if (!value) return null;

  const candidate = stripPort(value).trim().toLowerCase();
  if (!candidate || candidate === "unknown") return null;

  if (isValidIpv4(candidate) || isLikelyIpv6(candidate)) {
    return candidate;
  }

  return null;
}

function shouldTrustProxyIpHeaders(): boolean {
  return process.env["LANDING_TRUST_PROXY_IP_HEADERS"] === "1";
}

function resolveForwardedForIp(value: string | null): string | null {
  if (!value) return null;

  for (const segment of value.split(",")) {
    const parsed = normalizeIp(segment);
    if (parsed) return parsed;
  }

  return null;
}

export function getClientIp(request: Request): string {
  if (!shouldTrustProxyIpHeaders()) return "unknown";

  const cfIp = normalizeIp(request.headers.get("cf-connecting-ip"));
  if (cfIp) return cfIp;

  const forwardedIp = resolveForwardedForIp(
    request.headers.get("x-forwarded-for"),
  );
  if (forwardedIp) return forwardedIp;

  const realIp = normalizeIp(request.headers.get("x-real-ip"));
  if (realIp) return realIp;

  return "unknown";
}

export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    /* v8 ignore next 5 -- eviction requires 10k entries, impractical in unit tests */
    if (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) {
      for (const [key, entry] of rateLimitMap) {
        if (now > entry.resetTime) rateLimitMap.delete(key);
      }
    }
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) return true;

  record.count++;
  return false;
}
