import type { Page } from "@playwright/test";

// ─────────────────────────────────────────────────
// Mock user data
// ─────────────────────────────────────────────────

export const MOCK_USER = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  email: "admin@praedixa-demo.com",
  orgId: "org-00000000-0000-0000-0000-000000000001",
  role: "admin",
} as const;

// ─────────────────────────────────────────────────
// Supabase session payload (mimics GoTrue v2 response)
// ─────────────────────────────────────────────────

const MOCK_SESSION = {
  access_token: "mock-access-token-e2e-testing",
  token_type: "bearer",
  expires_in: 43_200,
  expires_at: Math.floor(Date.now() / 1000) + 43_200,
  refresh_token: "mock-refresh-token-e2e",
  user: {
    id: MOCK_USER.id,
    aud: "authenticated",
    role: "authenticated",
    email: MOCK_USER.email,
    email_confirmed_at: "2026-01-01T00:00:00Z",
    app_metadata: {
      provider: "email",
      providers: ["email"],
    },
    user_metadata: {
      org_id: MOCK_USER.orgId,
      role: MOCK_USER.role,
    },
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
};

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function getSupabaseStorageKey(): string {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost";
    const hostPrefix = new URL(supabaseUrl).hostname.split(".")[0];
    return `sb-${hostPrefix}-auth-token`;
  } catch {
    return "sb-localhost-auth-token";
  }
}

// ─────────────────────────────────────────────────
// Setup auth: intercept Supabase + set cookies
// ─────────────────────────────────────────────────

/**
 * Intercepts Supabase auth endpoints and injects auth cookies so the
 * Next.js SSR middleware (`lib/auth/middleware.ts`) treats the session
 * as valid.
 *
 * Must be called BEFORE navigating to any protected page.
 */
export async function setupAuth(page: Page): Promise<void> {
  // 1. Intercept Supabase auth API — getUser() used by middleware
  await page.route("**/auth/v1/user*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_SESSION.user),
    }),
  );

  // 2. Intercept Supabase token refresh
  await page.route("**/auth/v1/token*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_SESSION),
    }),
  );

  // 3. Intercept Supabase getSession (browser client)
  await page.route("**/rest/v1/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    }),
  );

  // 4. Set Supabase auth cookie so SSR middleware accepts the session.
  //    @supabase/ssr defaults to "base64url" cookie encoding with a
  //    "base64-" prefix, so the value must match that format exactly.
  const cookieName = getSupabaseStorageKey();
  const cookieValue = `base64-${toBase64Url(JSON.stringify(MOCK_SESSION))}`;

  await page.context().addCookies([
    {
      name: cookieName,
      value: cookieValue,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}
