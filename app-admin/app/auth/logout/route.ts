import { type NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  getOidcEnv,
  resolveAuthAppOrigin,
  revokeTokens,
} from "@/lib/auth/oidc";
import {
  isSameOriginBrowserRequest,
  resolveExpectedOrigin,
} from "@/lib/security/browser-request";

function isTrustedLogoutRequest(request: NextRequest): boolean {
  return isSameOriginBrowserRequest(
    request,
    resolveExpectedOrigin(request, resolveAuthAppOrigin),
    { allowNavigate: true },
  );
}

function createNoStoreJsonResponse(body: unknown, status: number): NextResponse {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest) {
  if (!isTrustedLogoutRequest(request)) {
    return createNoStoreJsonResponse({ error: "csrf_failed" }, 403);
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value ?? null;

  try {
    const { issuerUrl, clientId, clientSecret } = getOidcEnv();
    await revokeTokens({
      issuerUrl,
      clientId,
      clientSecret,
      accessToken,
      refreshToken,
    });
  } catch {
    // Best effort: local cookies are still cleared below.
  }

  const response = createNoStoreJsonResponse({ success: true }, 200);
  clearAuthCookies(response);
  return response;
}
