import { execFileSync } from "node:child_process";
import { isIP } from "node:net";

type ValidateOutboundUrlOptions = {
  allowedHosts: readonly string[];
  allowlistLabel?: string;
  label: string;
  nodeEnv: "development" | "staging" | "production";
  reservedHosts?: readonly string[];
  reservedLabel?: string;
};

const DNS_LOOKUP_TIMEOUT_MS = 2_000;
const DNS_CACHE_TTL_MS = 60_000;
const DNS_LOOKUP_MAX_ADDRESSES = 32;
const DNS_LOOKUP_MAX_BUFFER_BYTES = 16 * 1024;
const dnsResolutionCache = new Map<
  string,
  { addresses: string[]; expiresAt: number }
>();

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

function isLoopbackOrPrivateIp(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  if (normalized.startsWith("::ffff:")) {
    return isLoopbackOrPrivateIp(normalized.slice("::ffff:".length));
  }

  const ipVersion = isIP(normalized);
  if (ipVersion === 4) {
    const octets = normalized
      .split(".")
      .map((segment) => Number.parseInt(segment, 10));
    const first = octets[0] ?? -1;
    const second = octets[1] ?? -1;
    return (
      first === 0 ||
      first === 10 ||
      (first === 100 && second >= 64 && second <= 127) ||
      first === 127 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 0) ||
      (first === 192 && second === 168) ||
      (first === 198 && (second === 18 || second === 19)) ||
      first >= 224
    );
  }
  if (ipVersion === 6) {
    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fe80:") ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("2001:db8:")
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

function runDnsLookup(hostname: string): string[] {
  const lookupScript = `
    import { lookup } from "node:dns/promises";

    const hostname = process.argv[1];
    try {
      const records = await lookup(hostname, {
        all: true,
        verbatim: true,
      });
      const addresses = Array.from(
        new Set(
          records
            .map((record) => record?.address)
            .filter((address) => typeof address === "string" && address.length > 0),
        ),
      ).slice(0, ${DNS_LOOKUP_MAX_ADDRESSES});
      process.stdout.write(JSON.stringify(addresses));
    } catch {
      process.exit(2);
    }
  `;

  const rawOutput = execFileSync(
    process.execPath,
    ["--input-type=module", "-e", lookupScript, hostname],
    {
      encoding: "utf8",
      maxBuffer: DNS_LOOKUP_MAX_BUFFER_BYTES,
      stdio: ["ignore", "pipe", "ignore"],
      timeout: DNS_LOOKUP_TIMEOUT_MS,
    },
  );

  const parsed = JSON.parse(rawOutput) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Outbound hostname DNS lookup returned an invalid payload");
  }

  const normalizedAddresses = Array.from(
    new Set(
      parsed
        .filter((address): address is string => typeof address === "string")
        .map((address) => address.trim().toLowerCase())
        .filter((address) => address.length > 0),
    ),
  );
  if (normalizedAddresses.length === 0) {
    throw new Error("Outbound hostname DNS lookup returned no addresses");
  }

  return normalizedAddresses;
}

function resolveHostnameAddresses(hostname: string): string[] {
  const normalizedHostname = normalizeHostname(hostname);
  if (isIP(normalizedHostname) !== 0) {
    return [normalizedHostname];
  }

  const cached = dnsResolutionCache.get(normalizedHostname);
  if (cached != null && cached.expiresAt > Date.now()) {
    return cached.addresses;
  }

  const addresses = runDnsLookup(normalizedHostname);
  dnsResolutionCache.set(normalizedHostname, {
    addresses,
    expiresAt: Date.now() + DNS_CACHE_TTL_MS,
  });
  return addresses;
}

function assertNoPrivateDnsResolution(hostname: string, label: string): void {
  let addresses: string[];
  try {
    addresses = resolveHostnameAddresses(hostname);
  } catch {
    throw new Error(`${label} host could not be resolved to a public IP`);
  }

  if (addresses.some((address) => isLoopbackOrPrivateIp(address))) {
    throw new Error(`${label} host resolved to a non-public IP address`);
  }
}

export function clearOutboundUrlDnsCacheForTests(): void {
  dnsResolutionCache.clear();
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
  assertNoPrivateDnsResolution(hostname, options.label);

  return parsed.toString().replace(/\/$/, "");
}
