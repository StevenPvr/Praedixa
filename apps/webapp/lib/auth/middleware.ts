import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Middleware session refresh and route protection.
 *
 * Security notes:
 * - Runs on every matched request to refresh the auth token before it expires.
 *   This prevents users from being silently logged out mid-session.
 * - Uses getUser() (server-validated) instead of getSession() (client-cached)
 *   to ensure we never trust a stale or tampered session cookie.
 * - Unauthenticated users are redirected to /login (except for /login and
 *   /auth/* routes which must remain accessible for the auth flow).
 * - Authenticated users on /login are redirected to /dashboard to prevent
 *   confusion and potential session fixation via re-login.
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
  // Wrapped in try/catch: if Supabase is unreachable (network error, cold start,
  // misconfigured keys), treat the user as unauthenticated instead of crashing
  // with a 500 (which Safari aggressively caches).
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
    /* v8 ignore next 2 -- Supabase unreachable — fall through as unauthenticated */
  } catch {}

  // Redirect unauthenticated users to login (except auth routes)
  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth")
  ) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login page
  if (user && request.nextUrl.pathname === "/login") {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}
