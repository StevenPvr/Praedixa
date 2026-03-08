import { type NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  clearAuthCookies,
  resolveAuthAppOrigin,
  setAuthCookies,
} from "@/lib/auth/oidc";
import { resolveRequestSession } from "@/lib/auth/request-session";
import {
  isSameOriginBrowserRequest,
  resolveExpectedOrigin,
} from "@/lib/security/browser-request";
import { consumeRateLimit } from "@/lib/security/rate-limit";

const DEFAULT_MIN_TTL_SECONDS = 60;
const MAX_MIN_TTL_SECONDS = 3600;
const SESSION_RATE_LIMIT_MAX = 600;
const SESSION_RATE_LIMIT_WINDOW_MS = 60_000;

type RateLimitSnapshot = Awaited<ReturnType<typeof consumeRateLimit>>;

function createJsonResponse(body: unknown, status: number): NextResponse {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function createUnauthorizedResponse(clearCookies = true): NextResponse {
  const response = createJsonResponse({ error: "unauthorized" }, 401);
  if (clearCookies) clearAuthCookies(response);
  return response;
}

function applyRateLimitHeaders(response: NextResponse, rate: RateLimitSnapshot): void {
  response.headers.set("X-RateLimit-Limit", String(SESSION_RATE_LIMIT_MAX));
  response.headers.set("X-RateLimit-Remaining", String(rate.remaining));
  response.headers.set("X-RateLimit-Reset", String(rate.resetAtEpochSeconds));
  if (rate.allowed) return;
  response.headers.set("Retry-After", String(rate.retryAfterSeconds));
}

function createRateLimitedResponse(rate: RateLimitSnapshot): NextResponse {
  const response = createJsonResponse({ error: "rate_limited" }, 429);
  applyRateLimitHeaders(response, rate);
  return response;
}

function getRateLimitIdentifier(request: NextRequest): string | null {
  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
  return sessionCookie ? `session:${sessionCookie}` : null;
}

function parseMinTtlSeconds(request: NextRequest): number {
  const rawValue =
    request.nextUrl.searchParams.get("min_ttl") ?? `${DEFAULT_MIN_TTL_SECONDS}`;
  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue)) {
    return DEFAULT_MIN_TTL_SECONDS;
  }

  return Math.max(0, Math.min(MAX_MIN_TTL_SECONDS, parsedValue));
}

function buildSessionBody(session: {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
  organizationId: string | null;
  siteId: string | null;
}) {
  return {
    user: {
      id: session.sub,
      email: session.email,
      role: session.role,
      permissions: session.permissions,
      organizationId: session.organizationId,
      siteId: session.siteId,
    },
  };
}

async function resolveSessionRateLimit(
  request: NextRequest,
): Promise<RateLimitSnapshot> {
  return consumeRateLimit(request, {
    scope: "auth:session",
    max: SESSION_RATE_LIMIT_MAX,
    windowMs: SESSION_RATE_LIMIT_WINDOW_MS,
    identifier: getRateLimitIdentifier(request),
  });
}

function createSessionResponse(
  request: NextRequest,
  session: {
    sub: string;
    email: string;
    role: string;
    permissions: string[];
    organizationId: string | null;
    siteId: string | null;
  },
  rate: RateLimitSnapshot,
  cookieUpdate: Parameters<typeof setAuthCookies>[2] | null,
): NextResponse {
  const response = createJsonResponse(buildSessionBody(session), 200);
  applyRateLimitHeaders(response, rate);
  if (cookieUpdate) {
    setAuthCookies(response, request, cookieUpdate);
  }
  return response;
}

export async function GET(request: NextRequest) {
  const expectedOrigin = resolveExpectedOrigin(request, resolveAuthAppOrigin);
  if (!isSameOriginBrowserRequest(request, expectedOrigin)) {
    return createJsonResponse({ error: "csrf_failed" }, 403);
  }

  const rate = await resolveSessionRateLimit(request);
  if (!rate.allowed) {
    return createRateLimitedResponse(rate);
  }

  const resolved = await resolveRequestSession(request, {
    minTtlSeconds: parseMinTtlSeconds(request),
    preserveCookiesOnRefreshFailure: true,
  });

  if (!resolved.ok) {
    return createUnauthorizedResponse(resolved.clearCookies);
  }

  return createSessionResponse(
    request,
    resolved.session,
    rate,
    resolved.cookieUpdate,
  );
}
