import { type NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  getOidcEnv,
  revokeOidcToken,
} from "@/lib/auth/oidc";
import { isSameOriginBrowserRequest } from "@/lib/security/same-origin";

export async function POST(request: NextRequest) {
  if (!isSameOriginBrowserRequest(request, { allowNavigate: true })) {
    const response = NextResponse.json({ error: "forbidden" }, { status: 403 });
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Pragma", "no-cache");
    return response;
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value ?? null;

  if (accessToken || refreshToken) {
    try {
      const { issuerUrl, clientId, clientSecret } = getOidcEnv();
      await Promise.allSettled([
        refreshToken
          ? revokeOidcToken({
              issuerUrl,
              clientId,
              clientSecret,
              token: refreshToken,
              tokenTypeHint: "refresh_token",
            })
          : Promise.resolve(false),
        accessToken
          ? revokeOidcToken({
              issuerUrl,
              clientId,
              clientSecret,
              token: accessToken,
              tokenTypeHint: "access_token",
            })
          : Promise.resolve(false),
      ]);
    } catch {
      // Best effort: local cookie clearing still terminates the browser session.
    }
  }

  const response = NextResponse.json({ success: true }, { status: 200 });
  clearAuthCookies(response);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}
