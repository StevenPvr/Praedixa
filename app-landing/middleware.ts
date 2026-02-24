import { type NextRequest, NextResponse } from "next/server";
import { generateNonce, buildCspHeader } from "./lib/security/csp";
import { locales, legacyRedirectMap } from "./lib/i18n/config";
import { resolveLocaleFromPathname } from "./lib/i18n/request-locale";

const CANONICAL_HOST = "www.praedixa.com";
const PRODUCTION_HOSTS = new Set(["praedixa.com", CANONICAL_HOST]);

function isApiOrStatic(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  );
}

function normalizeHost(host: string): string {
  const normalized = host.trim().toLowerCase();
  if (normalized.endsWith(":443")) return normalized.slice(0, -4);
  if (normalized.endsWith(":80")) return normalized.slice(0, -3);
  return normalized;
}

function resolveRequestHost(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    return normalizeHost(forwardedHost.split(",")[0] ?? "");
  }
  const host = request.headers.get("host");
  if (host) {
    return normalizeHost(host);
  }
  return normalizeHost(request.nextUrl.host);
}

function hasLocalePrefix(pathname: string): boolean {
  return locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
}

function normalizePathname(pathname: string): string {
  if (pathname === "/") return pathname;
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function resolveCanonicalTarget(request: NextRequest): URL | null {
  const target = request.nextUrl.clone();
  let shouldRedirect = false;

  const requestHost = resolveRequestHost(request);
  if (PRODUCTION_HOSTS.has(requestHost)) {
    if (target.protocol !== "https:") {
      target.protocol = "https:";
      shouldRedirect = true;
    }
    if (target.hostname !== CANONICAL_HOST) {
      target.hostname = CANONICAL_HOST;
      target.port = "";
      shouldRedirect = true;
    }
  }

  if (!isApiOrStatic(target.pathname)) {
    const normalizedPathname = normalizePathname(target.pathname);
    if (normalizedPathname !== target.pathname) {
      target.pathname = normalizedPathname;
      shouldRedirect = true;
    }

    if (target.pathname === "/") {
      target.pathname = "/fr";
      shouldRedirect = true;
    } else {
      const localizedTarget = legacyRedirectMap[target.pathname];
      if (localizedTarget && localizedTarget !== target.pathname) {
        target.pathname = localizedTarget;
        shouldRedirect = true;
      }
    }
  }

  return shouldRedirect ? target : null;
}

function buildRequestHeaders(
  request: NextRequest,
  nonce: string,
  cspHeader: string,
): Headers {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);
  requestHeaders.set(
    "x-request-locale",
    resolveLocaleFromPathname(request.nextUrl.pathname),
  );
  return requestHeaders;
}

function addCsp(
  request: NextRequest,
  response: NextResponse | null = null,
): NextResponse {
  const nonce = generateNonce();
  const cspHeader = buildCspHeader(nonce);
  const requestHeaders = buildRequestHeaders(request, nonce, cspHeader);

  const nextResponse =
    response ??
    NextResponse.next({
      request: { headers: requestHeaders },
    });

  nextResponse.headers.set("Content-Security-Policy", cspHeader);
  return nextResponse;
}

export async function middleware(request: NextRequest) {
  const canonicalTarget = resolveCanonicalTarget(request);
  if (canonicalTarget) {
    return addCsp(request, NextResponse.redirect(canonicalTarget, 301));
  }

  const { pathname } = request.nextUrl;

  if (isApiOrStatic(pathname)) {
    return addCsp(request);
  }

  if (!hasLocalePrefix(pathname)) {
    return addCsp(request);
  }

  return addCsp(request);
}

export const proxy = middleware;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2)$).*)",
  ],
};
