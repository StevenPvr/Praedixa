import { type NextRequest, NextResponse } from "next/server";
import {
  LOGIN_NEXT_COOKIE,
  LOGIN_STATE_COOKIE,
  LOGIN_VERIFIER_COOKIE,
  createPkceChallenge,
  createRandomToken,
  getOidcEnv,
  getTrustedOidcEndpoints,
  isMissingOidcEnvError,
  resolveAuthAppOrigin,
  sanitizeNextPath,
  secureCookie,
} from "@/lib/auth/oidc";

export async function GET(request: NextRequest) {
  const next = sanitizeNextPath(request.nextUrl.searchParams.get("next"), "/");
  const appOrigin = resolveAuthAppOrigin(request);

  try {
    const { issuerUrl, clientId, scope } = getOidcEnv();
    const { authorizationEndpoint } = await getTrustedOidcEndpoints(issuerUrl);
    const state = createRandomToken(32);
    const verifier = createRandomToken(64);
    const challenge = await createPkceChallenge(verifier);

    const authUrl = new URL(authorizationEndpoint);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set(
      "redirect_uri",
      `${appOrigin}/auth/callback`,
    );
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", challenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    if (request.nextUrl.searchParams.get("prompt") === "login") {
      authUrl.searchParams.set("prompt", "login");
    }

    const response = NextResponse.redirect(authUrl.toString());
    const secure = secureCookie(request);

    response.cookies.set(LOGIN_STATE_COOKIE, state, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    response.cookies.set(LOGIN_VERIFIER_COOKIE, verifier, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    response.cookies.set(LOGIN_NEXT_COOKIE, next, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });

    return response;
  } catch (error) {
    const fallbackUrl = new URL("/login", appOrigin);
    fallbackUrl.searchParams.set(
      "error",
      isMissingOidcEnvError(error)
        ? "oidc_config_missing"
        : "oidc_provider_untrusted",
    );
    fallbackUrl.searchParams.set("next", next);
    return NextResponse.redirect(fallbackUrl.toString());
  }
}
