import { type NextRequest, NextResponse } from "next/server";
import { canAccessAdminConsole } from "@/lib/auth/permissions";
import { clearAuthCookies, setAuthCookies } from "@/lib/auth/oidc";
import { resolveRequestSession } from "@/lib/auth/request-session";
import {
  canAccessPath,
  hasExplicitAdminPagePolicy,
} from "@/lib/auth/route-access";

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

function buildForcedReauthPath(request: NextRequest): string {
  const loginUrl = new URL("/login", request.url);
  const nextSearch = request.nextUrl.search ?? "";
  const nextPath = `${request.nextUrl.pathname}${nextSearch}`;
  loginUrl.searchParams.set("reauth", "1");
  loginUrl.searchParams.set("next", nextPath);
  return `${loginUrl.pathname}${loginUrl.search}`;
}

export async function updateSession(
  request: NextRequest,
  requestHeaders?: Headers,
) {
  const response = requestHeaders
    ? NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    : NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  const isApiRoute = pathname.startsWith("/api/");
  const isLoginRoute = pathname.startsWith("/login");
  const isAuthRoute = pathname.startsWith("/auth");
  const isUnauthorizedRoute = pathname.startsWith("/unauthorized");

  if (isApiRoute || isAuthRoute || isUnauthorizedRoute) {
    return response;
  }

  const resolved = await resolveRequestSession(request, {
    minTtlSeconds: 60,
    preserveCookiesOnRefreshFailure: true,
  });

  if (resolved.ok && resolved.cookieUpdate) {
    setAuthCookies(response, request, resolved.cookieUpdate);
  }

  const session = resolved.ok ? resolved.session : null;
  const userRole = session?.role;
  const hasPagePolicy = hasExplicitAdminPagePolicy(pathname);
  const canAccessCurrentPath =
    session != null && hasPagePolicy
      ? canAccessPath(pathname, session.permissions)
      : false;

  if (!resolved.ok && !isLoginRoute) {
    return redirectTo(request, "/login", resolved.clearCookies);
  }

  if (
    session &&
    !isLoginRoute &&
    !canAccessAdminConsole(userRole, session.permissions)
  ) {
    return redirectTo(request, "/unauthorized", true);
  }

  if (
    session &&
    !isLoginRoute &&
    userRole === "super_admin" &&
    hasPagePolicy &&
    !canAccessCurrentPath
  ) {
    return redirectTo(request, buildForcedReauthPath(request), true);
  }

  if (
    session &&
    !isLoginRoute &&
    (!hasPagePolicy || !canAccessCurrentPath)
  ) {
    return redirectTo(request, "/unauthorized");
  }

  const isForcedReauth =
    pathname === "/login" && request.nextUrl.searchParams.get("reauth") === "1";

  if (
    session &&
    isLoginRoute &&
    !isForcedReauth &&
    canAccessAdminConsole(userRole, session.permissions)
  ) {
    return redirectTo(request, "/");
  }

  return response;
}
