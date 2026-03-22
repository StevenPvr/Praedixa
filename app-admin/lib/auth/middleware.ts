import { type NextRequest, NextResponse } from "next/server";
import { canAccessAdminConsole } from "@/lib/auth/permissions";
import {
  clearAuthCookies,
  setAuthCookies,
  type AuthSessionData,
} from "@/lib/auth/oidc";
import {
  resolveRequestSession,
  type ResolveRequestSessionResult,
} from "@/lib/auth/request-session";
import {
  canAccessPath,
  hasExplicitAdminPagePolicy,
  resolveAccessibleAdminPath,
} from "@/lib/auth/admin-route-policies";

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

function createPassThroughResponse(
  request: NextRequest,
  requestHeaders?: Headers,
): NextResponse {
  if (requestHeaders) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next({ request });
}

type MiddlewareRouteState = Readonly<{
  isApiRoute: boolean;
  isAuthRoute: boolean;
  isLoginRoute: boolean;
  isUnauthorizedRoute: boolean;
  pathname: string;
}>;

function resolveMiddlewareRouteState(
  request: NextRequest,
): MiddlewareRouteState {
  const pathname = request.nextUrl.pathname;

  return {
    isApiRoute: pathname.startsWith("/api/"),
    isAuthRoute: pathname.startsWith("/auth"),
    isLoginRoute: pathname.startsWith("/login"),
    isUnauthorizedRoute: pathname.startsWith("/unauthorized"),
    pathname,
  };
}

function shouldBypassMiddleware(routeState: MiddlewareRouteState): boolean {
  return (
    routeState.isApiRoute ||
    routeState.isAuthRoute ||
    routeState.isUnauthorizedRoute
  );
}

type SessionAccessState = Readonly<{
  canAccessCurrentPath: boolean;
  fallbackPath: string | null;
  hasPagePolicy: boolean;
  session: AuthSessionData | null;
  userRole: string | null;
}>;

function resolveSessionAccessState(
  pathname: string,
  resolved: ResolveRequestSessionResult,
): SessionAccessState {
  const session = resolved.ok ? resolved.session : null;
  const userRole = session?.role ?? null;
  const hasPagePolicy = hasExplicitAdminPagePolicy(pathname);
  const canAccessCurrentPath =
    session !== null && hasPagePolicy
      ? canAccessPath(pathname, session.permissions)
      : false;
  const fallbackPath =
    session !== null && pathname === "/"
      ? resolveAccessibleAdminPath(session.permissions, pathname)
      : null;

  return {
    canAccessCurrentPath,
    fallbackPath,
    hasPagePolicy,
    session,
    userRole,
  };
}

function shouldRedirectToLogin(args: {
  isLoginRoute: boolean;
  resolved: ResolveRequestSessionResult;
}): args is {
  isLoginRoute: boolean;
  resolved: { ok: false; clearCookies: boolean };
} {
  return args.isLoginRoute === false && args.resolved.ok === false;
}

function shouldRedirectToUnauthorizedForConsole(args: {
  isLoginRoute: boolean;
  session: SessionAccessState["session"];
  userRole: string | null;
}): boolean {
  return (
    args.session !== null &&
    args.isLoginRoute === false &&
    canAccessAdminConsole(args.userRole, args.session.permissions) === false
  );
}

function shouldForceReauth(args: {
  canAccessCurrentPath: boolean;
  hasPagePolicy: boolean;
  isLoginRoute: boolean;
  session: SessionAccessState["session"];
  userRole: string | null;
}): boolean {
  return (
    args.session !== null &&
    args.isLoginRoute === false &&
    args.userRole === "super_admin" &&
    args.hasPagePolicy &&
    args.canAccessCurrentPath === false
  );
}

function shouldRedirectToFallback(args: {
  canAccessCurrentPath: boolean;
  fallbackPath: string | null;
  isLoginRoute: boolean;
  pathname: string;
  session: SessionAccessState["session"];
}): args is {
  canAccessCurrentPath: boolean;
  fallbackPath: string;
  isLoginRoute: boolean;
  pathname: string;
  session: NonNullable<SessionAccessState["session"]>;
} {
  return (
    args.session !== null &&
    args.isLoginRoute === false &&
    args.pathname === "/" &&
    args.canAccessCurrentPath === false &&
    typeof args.fallbackPath === "string" &&
    args.fallbackPath !== args.pathname
  );
}

