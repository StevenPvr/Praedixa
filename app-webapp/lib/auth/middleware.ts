import { type NextRequest, NextResponse } from "next/server";
import {
  clearAuthCookies,
  setAuthCookies,
  type AuthSessionData,
} from "@/lib/auth/oidc";
import { resolveRequestSession } from "@/lib/auth/request-session";
import { resolveWebappRoutePolicy } from "@/lib/auth/route-policy";
import { isSuperAdmin } from "@/lib/auth/roles";

interface AuthState {
  clearCookies: boolean;
  session: AuthSessionData | null;
}

async function tryRefresh(
  request: NextRequest,
  response: NextResponse,
): Promise<AuthState> {
  const resolved = await resolveRequestSession(request, {
    minTtlSeconds: 60,
  });

  if (!resolved.ok) {
    if (resolved.clearCookies) {
      clearAuthCookies(response);
    }
    return {
      clearCookies: resolved.clearCookies,
      session: null,
    };
  }

  if (resolved.cookieUpdate) {
    setAuthCookies(response, request, resolved.cookieUpdate);
  }

  return {
    clearCookies: false,
    session: resolved.session,
  };
}

function redirectTo(
  request: NextRequest,
  path: string,
  clearCookies = false,
): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.url));
  if (clearCookies) {
    clearAuthCookies(response);
  }
  return response;
}

export async function updateSession(
  request: NextRequest,
  requestHeaders?: Headers,
) {
  const response = NextResponse.next(
    requestHeaders ? { request: { headers: requestHeaders } } : { request },
  );
  const pathname = request.nextUrl.pathname;
  const route = resolveWebappRoutePolicy(pathname);

  const isLoginRoute = route.kind === "login";
  const isAuthRoute = route.kind === "auth";
  const isApiRoute = route.kind === "api";
  const isKnownAppRoute = route.kind === "root" || route.kind === "app";

  if (isAuthRoute || isApiRoute) {
    return response;
  }

  const authState = await tryRefresh(request, response);
  const userRole = authState.session?.role;

  if (route.kind === "unknown") {
    if (!authState.session || isSuperAdmin(userRole)) {
      return redirectTo(request, "/login", true);
    }
    return redirectTo(request, "/dashboard");
  }

  if (!authState.session && isKnownAppRoute) {
    return redirectTo(request, "/login", true);
  }

  if (authState.session && isKnownAppRoute && isSuperAdmin(userRole)) {
    return redirectTo(request, "/login", true);
  }

  const isForcedReauth =
    pathname === "/login" && request.nextUrl.searchParams.get("reauth") === "1";

  if (
    authState.session &&
    isLoginRoute &&
    !isForcedReauth &&
    !isSuperAdmin(userRole)
  ) {
    return redirectTo(request, "/dashboard");
  }

  return response;
}
