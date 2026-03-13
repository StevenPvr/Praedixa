import type { NextRequest } from "next/server";

const DEFAULT_DEV_AUTH_ORIGIN = "http://localhost:3001";
const MISSING_PUBLIC_AUTH_ORIGIN_ERROR =
  "Missing AUTH_APP_ORIGIN (or NEXT_PUBLIC_APP_ORIGIN) for production auth redirects";

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

function normalizeConfiguredAuthOrigin(
  variableName: "AUTH_APP_ORIGIN" | "NEXT_PUBLIC_APP_ORIGIN",
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

function getConfiguredAuthAppOriginState(): ConfiguredAuthOriginState {
  const authOriginRaw = process.env.AUTH_APP_ORIGIN?.trim() ?? "";
  const nextPublicOriginRaw = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim() ?? "";

  if (!authOriginRaw && !nextPublicOriginRaw) {
    return { error: null, origin: null };
  }

  try {
    const authOrigin = authOriginRaw
      ? normalizeConfiguredAuthOrigin("AUTH_APP_ORIGIN", authOriginRaw)
      : null;
    const nextPublicOrigin = nextPublicOriginRaw
      ? normalizeConfiguredAuthOrigin(
          "NEXT_PUBLIC_APP_ORIGIN",
          nextPublicOriginRaw,
        )
      : null;

    if (authOrigin && nextPublicOrigin && authOrigin !== nextPublicOrigin) {
      return {
        error:
          "Invalid auth app origin configuration: AUTH_APP_ORIGIN and NEXT_PUBLIC_APP_ORIGIN must match when both are set",
        origin: null,
      };
    }

    return {
      error: null,
      origin: authOrigin ?? nextPublicOrigin,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Invalid auth app origin",
      origin: null,
    };
  }
}

export function getConfiguredAuthAppOrigin(): string | null {
  return getConfiguredAuthAppOriginState().origin;
}

export function getConfiguredAuthAppOriginError(): string | null {
  return getConfiguredAuthAppOriginState().error;
}

export function resolveAuthAppOrigin(_request: NextRequest): string {
  const { error, origin } = getConfiguredAuthAppOriginState();
  if (error) {
    throw new Error(error);
  }
  if (origin) {
    return origin;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEFAULT_DEV_AUTH_ORIGIN;
  }

  throw new Error(MISSING_PUBLIC_AUTH_ORIGIN_ERROR);
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

  const origin = request.headers.get("origin");
  if (origin) {
    return normalizeHttpOrigin(origin) === normalizedExpectedOrigin;
  }

  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite) {
    if (fetchSite === "same-origin") {
      return true;
    }
    if (fetchSite === "cross-site") {
      return false;
    }
    if (fetchSite === "none") {
      return options.allowNavigate === true;
    }
  }

  if (options.allowNavigate === true) {
    const refererOrigin = normalizeHttpOrigin(request.headers.get("referer"));
    if (refererOrigin) {
      return refererOrigin === normalizedExpectedOrigin;
    }
  }

  return false;
}
