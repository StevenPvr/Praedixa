import { type NextRequest, NextResponse } from "next/server";
import { canAccessAdminConsole } from "@/lib/auth/permissions";
import {
  LOGIN_NEXT_COOKIE,
  LOGIN_STATE_COOKIE,
  LOGIN_VERIFIER_COOKIE,
  buildSessionData,
  clearAuthCookies,
  exchangeCodeForTokens,
  getOidcEnv,
  isAccessTokenCompatible,
  getTokenExp,
  resolveAuthAppOrigin,
  sanitizeNextPath,
  setAuthCookies,
  signSession,
  timingSafeEqual,
  userFromAccessToken,
} from "@/lib/auth/oidc";

function clearLoginFlowCookies(response: NextResponse): void {
  response.cookies.delete(LOGIN_STATE_COOKIE);
  response.cookies.delete(LOGIN_VERIFIER_COOKIE);
  response.cookies.delete(LOGIN_NEXT_COOKIE);
}

export async function GET(request: NextRequest) {
  let appOrigin: string;
  try {
    appOrigin = resolveAuthAppOrigin(request);
  } catch {
    const redirect = NextResponse.redirect(
      `${request.nextUrl.origin}/login?error=oidc_config_missing`,
    );
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
    !code ||
    !returnedState ||
    !expectedState ||
    !timingSafeEqual(returnedState, expectedState) ||
    !verifier
  ) {
    const redirect = NextResponse.redirect(
      `${appOrigin}/login?error=auth_callback_failed`,
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
      redirectUri: `${appOrigin}/auth/callback`,
      codeVerifier: verifier,
    });

    if (!tokenPayload?.access_token) {
      const redirect = NextResponse.redirect(
        `${appOrigin}/login?error=auth_callback_failed`,
      );
      clearAuthCookies(redirect);
      clearLoginFlowCookies(redirect);
      return redirect;
    }

    const accessToken = tokenPayload.access_token;
    if (!isAccessTokenCompatible(accessToken, { issuerUrl, clientId })) {
      const redirect = NextResponse.redirect(
        `${appOrigin}/login?error=auth_callback_failed`,
      );
      clearAuthCookies(redirect);
      clearLoginFlowCookies(redirect);
      return redirect;
    }

    const user = userFromAccessToken(accessToken, clientId);
    const exp = getTokenExp(accessToken);
    if (!user || !exp || !canAccessAdminConsole(user.role, user.permissions)) {
      const redirect = NextResponse.redirect(
        `${appOrigin}/unauthorized`,
      );
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

    const redirect = NextResponse.redirect(`${appOrigin}${safeNext}`);
    setAuthCookies(redirect, request, {
      accessToken,
      refreshToken: tokenPayload.refresh_token ?? null,
      sessionToken,
      accessTokenMaxAge: tokenPayload.expires_in ?? 900,
      refreshTokenMaxAge: tokenPayload.refresh_expires_in ?? 60 * 60 * 24 * 14,
    });
    clearLoginFlowCookies(redirect);

    return redirect;
  } catch {
    const redirect = NextResponse.redirect(
      `${appOrigin}/login?error=auth_callback_failed`,
    );
    clearAuthCookies(redirect);
    clearLoginFlowCookies(redirect);
    return redirect;
  }
}
