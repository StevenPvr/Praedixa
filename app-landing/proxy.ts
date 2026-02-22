import { type NextRequest, NextResponse } from "next/server";
import { generateNonce, buildCspHeader } from "./lib/security/csp";
import { locales, legacyRedirectMap } from "./lib/i18n/config";
import { detectRequestLocale } from "./lib/i18n/request-locale";

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

function addCsp(request: NextRequest, response: NextResponse): NextResponse {
  const nonce = generateNonce();
  const cspHeader = buildCspHeader(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  const nextResponse =
    response ??
    NextResponse.next({
      request: { headers: requestHeaders },
    });

  nextResponse.headers.set("Content-Security-Policy", cspHeader);
  return nextResponse;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isApiOrStatic(pathname)) {
    return addCsp(request, NextResponse.next());
  }

  if (pathname === "/") {
    const target = request.nextUrl.clone();
    target.pathname = `/${detectRequestLocale(request.headers)}`;
    return addCsp(request, NextResponse.redirect(target));
  }

  const localizedTarget = legacyRedirectMap[pathname];
  if (localizedTarget) {
    const target = request.nextUrl.clone();
    target.pathname = localizedTarget;
    return addCsp(request, NextResponse.redirect(target, 301));
  }

  if (!hasLocalePrefix(pathname)) {
    return addCsp(request, NextResponse.next());
  }

  return addCsp(request, NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2)$).*)",
  ],
};
