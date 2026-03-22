import { type NextRequest, NextResponse } from "next/server";
import { resolveAccessibleAdminPath } from "@/lib/auth/admin-route-policies";
import { canAccessAdminConsole } from "@/lib/auth/permissions";
import {
  LOGIN_NEXT_COOKIE,
  LOGIN_STATE_COOKIE,
  LOGIN_VERIFIER_COOKIE,
  buildSessionData,
  clearAuthCookies,
  exchangeCodeForTokens,
  getOidcEnv,
  hasRequiredAdminMfa,
  isAccessTokenCompatible,
  getTokenExp,
  resolveAuthAppOrigin,
  sanitizeNextPath,
  setAuthCookies,
  signSession,
  timingSafeEqual,
  userFromAccessToken,
} from "@/lib/auth/oidc";
import { consumeRateLimit } from "@/lib/security/rate-limit";

type RateLimitSnapshot = Awaited<ReturnType<typeof consumeRateLimit>>;

function clearLoginFlowCookies(response: NextResponse): void {
  response.cookies.delete(LOGIN_STATE_COOKIE);
  response.cookies.delete(LOGIN_VERIFIER_COOKIE);
  response.cookies.delete(LOGIN_NEXT_COOKIE);
}

function createNoStoreRedirect(url: string | URL): NextResponse {
  const response = NextResponse.redirect(url.toString());
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function createNoStoreJsonResponse(
  body: unknown,
  status: number,
): NextResponse {
  const response = NextResponse.json(body, { status });
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
  if (rate.allowed === false) {
    response.headers.set("Retry-After", String(rate.retryAfterSeconds));
  }
}

function hasValidCallbackState(args: {
  code: string | null;
  returnedState: string | null;
  expectedState: string;
  verifier: string;
}): boolean {
  return (
    typeof args.code === "string" &&
    args.code.length > 0 &&
    typeof args.returnedState === "string" &&
    args.returnedState.length > 0 &&
    args.expectedState.length > 0 &&
    args.verifier.length > 0 &&
    timingSafeEqual(args.returnedState, args.expectedState)
  );
}

export async function GET(request: NextRequest) {
  const maxAttempts = 30;
  const rate = await consumeRateLimit(request, {
    scope: "auth:callback",
    max: maxAttempts,
    windowMs: 60_000,
  });

  let appOrigin: string;
  try {
    appOrigin = resolveAuthAppOrigin(request);
  } catch {
    const response = createNoStoreJsonResponse(
      { error: "oidc_config_missing" },
      500,
    );
    applyRateLimitHeaders(response, maxAttempts, rate);
    clearAuthCookies(response);
    clearLoginFlowCookies(response);
    return response;
  }

  if (rate.allowed === false) {
    const redirect = createNoStoreRedirect(
      `${appOrigin}/login?error=rate_limited`,
    );
    applyRateLimitHeaders(redirect, maxAttempts, rate);
    clearAuthCookies(redirect);
    clearLoginFlowCookies(redirect);
    return redirect;
  }
  const code = request.nextUrl.searchParams.get("code");
  const returnedState = request.nextUrl.searchParams.get("state");

  const expectedState = request.cookies.get(LOGIN_STATE_COOKIE)?.value ?? "";
  const verifier = request.cookies.get(LOGIN_VERIFIER_COOKIE)?.value ?? "";
  const nextCookie = request.cookies.get(LOGIN_NEXT_COOKIE)?.value ?? "/";
  const safeNext = sanitizeNextPath(nextCookie, "/");

  if (
    hasValidCallbackState({
      code,
      returnedState,
      expectedState,
      verifier,
    }) === false
  ) {
    const redirect = createNoStoreRedirect(
      `${appOrigin}/login?error=auth_callback_failed`,
    );
    applyRateLimitHeaders(redirect, maxAttempts, rate);
    clearAuthCookies(redirect);
    clearLoginFlowCookies(redirect);
    return redirect;
  }

  if (typeof code !== "string" || code.length === 0) {
    const redirect = createNoStoreRedirect(
      `${appOrigin}/login?error=auth_callback_failed`,
    );
    applyRateLimitHeaders(redirect, maxAttempts, rate);
    clearAuthCookies(redirect);
    clearLoginFlowCookies(redirect);
    return redirect;
  }

  try {
    const { issuerUrl, clientId, clientSecret, sessionSecret } = getOidcEnv();
    const tokenPayload = await exchangeCodeForTokens({
      issuerUrl,
      clientId,
      clientSecret,
      code,
      redirectUri: `${appOrigin}/auth/callback`,
      codeVerifier: verifier,
    });

    if (tokenPayload === null) {
      const redirect = createNoStoreRedirect(
        `${appOrigin}/login?error=auth_callback_failed`,
      );
      applyRateLimitHeaders(redirect, maxAttempts, rate);
      clearAuthCookies(redirect);
      clearLoginFlowCookies(redirect);
      return redirect;
    }

    const accessToken = tokenPayload.access_token ?? null;
    if (typeof accessToken !== "string" || accessToken.length === 0) {
      const redirect = createNoStoreRedirect(
        `${appOrigin}/login?error=auth_callback_failed`,
      );
      applyRateLimitHeaders(redirect, maxAttempts, rate);
      clearAuthCookies(redirect);
      clearLoginFlowCookies(redirect);
      return redirect;
    }

    if (!isAccessTokenCompatible(accessToken, { issuerUrl, clientId })) {
      const redirect = createNoStoreRedirect(
        `${appOrigin}/login?error=auth_callback_failed`,
      );
      applyRateLimitHeaders(redirect, maxAttempts, rate);
      clearAuthCookies(redirect);
      clearLoginFlowCookies(redirect);
      return redirect;
    }

    if (!hasRequiredAdminMfa(accessToken)) {
      const redirect = createNoStoreRedirect(
        `${appOrigin}/login?error=admin_mfa_required`,
      );
      applyRateLimitHeaders(redirect, maxAttempts, rate);
      clearAuthCookies(redirect);
      clearLoginFlowCookies(redirect);
      return redirect;
    }

    const user = userFromAccessToken(accessToken, clientId);
    const exp = getTokenExp(accessToken);
    const hasAdminConsoleAccess =
      user !== null &&
      exp !== null &&
      canAccessAdminConsole(user.role, user.permissions);

    if (hasAdminConsoleAccess === false) {
      const redirect = createNoStoreRedirect(`${appOrigin}/unauthorized`);
      applyRateLimitHeaders(redirect, maxAttempts, rate);
      clearAuthCookies(redirect);
      clearLoginFlowCookies(redirect);
      return redirect;
    }

    const sessionToken = await signSession(
      await buildSessionData(
        user,
        exp,
        accessToken,
        tokenPayload.refresh_token ?? null,
        tokenPayload.refresh_expires_in,
      ),
      sessionSecret,
    );

    const nextPath =
      resolveAccessibleAdminPath(user.permissions, safeNext) ?? "/unauthorized";
    const redirect = createNoStoreRedirect(`${appOrigin}${nextPath}`);
    setAuthCookies(redirect, request, {
      accessToken,
      refreshToken: tokenPayload.refresh_token ?? null,
      sessionToken,
      accessTokenMaxAge: tokenPayload.expires_in ?? 900,
      refreshTokenMaxAge: tokenPayload.refresh_expires_in ?? 60 * 60 * 24 * 14,
    });
    clearLoginFlowCookies(redirect);
    applyRateLimitHeaders(redirect, maxAttempts, rate);

    return redirect;
  } catch {
    const redirect = createNoStoreRedirect(
      `${appOrigin}/login?error=auth_callback_failed`,
    );
    applyRateLimitHeaders(redirect, maxAttempts, rate);
    clearAuthCookies(redirect);
    clearLoginFlowCookies(redirect);
    return redirect;
  }
}
