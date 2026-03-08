import type { NextRequest } from "next/server";

const DEFAULT_DEV_AUTH_ORIGIN = "http://localhost:3001";

export function normalizeHttpOrigin(origin: string): string | null {
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

export function getConfiguredAuthAppOrigin(): string | null {
  const configuredOrigin =
    process.env.AUTH_APP_ORIGIN?.trim() ??
    process.env.NEXT_PUBLIC_APP_ORIGIN?.trim() ??
    "";

  return configuredOrigin ? normalizeHttpOrigin(configuredOrigin) : null;
}

export function resolveAuthAppOrigin(request: NextRequest): string {
  const configuredOrigin = getConfiguredAuthAppOrigin();
  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEFAULT_DEV_AUTH_ORIGIN;
  }

  const normalizedRequestOrigin = normalizeHttpOrigin(request.nextUrl.origin);
  if (normalizedRequestOrigin?.startsWith("https://")) {
    return normalizedRequestOrigin;
  }

  throw new Error(
    "Missing AUTH_APP_ORIGIN (or NEXT_PUBLIC_APP_ORIGIN) for production auth redirects",
  );
}

export function isAllowedSameOriginRequest(request: NextRequest): boolean {
  const expectedOrigin =
    getConfiguredAuthAppOrigin() ?? normalizeHttpOrigin(request.nextUrl.origin);
  if (!expectedOrigin) {
    return false;
  }

  const origin = request.headers.get("origin");
  if (origin) {
    return normalizeHttpOrigin(origin) === expectedOrigin;
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  return !fetchSite || fetchSite === "same-origin" || fetchSite === "none";
}
