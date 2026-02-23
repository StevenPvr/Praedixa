import { type NextRequest, NextResponse } from "next/server";
import { generateNonce, buildCspHeader } from "./lib/security/csp";
import { locales, legacyRedirectMap } from "./lib/i18n/config";
import { resolveLocaleFromPathname } from "./lib/i18n/request-locale";

function isApiOrStatic(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  );
}

function hasLocalePrefix(pathname: string): boolean {
  return locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
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
  const { pathname } = request.nextUrl;

  if (isApiOrStatic(pathname)) {
    return addCsp(request);
  }

  if (pathname === "/") {
    const target = request.nextUrl.clone();
    target.pathname = "/fr";
    return addCsp(request, NextResponse.redirect(target, 301));
  }

  const localizedTarget = legacyRedirectMap[pathname];
  if (localizedTarget) {
    const target = request.nextUrl.clone();
    target.pathname = localizedTarget;
    return addCsp(request, NextResponse.redirect(target, 301));
  }

  if (!hasLocalePrefix(pathname)) {
    return addCsp(request);
  }

  return addCsp(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2)$).*)",
  ],
};
