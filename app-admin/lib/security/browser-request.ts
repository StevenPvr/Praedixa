import type { NextRequest } from "next/server";

export function normalizeOrigin(
  value: string | null | undefined,
): string | null {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

interface SameOriginOptions {
  allowNavigate?: boolean;
}

export function resolveExpectedOrigin(
  request: NextRequest,
  resolveOrigin: (request: NextRequest) => string,
): string {
  try {
    return resolveOrigin(request);
  } catch {
    return "";
  }
}

export function isSameOriginBrowserRequest(
  request: NextRequest,
  expectedOrigin: string,
  options: SameOriginOptions = {},
): boolean {
  const normalizedExpectedOrigin = normalizeOrigin(expectedOrigin);
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

  const origin = normalizeOrigin(request.headers.get("origin"));
  if (origin) {
    return origin === normalizedExpectedOrigin;
  }

  if (fetchSite === "same-origin") {
    return true;
  }
  if (fetchSite === "none") {
    return options.allowNavigate === true;
  }

  if (options.allowNavigate === true) {
    const refererOrigin = normalizeOrigin(request.headers.get("referer"));
    if (refererOrigin) {
      return refererOrigin === normalizedExpectedOrigin;
    }
  }

  return false;
}
