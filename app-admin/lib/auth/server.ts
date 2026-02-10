import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase server client for Server Components and Route Handlers.
 *
 * Security notes:
 * - Cookie-based auth: tokens are stored in HttpOnly cookies managed by
 *   @supabase/ssr, not in localStorage (immune to XSS token theft).
 * - setAll is wrapped in try/catch because Server Components have
 *   read-only cookie access — writes silently fail there but succeed
 *   in Route Handlers and Server Actions.
 * - getUser() is preferred over getSession() for auth checks because
 *   getUser() always hits the Supabase auth server to validate the token,
 *   while getSession() may return a cached (potentially expired) session.
 */

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Ignore errors in Server Components (read-only cookie access)
          }
        },
      },
    },
  );
}

export async function getUser() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getSession() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}
