import type { NextRequest } from "next/server";

const DEFAULT_DEV_AUTH_ORIGIN = "http://localhost:3001";
const DEFAULT_DEV_ADMIN_ORIGIN = "http://localhost:3002";
const DEFAULT_DEV_AUTH_PORT = "3001";
const DEFAULT_DEV_ADMIN_PORT = "3002";
const MISSING_PUBLIC_AUTH_ORIGIN_ERROR =
  "Missing AUTH_APP_ORIGIN (or NEXT_PUBLIC_APP_ORIGIN) for production auth redirects";
const MISSING_PUBLIC_ADMIN_ORIGIN_ERROR =
  "Missing AUTH_ADMIN_APP_ORIGIN (or NEXT_PUBLIC_ADMIN_APP_ORIGIN) for super_admin handoff redirects";

export interface SameOriginRequestOptions {
  allowNavigate?: boolean;
}

type ConfiguredAuthOriginState = {
  error: string | null;
  origin: string | null;
};

export function normalizeHttpOrigin(
  origin: string | null | undefined,
): string | null {
  if (!origin) {
    return null;
  }

  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

function isPrivateIpv4Hostname(hostname: string): boolean {
  const octets = hostname.split(".");
  if (octets.length !== 4) {
    return false;
  }

  const values = octets.map((octet) => Number.parseInt(octet, 10));
  if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    return false;
  }

  return (
    values[0] === 10 ||
    (values[0] === 172 && values[1] >= 16 && values[1] <= 31) ||
    (values[0] === 192 && values[1] === 168)
  );
}

function isDevelopmentLocalHostname(hostname: string): boolean {
  const normalizedHostname = hostname.trim().toLowerCase();
  return (
    normalizedHostname === "localhost" ||
    normalizedHostname === "127.0.0.1" ||
    normalizedHostname === "::1" ||
    normalizedHostname === "[::1]" ||
    isPrivateIpv4Hostname(normalizedHostname)
  );
}

function isDevelopmentLocalOrigin(
  origin: string | null,
  expectedPort: string,
): origin is string {
  if (!origin) {
    return false;
  }

  try {
    const parsed = new URL(origin);
    const parsedPort =
      parsed.port || (parsed.protocol === "https:" ? "443" : "80");

    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      parsedPort === expectedPort &&
      isDevelopmentLocalHostname(parsed.hostname)
    );
  } catch {
    return false;
  }
}

function normalizeConfiguredOrigin(
  variableName: string,
  origin: string,
): string {
  const trimmedOrigin = origin.trim();
  const normalizedOrigin = normalizeHttpOrigin(trimmedOrigin);
  if (!normalizedOrigin) {
    throw new Error(
      `Invalid ${variableName}: must be an http(s) origin without extra path data`,
    );
  }

  const parsed = new URL(trimmedOrigin);
  if (parsed.username || parsed.password) {
    throw new Error(`Invalid ${variableName}: credentials are not allowed`);
  }
  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error(
      `Invalid ${variableName}: use a bare origin without path, query, or fragment`,
    );
  }

  return normalizedOrigin;
}

function getConfiguredOriginState(
  serverVariableName: string,
  publicVariableName: string,
): ConfiguredAuthOriginState {
  const serverOriginRaw = process.env[serverVariableName]?.trim() ?? "";
  const publicOriginRaw = process.env[publicVariableName]?.trim() ?? "";

  if (!serverOriginRaw && !publicOriginRaw) {
    return { error: null, origin: null };
  }

  try {
    const serverOrigin = serverOriginRaw
      ? normalizeConfiguredOrigin(serverVariableName, serverOriginRaw)
      : null;
    const publicOrigin = publicOriginRaw
      ? normalizeConfiguredOrigin(publicVariableName, publicOriginRaw)
      : null;

    if (serverOrigin && publicOrigin && serverOrigin !== publicOrigin) {
      return {
        error: `Invalid origin configuration: ${serverVariableName} and ${publicVariableName} must match when both are set`,
        origin: null,
      };
    }

    return {
      error: null,
      origin: serverOrigin ?? publicOrigin,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Invalid auth app origin",
      origin: null,
    };
  }
}

function getConfiguredAuthAppOriginState(): ConfiguredAuthOriginState {
  return getConfiguredOriginState("AUTH_APP_ORIGIN", "NEXT_PUBLIC_APP_ORIGIN");
}

