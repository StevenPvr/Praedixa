import { isIP } from "node:net";

type ValidateOutboundUrlOptions = {
  allowedHosts: readonly string[];
  allowlistLabel?: string;
  label: string;
  nodeEnv: "development" | "staging" | "production";
  reservedHosts?: readonly string[];
  reservedLabel?: string;
};

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

function isLoopbackOrPrivateIp(hostname: string): boolean {
  const ipVersion = isIP(hostname);
  if (ipVersion === 4) {
    const octets = hostname
      .split(".")
      .map((segment) => Number.parseInt(segment, 10));
    const first = octets[0] ?? -1;
    const second = octets[1] ?? -1;
    return (
      first === 10 ||
      first === 127 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168)
    );
  }
  if (ipVersion === 6) {
    return (
      hostname === "::1" ||
      hostname.startsWith("fe80:") ||
      hostname.startsWith("fc") ||
      hostname.startsWith("fd")
    );
  }
  return false;
}

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  );
}

function isAllowedHost(
  hostname: string,
  allowedHosts: readonly string[],
): boolean {
  return allowedHosts.some(
    (allowedHost) =>
      hostname === allowedHost || hostname.endsWith(`.${allowedHost}`),
  );
}

export function validateOutboundUrl(
  rawUrl: string,
  options: ValidateOutboundUrlOptions,
): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`${options.label} must be a valid absolute URL`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${options.label} must use http(s)`);
  }
  if (parsed.username || parsed.password) {
    throw new Error(`${options.label} must not embed credentials`);
  }
  if (parsed.search || parsed.hash) {
    throw new Error(`${options.label} must not include query or fragment`);
  }

  const hostname = normalizeHostname(parsed.hostname);
  if (!hostname) {
    throw new Error(`${options.label} must include a hostname`);
  }

  if (options.nodeEnv === "development") {
    if (
      parsed.protocol === "http:" &&
      !isLocalHostname(hostname) &&
      !hostname.startsWith("127.")
    ) {
      throw new Error(
        `${options.label} may use http only for localhost in development`,
      );
    }
    return parsed.toString().replace(/\/$/, "");
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`${options.label} must use https outside development`);
  }
  if (isLocalHostname(hostname) || isLoopbackOrPrivateIp(hostname)) {
    throw new Error(`${options.label} host is not allowed`);
  }
  if (
    options.reservedHosts != null &&
    options.reservedHosts.length > 0 &&
    isAllowedHost(hostname, options.reservedHosts)
  ) {
    throw new Error(
      `${options.label} host is reserved for ${options.reservedLabel ?? "a reserved environment"}`,
    );
  }
  const allowlistLabel =
    options.allowlistLabel ?? "CONNECTORS_ALLOWED_OUTBOUND_HOSTS";
  if (options.allowedHosts.length === 0) {
    throw new Error(`${allowlistLabel} must be configured outside development`);
  }
  if (!isAllowedHost(hostname, options.allowedHosts)) {
    throw new Error(
      `${options.label} host is not on the ${allowlistLabel} allowlist`,
    );
  }

  return parsed.toString().replace(/\/$/, "");
}
