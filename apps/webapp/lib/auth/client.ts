"use client";

import { createBrowserClient } from "@supabase/ssr";

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
