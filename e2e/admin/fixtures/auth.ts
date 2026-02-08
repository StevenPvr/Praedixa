import type { Page } from "@playwright/test";

// ─────────────────────────────────────────────────
// Mock super_admin user data
// ─────────────────────────────────────────────────

export const MOCK_ADMIN_USER = {
  id: "sa-00000000-0000-0000-0000-000000000001",
  email: "superadmin@praedixa.com",
  role: "super_admin",
} as const;

// ─────────────────────────────────────────────────
// Supabase session payload (mimics GoTrue v2 response)
// ─────────────────────────────────────────────────

const MOCK_SESSION = {
  access_token: "mock-access-token-admin-e2e",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: "mock-refresh-token-admin-e2e",
  user: {
    id: MOCK_ADMIN_USER.id,
    aud: "authenticated",
    role: "authenticated",
    email: MOCK_ADMIN_USER.email,
    email_confirmed_at: "2026-01-01T00:00:00Z",
    app_metadata: {
      provider: "email",
      providers: ["email"],
      role: "super_admin",
    },
    user_metadata: {},
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
 * admin Next.js middleware treats the session as a valid super_admin.
 *
 * Key difference from webapp auth: app_metadata.role = "super_admin"
 * (checked by admin middleware line 74).
 *
 * Must be called BEFORE navigating to any protected admin page.
 */
export async function setupAdminAuth(page: Page): Promise<void> {
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

  // 3. Intercept Supabase REST (unused in admin but prevents 404s)
  await page.route("**/rest/v1/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    }),
  );

  // 4. Set Supabase auth cookie (base64url encoding with "base64-" prefix)
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
