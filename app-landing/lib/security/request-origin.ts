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

function parseHost(value: string | null): string | null {
  if (!value) return null;
  try {
    return normalizeHost(new URL(value).host);
  } catch {
    return null;
  }
}

function collectAllowedHosts(): Set<string> {
  const hosts = new Set(DEFAULT_ALLOWED_HOSTS);

  try {
    hosts.add(normalizeHost(new URL(siteConfig.url).host));
  } catch {
    // siteConfig.url is static and controlled; keep fallback defaults.
  }

  const extraOrigins = process.env.ALLOWED_FORM_ORIGINS?.split(",") ?? [];
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

export function hasTrustedFormOrigin(request: Request): boolean {
  const allowedHosts = collectAllowedHosts();
  const targetHost = requestHost(request);
  if (targetHost && !allowedHosts.has(targetHost)) {
    return false;
  }

  const originHost = parseHost(request.headers.get("origin"));
  if (originHost && !allowedHosts.has(originHost)) {
    return false;
  }

  if (!originHost) {
    const refererHost = parseHost(request.headers.get("referer"));
    if (refererHost && !allowedHosts.has(refererHost)) {
      return false;
    }
  }

  return true;
}
