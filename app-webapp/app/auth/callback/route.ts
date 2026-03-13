import { type NextRequest, NextResponse } from "next/server";
import {
  LOGIN_NEXT_COOKIE,
  LOGIN_STATE_COOKIE,
  LOGIN_VERIFIER_COOKIE,
  buildSessionData,
  clearAuthCookies,
  exchangeCodeForTokens,
  getApiAccessTokenCompatibilityReason,
  getOidcEnv,
  getTokenExp,
  sanitizeNextPath,
  setAuthCookies,
  signSession,
  timingSafeEqual,
  userFromAccessToken,
} from "@/lib/auth/oidc";
import { resolveAuthAppOrigin } from "@/lib/auth/origin";
import { consumeRateLimit } from "@/lib/auth/rate-limit";

type RateLimitSnapshot = Awaited<ReturnType<typeof consumeRateLimit>>;

function noStoreRedirect(url: string | URL): NextResponse {
  const response = NextResponse.redirect(url.toString());
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function createOidcConfigErrorResponse(): NextResponse {
  const response = NextResponse.json(
    { error: "oidc_config_missing" },
    { status: 500 },
  );
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function clearLoginFlowCookies(response: NextResponse): void {
  response.cookies.delete(LOGIN_STATE_COOKIE);
  response.cookies.delete(LOGIN_VERIFIER_COOKIE);
  response.cookies.delete(LOGIN_NEXT_COOKIE);
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
  let appOrigin: string;
  try {
    appOrigin = resolveAuthAppOrigin(request);
  } catch {
    return createOidcConfigErrorResponse();
  }

  const maxAttempts = 30;
  const rate = await consumeRateLimit(request, {
    scope: "auth:callback",
    max: maxAttempts,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    const redirect = noStoreRedirect(`${appOrigin}/login?error=rate_limited`);
    applyRateLimitHeaders(redirect, maxAttempts, rate);
    clearAuthCookies(redirect);
    clearLoginFlowCookies(redirect);
    return redirect;
  }

  const code = request.nextUrl.searchParams.get("code");
  const returnedState = request.nextUrl.searchParams.get("state");

  const expectedState = request.cookies.get(LOGIN_STATE_COOKIE)?.value ?? "";
  const verifier = request.cookies.get(LOGIN_VERIFIER_COOKIE)?.value ?? "";
  const nextCookie =
    request.cookies.get(LOGIN_NEXT_COOKIE)?.value ?? "/dashboard";
  const safeNext = sanitizeNextPath(nextCookie, "/dashboard");

  if (
    !code ||
    !returnedState ||
    !expectedState ||
    !timingSafeEqual(returnedState, expectedState) ||
    !verifier
  ) {
    const redirect = noStoreRedirect(
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

    if (!tokenPayload?.access_token) {
      const redirect = noStoreRedirect(
        `${appOrigin}/login?error=auth_callback_failed`,
      );
      applyRateLimitHeaders(redirect, maxAttempts, rate);
      clearAuthCookies(redirect);
      clearLoginFlowCookies(redirect);
      return redirect;
    }

    const user = userFromAccessToken(tokenPayload.access_token, clientId);
    const exp = getTokenExp(tokenPayload.access_token);
    if (!user || !exp) {
      const redirect = noStoreRedirect(
        `${appOrigin}/login?error=auth_claims_invalid`,
      );
      applyRateLimitHeaders(redirect, maxAttempts, rate);
      clearAuthCookies(redirect);
      clearLoginFlowCookies(redirect);
      return redirect;
    }

    const tokenCompatibilityReason = getApiAccessTokenCompatibilityReason(
      tokenPayload.access_token,
      clientId,
    );
    if (tokenCompatibilityReason) {
      const redirect = noStoreRedirect(
        `${appOrigin}/login?error=auth_token_incompatible&token_reason=${encodeURIComponent(tokenCompatibilityReason)}`,
      );
      applyRateLimitHeaders(redirect, maxAttempts, rate);
      clearAuthCookies(redirect);
      clearLoginFlowCookies(redirect);
      return redirect;
    }

    // super_admin users must stay on admin app, not webapp.
    if (user.role === "super_admin") {
      const redirect = noStoreRedirect(`${appOrigin}/login?error=wrong_role`);
      applyRateLimitHeaders(redirect, maxAttempts, rate);
      clearAuthCookies(redirect);
      clearLoginFlowCookies(redirect);
      return redirect;
    }

    const sessionToken = await signSession(
      await buildSessionData(
        user,
        exp,
        tokenPayload.access_token,
        tokenPayload.refresh_token ?? null,
        tokenPayload.refresh_expires_in,
      ),
      sessionSecret,
    );

    const redirect = noStoreRedirect(`${appOrigin}${safeNext}`);
    setAuthCookies(redirect, request, {
      accessToken: tokenPayload.access_token,
      refreshToken: tokenPayload.refresh_token ?? null,
      sessionToken,
      accessTokenMaxAge: tokenPayload.expires_in ?? 900,
      refreshTokenMaxAge: tokenPayload.refresh_expires_in ?? 60 * 60 * 24 * 14,
    });
    clearLoginFlowCookies(redirect);
    applyRateLimitHeaders(redirect, maxAttempts, rate);

    return redirect;
  } catch {
    const redirect = noStoreRedirect(
      `${appOrigin}/login?error=auth_callback_failed`,
    );
    applyRateLimitHeaders(redirect, maxAttempts, rate);
    clearAuthCookies(redirect);
    clearLoginFlowCookies(redirect);
    return redirect;
  }
}
