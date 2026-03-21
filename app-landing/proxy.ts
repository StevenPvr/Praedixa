import { type NextRequest, NextResponse } from "next/server";
import { generateNonce, buildCspHeader } from "./lib/security/csp";
import { legacyRedirectMap } from "./lib/i18n/config";
import { resolveLocaleFromPathname } from "./lib/i18n/request-locale";
import {
  buildLandingRobotsTag,
  resolveLandingExposurePolicy,
  shouldBlockLandingAiCrawler,
  type LandingExposurePolicyRule,
} from "./lib/security/exposure-policy";
import { logSecurityEvent } from "./lib/security/audit-log";

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
  const host = request.headers.get("host");
  if (host) {
    return normalizeHost(host);
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    return normalizeHost(forwardedHost.split(",")[0] ?? "");
  }
  return normalizeHost(request.nextUrl.host);
}

function resolveForwardedProto(request: NextRequest): "http" | "https" | null {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (!forwardedProto) return null;

  const normalized = forwardedProto.split(",")[0]?.trim().toLowerCase();
  if (normalized === "http" || normalized === "https") {
    return normalized;
  }
  return null;
}

function normalizePathname(pathname: string): string {
  if (pathname === "/") return pathname;
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function enforceCanonicalHost(
  target: URL,
  requestHost: string,
  forwardedProto: "http" | "https" | null,
): boolean {
  let shouldRedirect = false;
  const shouldForceHttps =
    requestHost === "praedixa.com" || forwardedProto === "http";
  if (shouldForceHttps && target.protocol !== "https:") {
    target.protocol = "https:";
    shouldRedirect = true;
  }
  if (requestHost === "praedixa.com") {
    target.hostname = CANONICAL_HOST;
    target.port = "";
    shouldRedirect = true;
  }
  return shouldRedirect;
}

function applyLegacyRedirect(target: URL): boolean {
  const localizedTarget = legacyRedirectMap[target.pathname];
  if (!localizedTarget || localizedTarget === target.pathname) {
    return false;
  }

  const parsedRedirectTarget = new URL(localizedTarget, target);
  const mergedSearchParams = new URLSearchParams(parsedRedirectTarget.search);
  for (const [key, value] of target.searchParams.entries()) {
    if (!mergedSearchParams.has(key)) {
      mergedSearchParams.append(key, value);
    }
  }

  target.pathname = parsedRedirectTarget.pathname;
  target.search = mergedSearchParams.toString()
    ? `?${mergedSearchParams.toString()}`
    : "";
  target.hash = parsedRedirectTarget.hash;
  return true;
}

function resolveCanonicalTarget(request: NextRequest): URL | null {
  const target = request.nextUrl.clone();
  const requestHost = resolveRequestHost(request);
  let shouldRedirect = false;

  if (PRODUCTION_HOSTS.has(requestHost)) {
    shouldRedirect =
      enforceCanonicalHost(
        target,
        requestHost,
        resolveForwardedProto(request),
      ) || shouldRedirect;
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
    } else if (applyLegacyRedirect(target)) {
      shouldRedirect = true;
    }
  }

  return shouldRedirect ? target : null;
}

function buildRequestHeaders(
  request: NextRequest,
  nonce: string,
  cspHeader: string,
  exposurePolicy: LandingExposurePolicyRule | null,
): Headers {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);
  requestHeaders.set(
    "x-request-locale",
    resolveLocaleFromPathname(request.nextUrl.pathname),
  );
  requestHeaders.set(
    "x-request-pathname",
    normalizePathname(request.nextUrl.pathname),
  );
  if (exposurePolicy) {
    requestHeaders.set("x-exposure-policy-id", exposurePolicy.id);
    requestHeaders.set(
      "x-exposure-classification",
      exposurePolicy.classification,
    );
    requestHeaders.set("x-exposure-audience", exposurePolicy.audience);
  }
  return requestHeaders;
}

function applyExposureHeaders(
  response: NextResponse,
  exposurePolicy: LandingExposurePolicyRule | null,
): void {
  const robotsTag = buildLandingRobotsTag(exposurePolicy);
  if (robotsTag && !response.headers.has("X-Robots-Tag")) {
    response.headers.set("X-Robots-Tag", robotsTag);
  }
}

function addCsp(
  request: NextRequest,
  exposurePolicy: LandingExposurePolicyRule | null,
  response: NextResponse | null = null,
): NextResponse {
  const nonce = generateNonce();
  const cspHeader = buildCspHeader(nonce);
  const requestHeaders = buildRequestHeaders(
    request,
    nonce,
    cspHeader,
    exposurePolicy,
  );

  const nextResponse =
    response ??
    NextResponse.next({
      request: { headers: requestHeaders },
    });

  nextResponse.headers.set("Content-Security-Policy", cspHeader);
  applyExposureHeaders(nextResponse, exposurePolicy);
  return nextResponse;
}

export async function proxy(request: NextRequest) {
  const exposurePolicy = resolveLandingExposurePolicy(request.nextUrl.pathname);
  const aiCrawlerDecision = shouldBlockLandingAiCrawler(
    request.nextUrl.pathname,
    request.headers.get("user-agent"),
  );
  if (aiCrawlerDecision.blocked) {
    logSecurityEvent("exposure.ai_crawler_blocked", {
      path: request.nextUrl.pathname,
      policyId: aiCrawlerDecision.policy?.id ?? "unknown",
      classification: aiCrawlerDecision.policy?.classification ?? "unknown",
      userAgent: request.headers.get("user-agent") ?? "",
    });
    const blockedResponse = new NextResponse("Forbidden", {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
        Vary: "User-Agent",
        "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
      },
    });
    return addCsp(request, aiCrawlerDecision.policy, blockedResponse);
  }

  const canonicalTarget = resolveCanonicalTarget(request);
  if (canonicalTarget) {
    return addCsp(
      request,
      exposurePolicy,
      NextResponse.redirect(canonicalTarget, 301),
    );
  }

  return addCsp(request, exposurePolicy);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2)$).*)",
  ],
};
