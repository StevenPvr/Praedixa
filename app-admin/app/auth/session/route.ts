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

function canAccessAdminConsole(role: string | undefined): boolean {
  if (role === "super_admin") return true;
  return process.env.NODE_ENV !== "production" && role === "org_admin";
}

function unauthorized(_request: NextRequest): NextResponse {
  const response = NextResponse.json(
    { error: "unauthorized" },
    { status: 401 },
  );
  response.headers.set("Cache-Control", "no-store");
  clearAuthCookies(response);
  return response;
}

export async function GET(request: NextRequest) {
  const minTtlRaw = request.nextUrl.searchParams.get("min_ttl") ?? "60";
  const minTtlSeconds = Number.isFinite(Number(minTtlRaw))
    ? Math.max(0, Math.min(3600, Number(minTtlRaw)))
    : 60;

  const signed = request.cookies.get(SESSION_COOKIE)?.value;
  const accessTokenCookie = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshTokenCookie = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!signed) {
    return unauthorized(request);
  }

  try {
    const { issuerUrl, clientId, clientSecret, sessionSecret } = getOidcEnv();
    let session = await verifySession(signed, sessionSecret);
    if (!session) {
      return unauthorized(request);
    }

    let accessToken = accessTokenCookie ?? "";
    let refreshToken = refreshTokenCookie ?? null;

    const needsRefresh =
      !accessToken || isTokenExpired(accessToken, minTtlSeconds);
    if (needsRefresh) {
      if (!refreshToken) {
        return unauthorized(request);
      }

      const refreshed = await refreshTokens({
        issuerUrl,
        clientId,
        clientSecret,
        refreshToken,
      });

      if (!refreshed?.access_token) {
        return unauthorized(request);
      }

      const user = userFromAccessToken(refreshed.access_token, clientId);
      const exp = getTokenExp(refreshed.access_token);
      if (!user || !exp || !canAccessAdminConsole(user.role)) {
        return unauthorized(request);
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
      setAuthCookies(response, request, {
        accessToken,
        refreshToken,
        sessionToken,
        accessTokenMaxAge: refreshed.expires_in ?? 900,
        refreshTokenMaxAge: refreshed.refresh_expires_in ?? 60 * 60 * 24 * 14,
      });
      return response;
    }

    if (!canAccessAdminConsole(session.role)) {
      return unauthorized(request);
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
    return response;
  } catch {
    return unauthorized(request);
  }
}
