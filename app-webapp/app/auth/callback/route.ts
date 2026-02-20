import { type NextRequest, NextResponse } from "next/server";
import {
  LOGIN_NEXT_COOKIE,
  LOGIN_STATE_COOKIE,
  LOGIN_VERIFIER_COOKIE,
  clearAuthCookies,
  exchangeCodeForTokens,
  getOidcEnv,
  getTokenExp,
  sanitizeNextPath,
  setAuthCookies,
  signSession,
  userFromAccessToken,
} from "@/lib/auth/oidc";

function clearLoginFlowCookies(response: NextResponse): void {
  response.cookies.delete(LOGIN_STATE_COOKIE);
  response.cookies.delete(LOGIN_VERIFIER_COOKIE);
  response.cookies.delete(LOGIN_NEXT_COOKIE);
}

export async function GET(request: NextRequest) {
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
    returnedState !== expectedState ||
    !verifier
  ) {
    const redirect = NextResponse.redirect(
      `${request.nextUrl.origin}/login?error=auth_callback_failed`,
    );
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
      redirectUri: `${request.nextUrl.origin}/auth/callback`,
      codeVerifier: verifier,
    });

    if (!tokenPayload?.access_token) {
      const redirect = NextResponse.redirect(
        `${request.nextUrl.origin}/login?error=auth_callback_failed`,
      );
      clearAuthCookies(redirect);
      clearLoginFlowCookies(redirect);
      return redirect;
    }

    const user = userFromAccessToken(tokenPayload.access_token, clientId);
    const exp = getTokenExp(tokenPayload.access_token);
    if (!user || !exp) {
      const redirect = NextResponse.redirect(
        `${request.nextUrl.origin}/login?error=auth_claims_invalid`,
      );
      clearAuthCookies(redirect);
      clearLoginFlowCookies(redirect);
      return redirect;
    }

    // super_admin users must stay on admin app, not webapp.
    if (user.role === "super_admin") {
      const redirect = NextResponse.redirect(
        `${request.nextUrl.origin}/login?error=wrong_role`,
      );
      clearAuthCookies(redirect);
      clearLoginFlowCookies(redirect);
      return redirect;
    }

    const sessionToken = await signSession(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        siteId: user.siteId,
        accessTokenExp: exp,
        issuedAt: Math.floor(Date.now() / 1000),
      },
      sessionSecret,
    );

    const redirect = NextResponse.redirect(
      `${request.nextUrl.origin}${safeNext}`,
    );
    setAuthCookies(redirect, request, {
      accessToken: tokenPayload.access_token,
      refreshToken: tokenPayload.refresh_token ?? null,
      sessionToken,
      accessTokenMaxAge: tokenPayload.expires_in ?? 900,
      refreshTokenMaxAge: tokenPayload.refresh_expires_in ?? 60 * 60 * 24 * 14,
    });
    clearLoginFlowCookies(redirect);

    return redirect;
  } catch {
    const redirect = NextResponse.redirect(
      `${request.nextUrl.origin}/login?error=auth_callback_failed`,
    );
    clearAuthCookies(redirect);
    clearLoginFlowCookies(redirect);
    return redirect;
  }
}
