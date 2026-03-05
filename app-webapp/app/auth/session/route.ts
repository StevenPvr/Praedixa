import { type NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  SESSION_COOKIE,
  clearAuthCookies,
  getOidcEnv,
  getTokenExp,
  isTokenExpired,
  refreshTokens,
  setAuthCookies,
  signSession,
  userFromAccessToken,
  verifySession,
} from "@/lib/auth/oidc";
import { consumeRateLimit } from "@/lib/auth/rate-limit";

type RateLimitSnapshot = Awaited<ReturnType<typeof consumeRateLimit>>;

function unauthorized(clearCookies = true): NextResponse {
  const response = NextResponse.json(
    { error: "unauthorized" },
    { status: 401 },
  );
  response.headers.set("Cache-Control", "no-store");
  if (clearCookies) {
    clearAuthCookies(response);
  }
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
    applyRateLimitHeaders(response, maxAttempts, rate);
    return response;
  }

  const minTtlRaw = request.nextUrl.searchParams.get("min_ttl") ?? "60";
  const minTtlSeconds = Number.isFinite(Number(minTtlRaw))
    ? Math.max(0, Math.min(3600, Number(minTtlRaw)))
    : 60;

  const accessTokenCookie = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshTokenCookie = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!signed) {
    return unauthorized();
  }

  try {
    const { issuerUrl, clientId, clientSecret, sessionSecret } = getOidcEnv();
    let session = await verifySession(signed, sessionSecret);
    if (!session) {
      return unauthorized();
    }

    let accessToken = accessTokenCookie ?? "";
    let refreshToken = refreshTokenCookie ?? null;

    const needsRefresh =
      !accessToken || isTokenExpired(accessToken, minTtlSeconds);
    if (needsRefresh) {
      if (!refreshToken) {
        return unauthorized();
      }

      const refreshed = await refreshTokens({
        issuerUrl,
        clientId,
        clientSecret,
        refreshToken,
      });

      if (!refreshed?.access_token) {
        // Avoid clearing cookies on transient refresh races/errors.
        return unauthorized(false);
      }

      const user = userFromAccessToken(refreshed.access_token, clientId);
      const exp = getTokenExp(refreshed.access_token);
      if (!user || !exp || user.role === "super_admin") {
        return unauthorized();
      }

      accessToken = refreshed.access_token;
      refreshToken = refreshed.refresh_token ?? refreshToken;
      session = {
        sub: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        siteId: user.siteId,
        accessTokenExp: exp,
        issuedAt: Math.floor(Date.now() / 1000),
      };

      const sessionToken = await signSession(session, sessionSecret);
      const response = NextResponse.json(
        {
          accessToken,
          user: {
            id: session.sub,
            email: session.email,
            role: session.role,
            organizationId: session.organizationId,
            siteId: session.siteId,
          },
        },
        { status: 200 },
      );
      response.headers.set("Cache-Control", "no-store");
      applyRateLimitHeaders(response, maxAttempts, rate);
      setAuthCookies(response, request, {
        accessToken,
        refreshToken,
        sessionToken,
        accessTokenMaxAge: refreshed.expires_in ?? 900,
        refreshTokenMaxAge: refreshed.refresh_expires_in ?? 60 * 60 * 24 * 14,
      });
      return response;
    }

    if (session.role === "super_admin") {
      return unauthorized();
    }

    const response = NextResponse.json(
      {
        accessToken,
        user: {
          id: session.sub,
          email: session.email,
          role: session.role,
          organizationId: session.organizationId,
          siteId: session.siteId,
        },
      },
      { status: 200 },
    );
    response.headers.set("Cache-Control", "no-store");
    applyRateLimitHeaders(response, maxAttempts, rate);
    return response;
  } catch {
    // Unexpected failures on /auth/session should not forcibly clear cookies.
    return unauthorized(false);
  }
}