function shouldRedirectToUnauthorizedForPath(args: {
  canAccessCurrentPath: boolean;
  hasPagePolicy: boolean;
  isLoginRoute: boolean;
  session: SessionAccessState["session"];
}): boolean {
  return (
    args.session !== null &&
    args.isLoginRoute === false &&
    (args.hasPagePolicy === false || args.canAccessCurrentPath === false)
  );
}

function shouldRedirectAuthenticatedLogin(args: {
  isForcedReauth: boolean;
  isLoginRoute: boolean;
  session: SessionAccessState["session"];
  userRole: string | null;
}): args is {
  isForcedReauth: boolean;
  isLoginRoute: boolean;
  session: NonNullable<SessionAccessState["session"]>;
  userRole: string | null;
} {
  return (
    args.session !== null &&
    args.isLoginRoute &&
    args.isForcedReauth === false &&
    canAccessAdminConsole(args.userRole, args.session.permissions)
  );
}

export async function updateSession(
  request: NextRequest,
  requestHeaders?: Headers,
) {
  const response = createPassThroughResponse(request, requestHeaders);
  const routeState = resolveMiddlewareRouteState(request);

  if (shouldBypassMiddleware(routeState)) {
    return response;
  }

  const resolved = await resolveRequestSession(request, {
    minTtlSeconds: 60,
    preserveCookiesOnRefreshFailure: true,
  });

  if (resolved.ok && resolved.cookieUpdate) {
    setAuthCookies(response, request, resolved.cookieUpdate);
  }

  const accessState = resolveSessionAccessState(routeState.pathname, resolved);
  const loginRedirectArgs = {
    isLoginRoute: routeState.isLoginRoute,
    resolved,
  };

  if (shouldRedirectToLogin(loginRedirectArgs)) {
    return redirectTo(
      request,
      "/login",
      loginRedirectArgs.resolved.clearCookies,
    );
  }

  if (
    shouldRedirectToUnauthorizedForConsole({
      isLoginRoute: routeState.isLoginRoute,
      session: accessState.session,
      userRole: accessState.userRole,
    })
  ) {
    return redirectTo(request, "/unauthorized", true);
  }

  if (
    shouldForceReauth({
      canAccessCurrentPath: accessState.canAccessCurrentPath,
      hasPagePolicy: accessState.hasPagePolicy,
      isLoginRoute: routeState.isLoginRoute,
      session: accessState.session,
      userRole: accessState.userRole,
    })
  ) {
    return redirectTo(request, buildForcedReauthPath(request), true);
  }

  const fallbackRedirectArgs = {
    canAccessCurrentPath: accessState.canAccessCurrentPath,
    fallbackPath: accessState.fallbackPath,
    isLoginRoute: routeState.isLoginRoute,
    pathname: routeState.pathname,
    session: accessState.session,
  };

  if (shouldRedirectToFallback(fallbackRedirectArgs)) {
    return redirectTo(request, fallbackRedirectArgs.fallbackPath);
  }

  if (
    shouldRedirectToUnauthorizedForPath({
      canAccessCurrentPath: accessState.canAccessCurrentPath,
      hasPagePolicy: accessState.hasPagePolicy,
      isLoginRoute: routeState.isLoginRoute,
      session: accessState.session,
    })
  ) {
    return redirectTo(request, "/unauthorized");
  }

  const isForcedReauth =
    routeState.pathname === "/login" &&
    request.nextUrl.searchParams.get("reauth") === "1";
  const authenticatedLoginRedirectArgs = {
    isForcedReauth,
    isLoginRoute: routeState.isLoginRoute,
    session: accessState.session,
    userRole: accessState.userRole,
  };

  if (shouldRedirectAuthenticatedLogin(authenticatedLoginRedirectArgs)) {
    return redirectTo(
      request,
      resolveAccessibleAdminPath(
        authenticatedLoginRedirectArgs.session.permissions,
        "/",
      ) ?? "/unauthorized",
    );
  }

  return response;
}
