import type { NextRequest } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  SESSION_COOKIE,
  buildSessionData,
  doesSessionMatchAccessToken,
  doesSessionMatchRefreshToken,
  getApiAccessTokenCompatibilityReason,
  getOidcEnv,
  getTokenExp,
  isTokenExpired,
  refreshTokens,
  signSession,
  userFromAccessToken,
  verifySession,
  type AuthSessionData,
} from "@/lib/auth/oidc";

interface CookieUpdate {
  accessToken: string;
  refreshToken: string | null;
  sessionToken: string;
  accessTokenMaxAge: number;
  refreshTokenMaxAge: number;
}

export type ResolveRequestSessionResult =
  | {
      ok: true;
      session: AuthSessionData;
      accessToken: string;
      refreshToken: string | null;
      cookieUpdate: CookieUpdate | null;
    }
  | {
      ok: false;
      clearCookies: boolean;
    };

interface ResolveRequestSessionOptions {
  allowSuperAdmin?: boolean;
  minTtlSeconds?: number;
  preserveCookiesOnRefreshFailure?: boolean;
}

function shouldClearDanglingAuthCookies(input: {
  signed: string | null;
  accessToken: string | null;
  refreshToken: string | null;
}): boolean {
  return Boolean(input.signed || input.accessToken || input.refreshToken);
}

export async function resolveRequestSession(
  request: NextRequest,
  options: ResolveRequestSessionOptions = {},
): Promise<ResolveRequestSessionResult> {
  const allowSuperAdmin = options.allowSuperAdmin ?? false;
  const minTtlSeconds = options.minTtlSeconds ?? 60;
  const preserveCookiesOnRefreshFailure =
    options.preserveCookiesOnRefreshFailure ?? false;

  const signed = request.cookies.get(SESSION_COOKIE)?.value ?? null;
  const accessTokenCookie =
    request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  const refreshTokenCookie =
    request.cookies.get(REFRESH_TOKEN_COOKIE)?.value ?? null;

  if (!signed) {
    return {
      ok: false,
      clearCookies: shouldClearDanglingAuthCookies({
        signed,
        accessToken: accessTokenCookie,
        refreshToken: refreshTokenCookie,
      }),
    };
  }

  let issuerUrl: string;
  let clientId: string;
  let clientSecret: string;
  let sessionSecret: string;
  try {
    ({ issuerUrl, clientId, clientSecret, sessionSecret } = getOidcEnv());
  } catch {
    return {
      ok: false,
      clearCookies: false,
    };
  }

  let session: AuthSessionData | null;
  try {
    session = await verifySession(signed, sessionSecret);
  } catch {
    session = null;
  }
  if (!session) {
    return { ok: false, clearCookies: true };
  }

  let accessToken = accessTokenCookie ?? "";
  let refreshToken = refreshTokenCookie ?? null;

  if (
    accessToken &&
    !(await doesSessionMatchAccessToken(session, accessToken))
  ) {
    return { ok: false, clearCookies: true };
  }

  if (
    refreshToken &&
    !(await doesSessionMatchRefreshToken(session, refreshToken))
  ) {
    return { ok: false, clearCookies: true };
  }

  if (
    accessToken &&
    getApiAccessTokenCompatibilityReason(accessToken, clientId)
  ) {
    return { ok: false, clearCookies: true };
  }

  const needsRefresh =
    !accessToken || isTokenExpired(accessToken, minTtlSeconds);

  if (needsRefresh) {
    if (!refreshToken) {
      return { ok: false, clearCookies: true };
    }

    let refreshed: Awaited<ReturnType<typeof refreshTokens>>;
    try {
      refreshed = await refreshTokens({
        issuerUrl,
        clientId,
        clientSecret,
        refreshToken,
      });
    } catch {
      return {
        ok: false,
        clearCookies: !preserveCookiesOnRefreshFailure,
      };
    }

    if (!refreshed?.access_token) {
      return {
        ok: false,
        clearCookies: !preserveCookiesOnRefreshFailure,
      };
    }

    const user = userFromAccessToken(refreshed.access_token, clientId);
    const exp = getTokenExp(refreshed.access_token);
    const tokenCompatibilityReason = getApiAccessTokenCompatibilityReason(
      refreshed.access_token,
      clientId,
    );
    if (!user || !exp || tokenCompatibilityReason) {
      return { ok: false, clearCookies: true };
    }

    if (user.role === "super_admin" && !allowSuperAdmin) {
      return { ok: false, clearCookies: true };
    }

    accessToken = refreshed.access_token;
    refreshToken = refreshed.refresh_token ?? refreshToken;

    try {
      session = await buildSessionData(
        user,
        exp,
        accessToken,
        refreshToken,
        refreshed.refresh_expires_in,
      );

      return {
        ok: true,
        session,
        accessToken,
        refreshToken,
        cookieUpdate: {
          accessToken,
          refreshToken,
          sessionToken: await signSession(session, sessionSecret),
          accessTokenMaxAge: refreshed.expires_in ?? 900,
          refreshTokenMaxAge: refreshed.refresh_expires_in ?? 60 * 60 * 24 * 14,
        },
      };
    } catch {
      return {
        ok: false,
        clearCookies: false,
      };
    }
  }

  if (session.role === "super_admin" && !allowSuperAdmin) {
    return { ok: false, clearCookies: true };
  }

  if (!accessToken) {
    return { ok: false, clearCookies: true };
  }

  return {
    ok: true,
    session,
    accessToken,
    refreshToken,
    cookieUpdate: null,
  };
}
