export interface TrustedOidcEndpoints {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  revocationEndpoint: string | null;
}

function normalizeUrlForComparison(value: string): string {
  return value.replace(/\/$/, "");
}

function isAllowedLocalOidcHttpUrl(parsed: URL): boolean {
  if (process.env["NODE_ENV"] === "production") {
    return false;
  }

  return (
    parsed.protocol === "http:" &&
    (parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1")
  );
}

function parseTrustedOidcUrl(value: string, label: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Invalid OIDC ${label}`);
  }

  if (parsed.protocol !== "https:" && !isAllowedLocalOidcHttpUrl(parsed)) {
    throw new Error(`OIDC ${label} must use HTTPS`);
  }

  return parsed;
}

function readDiscoveryString(
  doc: Record<string, unknown>,
  key: string,
): string {
  const value = doc[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`OIDC discovery missing ${key}`);
  }
  return value;
}

function readOptionalDiscoveryString(
  doc: Record<string, unknown>,
  key: string,
): string | null {
  const value = doc[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function truncateDiscoveryFailureDetail(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= 180) {
    return normalized;
  }

  return `${normalized.slice(0, 177)}...`;
}

function summarizeDiscoveryFailure(bodyText: string): string | null {
  const normalized = bodyText.trim();
  if (normalized.length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(bodyText) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      const error =
        typeof record["error"] === "string" ? record["error"].trim() : "";
      const description =
        typeof record["error_description"] === "string"
          ? record["error_description"].trim()
          : "";
      const detail = [error, description]
        .filter((entry) => entry.length > 0)
        .join(": ");
      if (detail.length > 0) {
        return truncateDiscoveryFailureDetail(detail);
      }
    }
  } catch {
    // Fall back to the raw response body summary below.
  }

  return truncateDiscoveryFailureDetail(normalized);
}

async function buildDiscoveryRequestError(response: Response): Promise<Error> {
  const statusLabel = response.statusText.trim().length
    ? `${response.status} ${response.statusText.trim()}`
    : String(response.status);
  const bodyText = await response.text();
  const detail = summarizeDiscoveryFailure(bodyText);

  return new Error(
    detail
      ? `OIDC discovery request failed (${statusLabel}: ${detail})`
      : `OIDC discovery request failed (${statusLabel})`,
  );
}

async function fetchOidcDiscovery(
  issuerUrl: string,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `${issuerUrl}/.well-known/openid-configuration`,
      {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw await buildDiscoveryRequestError(response);
    }

    const parsed = (await response.json()) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid OIDC discovery payload");
    }

    return parsed as Record<string, unknown>;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getTrustedOidcEndpoints(
  issuerUrl: string,
): Promise<TrustedOidcEndpoints> {
  const configuredIssuer = parseTrustedOidcUrl(issuerUrl, "issuer URL");
  const normalizedConfiguredIssuer = normalizeUrlForComparison(
    configuredIssuer.toString(),
  );

  const discovery = await fetchOidcDiscovery(normalizedConfiguredIssuer);
  const discoveredIssuer = parseTrustedOidcUrl(
    readDiscoveryString(discovery, "issuer"),
    "discovery issuer",
  );
  const normalizedDiscoveredIssuer = normalizeUrlForComparison(
    discoveredIssuer.toString(),
  );

  if (normalizedConfiguredIssuer !== normalizedDiscoveredIssuer) {
    throw new Error("OIDC issuer mismatch between config and discovery");
  }

  const authorizationEndpoint = parseTrustedOidcUrl(
    readDiscoveryString(discovery, "authorization_endpoint"),
    "authorization endpoint",
  );
  const tokenEndpoint = parseTrustedOidcUrl(
    readDiscoveryString(discovery, "token_endpoint"),
    "token endpoint",
  );
  const revocationEndpointValue = readOptionalDiscoveryString(
    discovery,
    "revocation_endpoint",
  );
  const revocationEndpoint = revocationEndpointValue
    ? parseTrustedOidcUrl(revocationEndpointValue, "revocation endpoint")
    : null;

  if (
    authorizationEndpoint.origin !== configuredIssuer.origin ||
    tokenEndpoint.origin !== configuredIssuer.origin ||
    (revocationEndpoint != null &&
      revocationEndpoint.origin !== configuredIssuer.origin)
  ) {
    throw new Error("OIDC endpoints must share issuer origin");
  }

  return {
    authorizationEndpoint: authorizationEndpoint.toString(),
    tokenEndpoint: tokenEndpoint.toString(),
    revocationEndpoint: revocationEndpoint?.toString() ?? null,
  };
}