function getConfiguredAdminAppOriginState(): ConfiguredAuthOriginState {
  return getConfiguredOriginState(
    "AUTH_ADMIN_APP_ORIGIN",
    "NEXT_PUBLIC_ADMIN_APP_ORIGIN",
  );
}

function deriveAdminOrigin(authOrigin: string): string | null {
  const parsed = new URL(authOrigin);

  if (isDevelopmentLocalHostname(parsed.hostname)) {
    parsed.port = "3002";
    return parsed.origin;
  }

  const labels = parsed.hostname.split(".");
  const subdomain = labels[0];
  if (!subdomain) {
    return null;
  }

  if (subdomain === "app") {
    labels[0] = "admin";
    parsed.hostname = labels.join(".");
    return parsed.origin;
  }

  if (subdomain.endsWith("-app")) {
    labels[0] = `${subdomain.slice(0, -4)}-admin`;
    parsed.hostname = labels.join(".");
    return parsed.origin;
  }

  return null;
}

export function getConfiguredAuthAppOrigin(): string | null {
  return getConfiguredAuthAppOriginState().origin;
}

export function getConfiguredAdminAppOrigin(): string | null {
  return getConfiguredAdminAppOriginState().origin;
}

export function getConfiguredAuthAppOriginError(): string | null {
  return getConfiguredAuthAppOriginState().error;
}

export function resolveAuthAppOrigin(request: NextRequest): string {
  const { error, origin } = getConfiguredAuthAppOriginState();
  if (error) {
    throw new Error(error);
  }
  const requestOrigin = normalizeHttpOrigin(request.nextUrl.origin);
  if (
    process.env.NODE_ENV !== "production" &&
    isDevelopmentLocalOrigin(requestOrigin, DEFAULT_DEV_AUTH_PORT) &&
    (origin === null || isDevelopmentLocalOrigin(origin, DEFAULT_DEV_AUTH_PORT))
  ) {
    return requestOrigin;
  }
  if (origin) {
    return origin;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEFAULT_DEV_AUTH_ORIGIN;
  }

  throw new Error(MISSING_PUBLIC_AUTH_ORIGIN_ERROR);
}

export function resolveAdminAppOrigin(request: NextRequest): string {
  const { error, origin } = getConfiguredAdminAppOriginState();
  if (error) {
    throw new Error(error);
  }
  const requestOrigin = normalizeHttpOrigin(request.nextUrl.origin);
  if (
    process.env.NODE_ENV !== "production" &&
    isDevelopmentLocalOrigin(requestOrigin, DEFAULT_DEV_AUTH_PORT) &&
    (origin === null || isDevelopmentLocalOrigin(origin, DEFAULT_DEV_ADMIN_PORT))
  ) {
    const derivedRequestOrigin = deriveAdminOrigin(requestOrigin);
    if (derivedRequestOrigin) {
      return derivedRequestOrigin;
    }
  }
  if (origin) {
    return origin;
  }

  const derivedOrigin = deriveAdminOrigin(resolveAuthAppOrigin(request));
  if (derivedOrigin) {
    return derivedOrigin;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEFAULT_DEV_ADMIN_ORIGIN;
  }

  throw new Error(MISSING_PUBLIC_ADMIN_ORIGIN_ERROR);
}

export function isAllowedSameOriginRequest(
  request: NextRequest,
  expectedOrigin: string | null | undefined = getConfiguredAuthAppOrigin(),
  options: SameOriginRequestOptions = {},
): boolean {
  if (!expectedOrigin && getConfiguredAuthAppOriginState().error) {
    return false;
  }
  const normalizedExpectedOrigin = normalizeHttpOrigin(expectedOrigin ?? null);
  if (!normalizedExpectedOrigin) {
    return false;
  }

  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite) {
    if (fetchSite === "cross-site" || fetchSite === "same-site") {
      return false;
    }
    if (fetchSite === "none" && options.allowNavigate !== true) {
      return false;
    }
  }

  const origin = request.headers.get("origin");
  if (origin) {
    return normalizeHttpOrigin(origin) === normalizedExpectedOrigin;
  }

  if (fetchSite === "same-origin") {
    return true;
  }
  if (fetchSite === "none") {
    return options.allowNavigate === true;
  }

  if (options.allowNavigate === true) {
    const refererOrigin = normalizeHttpOrigin(request.headers.get("referer"));
    if (refererOrigin) {
      return refererOrigin === normalizedExpectedOrigin;
    }
  }

  return false;
}
