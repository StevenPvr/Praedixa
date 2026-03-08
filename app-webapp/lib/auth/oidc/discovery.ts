import type { TrustedOidcEndpoints } from "./types";

function normalizeUrlForComparison(value: string): string {
  return value.replace(/\/$/, "");
}

function parseHttpsUrl(value: string, label: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Invalid OIDC ${label}`);
  }

  if (parsed.protocol !== "https:") {
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
      throw new Error("OIDC discovery request failed");
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
  const configuredIssuer = parseHttpsUrl(issuerUrl, "issuer URL");
  const normalizedConfiguredIssuer = normalizeUrlForComparison(
    configuredIssuer.toString(),
  );

  const discovery = await fetchOidcDiscovery(normalizedConfiguredIssuer);
  const discoveredIssuer = parseHttpsUrl(
    readDiscoveryString(discovery, "issuer"),
    "discovery issuer",
  );
  const normalizedDiscoveredIssuer = normalizeUrlForComparison(
    discoveredIssuer.toString(),
  );

  if (normalizedConfiguredIssuer !== normalizedDiscoveredIssuer) {
    throw new Error("OIDC issuer mismatch between config and discovery");
  }

  const authorizationEndpoint = parseHttpsUrl(
    readDiscoveryString(discovery, "authorization_endpoint"),
    "authorization endpoint",
  );
  const tokenEndpoint = parseHttpsUrl(
    readDiscoveryString(discovery, "token_endpoint"),
    "token endpoint",
  );
  const revocationEndpointValue = readOptionalDiscoveryString(
    discovery,
    "revocation_endpoint",
  );

  if (
    authorizationEndpoint.origin !== configuredIssuer.origin ||
    tokenEndpoint.origin !== configuredIssuer.origin
  ) {
    throw new Error("OIDC endpoints must share issuer origin");
  }

  return {
    authorizationEndpoint: authorizationEndpoint.toString(),
    tokenEndpoint: tokenEndpoint.toString(),
    revocationEndpoint:
      revocationEndpointValue &&
      (() => {
        try {
          const parsed = parseHttpsUrl(
            revocationEndpointValue,
            "revocation endpoint",
          );
          return parsed.origin === configuredIssuer.origin
            ? parsed.toString()
            : null;
        } catch {
          return null;
        }
      })(),
  };
}
