import { type NextRequest, NextResponse } from "next/server";
import { generateNonce, buildCspHeader } from "./lib/security/csp";
import { locales, defaultLocale, isValidLocale } from "./lib/i18n/config";
import type { Locale } from "./lib/i18n/config";

function getPreferredLocale(request: NextRequest): Locale {
  // 1. Check cookie
  const cookieLocale = request.cookies.get("locale")?.value;
  if (cookieLocale && isValidLocale(cookieLocale)) return cookieLocale;

  // 2. Check Accept-Language header
  const acceptLang = request.headers.get("Accept-Language");
  if (acceptLang) {
    for (const locale of locales) {
      if (acceptLang.toLowerCase().includes(locale)) return locale;
    }
  }

  return defaultLocale;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip locale logic for API routes, static assets, and internals
  const isApiOrStatic =
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".");

  if (!isApiOrStatic) {
    // Check if the pathname starts with a valid locale
    const pathnameLocale = locales.find(
      (locale) =>
        pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
    );

    if (!pathnameLocale) {
      // No locale prefix — redirect to preferred locale
      const locale = getPreferredLocale(request);
      const newUrl = request.nextUrl.clone();
      newUrl.pathname = `/${locale}${pathname}`;
      return NextResponse.redirect(newUrl);
    }
  }

  // CSP nonce injection (existing logic)
  const nonce = generateNonce();
  const cspHeader = buildCspHeader(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", cspHeader);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2)$).*)",
  ],
};
