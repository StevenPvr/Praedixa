function normalizeHostname(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

function parseUrlHostname(value: string): string | null {
  try {
    return normalizeHostname(new URL(value).hostname);
  } catch {
    return null;
  }
}

function extractRawHostname(value: string): string {
  return normalizeHostname(
    value.replace(/^https?:\/\//, "").split("/")[0]?.split(":")[0] ?? value,
  );
}

function parseAllowedHostname(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const hostname = trimmed.includes("://")
    ? parseUrlHostname(trimmed)
    : parseUrlHostname(`https://${trimmed}`);

  return hostname ?? extractRawHostname(trimmed);
}

function parseIpv4Octets(value: string): number[] | null {
  const segments = value.split(".");
  if (segments.length !== 4) return null;

  const octets = segments.map((segment) => Number.parseInt(segment, 10));
  if (
    octets.some((octet, index) => {
      const raw = segments[index] ?? "";
      return (
        raw.length === 0 ||
        !/^\d+$/.test(raw) ||
        Number.isNaN(octet) ||
        octet < 0 ||
        octet > 255
      );
    })
  ) {
    return null;
  }

  return octets;
}

function isPrivateIpv4(hostname: string): boolean {
  const octets = parseIpv4Octets(hostname);
  if (!octets) return false;

  const first = octets[0] ?? -1;
  const second = octets[1] ?? -1;
  if (first === 10 || first === 127) return true;
  if (first === 169 && second === 254) return true;
  if (first === 172 && second >= 16 && second <= 31) return true;
  if (first === 192 && second === 168) return true;
  return false;
}

function isIpv6Literal(hostname: string): boolean {
  return hostname.includes(":") && /^[0-9a-f:.]+$/i.test(hostname);
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!isIpv6Literal(normalized)) return false;

  return (
    normalized === "::1" ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd")
  );
}

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  );
}

export function collectAllowedHostnames(value: string | undefined): Set<string> {
  const hosts = new Set<string>();

  for (const candidate of value?.split(",") ?? []) {
    const hostname = parseAllowedHostname(candidate);
    if (hostname) hosts.add(hostname);
  }

  return hosts;
}

export function assertSafeOutboundUrl(
  url: URL,
  options: { allowedHosts?: Set<string> } = {},
): void {
  const hostname = normalizeHostname(url.hostname);

  if (isLocalHostname(hostname) || isPrivateIpv4(hostname) || isPrivateIpv6(hostname)) {
    throw new Error("Outbound URL host is not allowed");
  }

  const allowedHosts = options.allowedHosts;
  if (allowedHosts && allowedHosts.size > 0 && !allowedHosts.has(hostname)) {
    throw new Error("Outbound URL host is not in the allowlist");
  }
}
