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
  sanitizeNextPath,
  secureCookie,
} from "@/lib/auth/oidc";
import { consumeRateLimit } from "@/lib/auth/rate-limit";

type RateLimitSnapshot = Awaited<ReturnType<typeof consumeRateLimit>>;

function noStoreRedirect(url: string | URL): NextResponse {
  const response = NextResponse.redirect(url.toString());
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
  if (!rate.allowed) {
    response.headers.set("Retry-After", String(rate.retryAfterSeconds));
  }
}

export async function GET(request: NextRequest) {
  const next = sanitizeNextPath(
    request.nextUrl.searchParams.get("next"),
    "/dashboard",
  );
  const maxAttempts = 20;
  const rate = await consumeRateLimit(request, {
    scope: "auth:login",
    max: maxAttempts,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    const fallbackUrl = new URL("/login", request.nextUrl.origin);
    fallbackUrl.searchParams.set("error", "rate_limited");
    fallbackUrl.searchParams.set("next", next);
    const response = noStoreRedirect(fallbackUrl.toString());
    applyRateLimitHeaders(response, maxAttempts, rate);
    return response;
  }

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
      `${request.nextUrl.origin}/auth/callback`,
    );
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", challenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    if (request.nextUrl.searchParams.get("prompt") === "login") {
      authUrl.searchParams.set("prompt", "login");
    }

    const response = noStoreRedirect(authUrl.toString());
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
    applyRateLimitHeaders(response, maxAttempts, rate);

    return response;
  } catch (error) {
    const fallbackUrl = new URL("/login", request.nextUrl.origin);
    fallbackUrl.searchParams.set(
      "error",
      isMissingOidcEnvError(error)
        ? "oidc_config_missing"
        : "oidc_provider_untrusted",
    );
    fallbackUrl.searchParams.set("next", next);
    const response = noStoreRedirect(fallbackUrl.toString());
    applyRateLimitHeaders(response, maxAttempts, rate);
    return response;
  }
}
