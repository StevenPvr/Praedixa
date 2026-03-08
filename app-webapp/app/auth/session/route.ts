import { type NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from "@/lib/auth/oidc";
import { resolveRequestSession } from "@/lib/auth/request-session";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { isSameOriginBrowserRequest } from "@/lib/security/same-origin";

type RateLimitSnapshot = Awaited<ReturnType<typeof consumeRateLimit>>;

function unauthorized(clearCookies = true): NextResponse {
  const response = NextResponse.json(
    { error: "unauthorized" },
    { status: 401 },
  );
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  if (clearCookies) {
    clearAuthCookies(response);
  }
  return response;
}

function forbidden(): NextResponse {
  const response = NextResponse.json({ error: "forbidden" }, { status: 403 });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function applyRateLimitHeaders(
  response: NextResponse,
  limit: number,
  rate: RateLimitSnapshot,
): void {
  response.headers.set("X-RateLimit-Limit", String(limit));
  response.headers.set("X-RateLimit-Remaining", String(rate.remaining));
  response.headers.set("X-RateLimit-Reset", String(rate.resetAtEpochSeconds));
  if (!rate.allowed) {
    response.headers.set("Retry-After", String(rate.retryAfterSeconds));
  }
}

export async function GET(request: NextRequest) {
  if (!isSameOriginBrowserRequest(request)) {
    return forbidden();
  }

  const signed = request.cookies.get(SESSION_COOKIE)?.value;
  const maxAttempts = 600;
  const rate = await consumeRateLimit(request, {
    scope: "auth:session",
    max: maxAttempts,
    windowMs: 60_000,
    identifier: signed ? `session:${signed}` : null,
  });
  if (!rate.allowed) {
    const response = NextResponse.json(
      { error: "rate_limited" },
      { status: 429 },
    );
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Pragma", "no-cache");
    applyRateLimitHeaders(response, maxAttempts, rate);
    return response;
  }

  const minTtlRaw = request.nextUrl.searchParams.get("min_ttl") ?? "60";
  const minTtlSeconds = Number.isFinite(Number(minTtlRaw))
    ? Math.max(0, Math.min(3600, Number(minTtlRaw)))
    : 60;

  const resolved = await resolveRequestSession(request, {
    minTtlSeconds,
    preserveCookiesOnRefreshFailure: true,
  });

  if (!resolved.ok) {
    return unauthorized(resolved.clearCookies);
  }

  const response = NextResponse.json(
    {
      user: {
        id: resolved.session.sub,
        email: resolved.session.email,
        role: resolved.session.role,
        organizationId: resolved.session.organizationId,
        siteId: resolved.session.siteId,
      },
    },
    { status: 200 },
  );
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  applyRateLimitHeaders(response, maxAttempts, rate);

  if (resolved.cookieUpdate) {
    setAuthCookies(response, request, resolved.cookieUpdate);
  }

  return response;
}
