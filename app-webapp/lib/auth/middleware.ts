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
import { isSuperAdmin } from "@/lib/auth/roles";

interface AuthState {
  session: Awaited<ReturnType<typeof verifySession>>;
  accessToken: string | null;
}

async function tryRefresh(
  request: NextRequest,
  response: NextResponse,
): Promise<AuthState> {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value ?? null;
  const signedSession = request.cookies.get(SESSION_COOKIE)?.value ?? null;

  let session = null;
  try {
    if (signedSession) {
      const { sessionSecret } = getOidcEnv();
      session = await verifySession(signedSession, sessionSecret);
    }
  } catch {
    session = null;
  }

  const hasUsableAccessToken =
    !!accessToken && !isTokenExpired(accessToken, 60) && !!session;
  if (hasUsableAccessToken) {
    return { session, accessToken };
  }

  if (!refreshToken) {
    return { session: null, accessToken: null };
  }

  try {
    const { issuerUrl, clientId, clientSecret, sessionSecret } = getOidcEnv();
    const refreshed = await refreshTokens({
      issuerUrl,
      clientId,
      clientSecret,
      refreshToken,
    });

    if (!refreshed?.access_token) {
      clearAuthCookies(response);
      return { session: null, accessToken: null };
    }

    const user = userFromAccessToken(refreshed.access_token, clientId);
    const accessTokenExp = getTokenExp(refreshed.access_token);
    if (!user || !accessTokenExp) {
      clearAuthCookies(response);
      return { session: null, accessToken: null };
    }

    const nextSession = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      siteId: user.siteId,
      accessTokenExp,
      issuedAt: Math.floor(Date.now() / 1000),
    };

    const sessionToken = await signSession(nextSession, sessionSecret);
    setAuthCookies(response, request, {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? refreshToken,
      sessionToken,
      accessTokenMaxAge: refreshed.expires_in ?? 900,
      refreshTokenMaxAge: refreshed.refresh_expires_in ?? 60 * 60 * 24 * 14,
    });

    return {
      session: nextSession,
      accessToken: refreshed.access_token,
    };
  } catch {
    clearAuthCookies(response);
    return { session: null, accessToken: null };
  }
}

function redirectTo(
  request: NextRequest,
  path: string,
  clearCookies = false,
): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.url));
  if (clearCookies) {
    clearAuthCookies(response);
  }
  return response;
}

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  const isLoginRoute = pathname === "/login";
  const isAuthRoute = pathname === "/auth" || pathname.startsWith("/auth/");

  if (isAuthRoute) {
    return response;
  }

  const authState = await tryRefresh(request, response);
  const userRole = authState.session?.role;

  if (!authState.session && !isLoginRoute) {
    return redirectTo(request, "/login", true);
  }

  if (authState.session && !isLoginRoute) {
    if (isSuperAdmin(userRole)) {
      return redirectTo(request, "/login", true);
    }
  }

  const isForcedReauth =
    pathname === "/login" && request.nextUrl.searchParams.get("reauth") === "1";

  if (
    authState.session &&
    isLoginRoute &&
    !isForcedReauth &&
    !isSuperAdmin(userRole)
  ) {
    return redirectTo(request, "/dashboard");
  }

  return response;
}
