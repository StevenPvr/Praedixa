"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useState, useEffect } from "react";

/**
 * Singleton Supabase browser client.
 *
 * Security notes:
 * - Uses NEXT_PUBLIC_ env vars which are safe to expose to the browser
 *   (anon key has row-level security enforced by Supabase).
 * - Singleton pattern avoids multiple GoTrue instances competing for
 *   auth state, which can cause token refresh races.
 */

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  return client;
}

interface GetValidAccessTokenOptions {
  minTtlSeconds?: number;
}

export async function getValidAccessToken(
  options: GetValidAccessTokenOptions = {},
): Promise<string | null> {
  const { minTtlSeconds = 60 } = options;
  const supabase = getSupabaseBrowserClient();
  const now = Math.floor(Date.now() / 1000);

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    let nextSession = session;
    const isExpiringSoon =
      !!nextSession?.expires_at &&
      nextSession.expires_at - now <= minTtlSeconds;

    if (!nextSession || isExpiringSoon) {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        return null;
      }
      nextSession = data.session;
    }

    return nextSession?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function clearAuthSession(): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  try {
    // Local sign-out clears browser auth state/cookies without requiring
    // a network round-trip.
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Best effort: caller still redirects to login.
  }
}

interface CurrentUser {
  id: string;
  email: string;
  role: string;
}

export function useCurrentUser(): CurrentUser | null {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? "",
          role: (session.user.app_metadata?.role as string) ?? "viewer",
        });
      }
    });
  }, []);

  return user;
}
