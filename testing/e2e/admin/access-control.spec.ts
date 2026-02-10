import { test, expect } from "./fixtures/coverage";
import type { Page } from "@playwright/test";

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

async function setupAdminAuthWithoutSuperAdmin(page: Page) {
  const session = {
    access_token: "mock-access-token-user-role-e2e",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "mock-refresh-token-user-role-e2e",
    user: {
      id: "user-00000000-0000-0000-0000-000000000001",
      aud: "authenticated",
      role: "authenticated",
      email: "admin@praedixa.com",
      email_confirmed_at: "2026-01-01T00:00:00Z",
      app_metadata: {
        provider: "email",
        providers: ["email"],
        role: "admin",
      },
      user_metadata: {},
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  };

  await page.route("**/auth/v1/user*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(session.user),
    }),
  );

  await page.route("**/auth/v1/token*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(session),
    }),
  );

  await page.route("**/rest/v1/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    }),
  );

  const cookieName = getSupabaseStorageKey();
  const cookieValue = `base64-${toBase64Url(JSON.stringify(session))}`;
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

test.describe("Admin access control", () => {
  test("authenticated non-super-admin is redirected to unauthorized page", async ({
    page,
  }) => {
    await setupAdminAuthWithoutSuperAdmin(page);

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/unauthorized$/);
    await expect(
      page.getByRole("heading", { name: "Acces non autorise", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Se reconnecter" }),
    ).toHaveAttribute("href", "/login?reauth=1");
  });
});
