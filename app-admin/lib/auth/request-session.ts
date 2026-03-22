import type { NextRequest } from "next/server";
import { canAccessAdminConsole } from "@/lib/auth/permissions";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  SESSION_COOKIE,
  buildSessionData,
  doesSessionMatchAccessToken,
  doesSessionMatchRefreshToken,
  getOidcEnv,
  getTokenExp,
  isAccessTokenCompatible,
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
  minTtlSeconds?: number;
  preserveCookiesOnRefreshFailure?: boolean;
}

type SessionCookies = Readonly<{
  accessTokenCookie: string | null;
  refreshTokenCookie: string | null;
  signed: string | null;
}>;

type RefreshedSessionResult = Readonly<{
  accessToken: string;
  cookieUpdate: CookieUpdate;
  refreshToken: string | null;
  session: AuthSessionData;
}>;

function readSessionCookies(request: NextRequest): SessionCookies {
  return {
    accessTokenCookie: request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? null,
    refreshTokenCookie:
      request.cookies.get(REFRESH_TOKEN_COOKIE)?.value ?? null,
    signed: request.cookies.get(SESSION_COOKIE)?.value ?? null,
  };
}

function createSessionFailure(
  clearCookies: boolean,
): ResolveRequestSessionResult {
  return {
    ok: false,
    clearCookies,
  };
}

function canUseVerifiedSession(
  session: AuthSessionData | null,
): session is AuthSessionData {
  return (
    session !== null && canAccessAdminConsole(session.role, session.permissions)
  );
}

async function hasValidTokenBindings(args: {
  accessToken: string;
  refreshToken: string | null;
  session: AuthSessionData;
}): Promise<boolean> {
  const accessTokenValid =
    args.accessToken.length === 0 ||
    (await doesSessionMatchAccessToken(args.session, args.accessToken));

  if (accessTokenValid === false) {
    return false;
  }

  if (args.refreshToken === null || args.refreshToken.length === 0) {
    return true;
  }

  return doesSessionMatchRefreshToken(args.session, args.refreshToken);
}

async function refreshSessionTokens(args: {
  clientId: string;
  clientSecret: string;
  issuerUrl: string;
  refreshToken: string;
  sessionSecret: string;
}): Promise<RefreshedSessionResult | null> {
  const refreshed = await refreshTokens({
    issuerUrl: args.issuerUrl,
    clientId: args.clientId,
    clientSecret: args.clientSecret,
    refreshToken: args.refreshToken,
  });

  const refreshedAccessToken = refreshed?.access_token ?? null;
  if (
    typeof refreshedAccessToken !== "string" ||
    refreshedAccessToken.length === 0
  ) {
    return null;
  }

  if (
    isAccessTokenCompatible(refreshedAccessToken, {
      issuerUrl: args.issuerUrl,
      clientId: args.clientId,
    }) === false
  ) {
    return null;
  }

  const user = userFromAccessToken(refreshedAccessToken, args.clientId);
  const exp = getTokenExp(refreshedAccessToken);
  const hasValidUser =
    user !== null &&
    exp !== null &&
    canAccessAdminConsole(user.role, user.permissions);

  if (hasValidUser === false) {
    return null;
  }

  const refreshToken = refreshed?.refresh_token ?? args.refreshToken;
  const session = await buildSessionData(
    user,
    exp,
    refreshedAccessToken,
    refreshToken,
    refreshed?.refresh_expires_in,
  );

  return {
    accessToken: refreshedAccessToken,
    refreshToken,
    session,
    cookieUpdate: {
      accessToken: refreshedAccessToken,
      refreshToken,
      sessionToken: await signSession(session, args.sessionSecret),
      accessTokenMaxAge: refreshed?.expires_in ?? 900,
      refreshTokenMaxAge: refreshed?.refresh_expires_in ?? 60 * 60 * 24 * 14,
    },
  };
}

export async function resolveRequestSession(
  request: NextRequest,
  options: ResolveRequestSessionOptions = {},
): Promise<ResolveRequestSessionResult> {
  const minTtlSeconds = options.minTtlSeconds ?? 60;
  const preserveCookiesOnRefreshFailure =
    options.preserveCookiesOnRefreshFailure ?? false;

  const { signed, accessTokenCookie, refreshTokenCookie } =
    readSessionCookies(request);

  if (typeof signed !== "string" || signed.length === 0) {
    return createSessionFailure(
      Boolean(accessTokenCookie || refreshTokenCookie),
    );
  }

  try {
    const { issuerUrl, clientId, clientSecret, sessionSecret } = getOidcEnv();
    const verifiedSession = await verifySession(signed, sessionSecret);
    if (canUseVerifiedSession(verifiedSession) === false) {
      return createSessionFailure(true);
    }
    const activeSession = verifiedSession;

    let accessToken = accessTokenCookie ?? "";
    let refreshToken = refreshTokenCookie ?? null;

    const hasValidBindings = await hasValidTokenBindings({
      accessToken,
      refreshToken,
      session: activeSession,
    });
    if (hasValidBindings === false) {
      return createSessionFailure(true);
    }

    const needsRefresh =
      accessToken.length === 0 || isTokenExpired(accessToken, minTtlSeconds);
    if (needsRefresh) {
      if (typeof refreshToken !== "string" || refreshToken.length === 0) {
        return createSessionFailure(true);
      }

      const refreshedSession = await refreshSessionTokens({
        issuerUrl,
        clientId,
        clientSecret,
        refreshToken,
        sessionSecret,
      });
      if (refreshedSession === null) {
        return createSessionFailure(!preserveCookiesOnRefreshFailure);
      }

      return {
        ok: true,
        session: refreshedSession.session,
        accessToken: refreshedSession.accessToken,
        refreshToken: refreshedSession.refreshToken,
        cookieUpdate: refreshedSession.cookieUpdate,
      };
    }

    if (
      accessToken.length === 0 ||
      !canAccessAdminConsole(activeSession.role, activeSession.permissions)
    ) {
      return createSessionFailure(true);
    }

    return {
      ok: true,
      session: activeSession,
      accessToken,
      refreshToken,
      cookieUpdate: null,
    };
  } catch {
    return createSessionFailure(!preserveCookiesOnRefreshFailure);
  }
}
