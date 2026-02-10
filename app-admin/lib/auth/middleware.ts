import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Admin middleware session refresh and route protection.
 *
 * Security notes:
 * - Same as webapp middleware PLUS super_admin role check.
 * - Uses getUser() (server-validated) instead of getSession() (client-cached).
 * - Unauthenticated users are redirected to /login.
 * - Authenticated non-super_admin users are redirected to /unauthorized.
 * - /login?reauth=1 remains accessible even for authenticated users.
 * - The role is read from app_metadata.role (set by Supabase admin API),
 *   which cannot be modified by the user themselves.
 */

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session — validates token with Supabase auth server.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
    /* v8 ignore next 2 -- Supabase unreachable — fall through as unauthenticated */
  } catch {}

  const isLoginRoute = request.nextUrl.pathname.startsWith("/login");
  const isAuthRoute = request.nextUrl.pathname.startsWith("/auth");
  const isUnauthorizedRoute =
    request.nextUrl.pathname.startsWith("/unauthorized");

  // Allow public routes without auth
  if (isUnauthorizedRoute) {
    return response;
  }

  // Redirect unauthenticated users to login (except auth routes)
  if (!user && !isLoginRoute && !isAuthRoute) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Check super_admin role for authenticated users on protected routes
  if (user && !isLoginRoute && !isAuthRoute) {
    const role = user.app_metadata?.role;
    if (role !== "super_admin") {
      const unauthorizedUrl = new URL("/unauthorized", request.url);
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  const isForcedReauth =
    request.nextUrl.pathname === "/login" &&
    request.nextUrl.searchParams.get("reauth") === "1";

  // Redirect authenticated super_admin users away from login page
  if (user && isLoginRoute && !isForcedReauth) {
    const role = user.app_metadata?.role;
    if (role === "super_admin") {
      const homeUrl = new URL("/", request.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  return response;
}
