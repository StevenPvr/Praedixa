import { siteConfig } from "../config/site";

const DEFAULT_ALLOWED_HOSTS = new Set([
  "praedixa.com",
  "www.praedixa.com",
  "localhost:3000",
  "127.0.0.1:3000",
]);

function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/\.$/, "");
}

interface ParsedSource {
  host: string;
  protocol: string;
}

function parseHost(value: string | null): string | null {
  if (!value) return null;
  try {
    return normalizeHost(new URL(value).host);
  } catch {
    return null;
  }
}

function parseSource(value: string | null): ParsedSource | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return {
      host: normalizeHost(parsed.host),
      protocol: parsed.protocol.toLowerCase(),
    };
  } catch {
    return null;
  }
}

function isLocalHost(host: string): boolean {
  return (
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host === "::1" ||
    host.startsWith("[::1]")
  );
}

function hasAllowedProtocol(source: ParsedSource): boolean {
  if (source.protocol === "https:") return true;
  return source.protocol === "http:" && isLocalHost(source.host);
}

function collectAllowedHosts(): Set<string> {
  const hosts = new Set(DEFAULT_ALLOWED_HOSTS);

  try {
    hosts.add(normalizeHost(new URL(siteConfig.url).host));
  } catch {
    // siteConfig.url is static and controlled; keep fallback defaults.
  }

  const extraOrigins = process.env["ALLOWED_FORM_ORIGINS"]?.split(",") ?? [];
  for (const candidate of extraOrigins) {
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    const parsed = parseHost(trimmed);
    hosts.add(parsed ?? normalizeHost(trimmed.replace(/^https?:\/\//, "")));
  }

  return hosts;
}

function requestHost(request: Request): string | null {
  const hostHeader = request.headers.get("host");
  if (hostHeader) return normalizeHost(hostHeader);

  try {
    return normalizeHost(new URL(request.url).host);
  } catch {
    return null;
  }
}

export function isCrossSiteRequest(request: Request): boolean {
  return request.headers.get("sec-fetch-site") === "cross-site";
}

export function hasTrustedFormOrigin(
  request: Request,
  options: { requireSource?: boolean } = {},
): boolean {
  const allowedHosts = collectAllowedHosts();
  const targetHost = requestHost(request);
  if (targetHost && !allowedHosts.has(targetHost)) {
    return false;
  }

  const origin = parseSource(request.headers.get("origin"));
  if (origin) {
    if (!allowedHosts.has(origin.host)) {
      return false;
    }
    if (!hasAllowedProtocol(origin)) {
      return false;
    }
    return true;
  }

  const referer = parseSource(request.headers.get("referer"));
  if (referer) {
    if (!allowedHosts.has(referer.host)) {
      return false;
    }
    if (!hasAllowedProtocol(referer)) {
      return false;
    }
    return true;
  }

  if (options.requireSource) {
    return false;
  }

  return true;
}
