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
import { consumeRateLimit } from "@/lib/security/rate-limit";

const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 8;
const LOGIN_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

function resolveFallbackOrigin(request: NextRequest): string {
  try {
    return resolveAuthAppOrigin(request);
  } catch {
    return request.nextUrl.origin;
  }
}

function createNoStoreRedirect(url: string | URL): NextResponse {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function GET(request: NextRequest) {
  const next = sanitizeNextPath(request.nextUrl.searchParams.get("next"), "/");
  const fallbackUrl = new URL("/login", resolveFallbackOrigin(request));
  const rateLimit = await consumeRateLimit(request, {
    scope: "auth-login",
    max: LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    fallbackUrl.searchParams.set("error", "rate_limited");
    fallbackUrl.searchParams.set("next", next);
    process.emitWarning(
      `admin auth login rate limited (${rateLimit.retryAfterSeconds}s)`,
    );
    const response = createNoStoreRedirect(fallbackUrl.toString());
    response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    return response;
  }

  try {
    const appOrigin = resolveAuthAppOrigin(request);
    const { issuerUrl, clientId, scope } = getOidcEnv();
    const { authorizationEndpoint } = await getTrustedOidcEndpoints(issuerUrl);
    const state = createRandomToken(32);
    const verifier = createRandomToken(64);
    const challenge = await createPkceChallenge(verifier);

    const authUrl = new URL(authorizationEndpoint);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("redirect_uri", `${appOrigin}/auth/callback`);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", challenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    if (request.nextUrl.searchParams.get("prompt") === "login") {
      authUrl.searchParams.set("prompt", "login");
    }

    const response = createNoStoreRedirect(authUrl.toString());
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
    fallbackUrl.searchParams.set(
      "error",
      isMissingOidcEnvError(error)
        ? "oidc_config_missing"
        : "oidc_provider_untrusted",
    );
    fallbackUrl.searchParams.set("next", next);
    return createNoStoreRedirect(fallbackUrl.toString());
  }
}
