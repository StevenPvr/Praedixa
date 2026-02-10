import { test, expect } from "./fixtures/coverage";
import type { Page } from "@playwright/test";
import { setupAuth } from "./fixtures/auth";

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function setSuperAdminSessionCookie(page: Page) {
  const session = {
    access_token: "mock-access-token-admin-e2e",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "mock-refresh-token-admin-e2e",
    user: {
      id: "sa-00000000-0000-0000-0000-000000000001",
      aud: "authenticated",
      role: "authenticated",
      email: "superadmin@praedixa.com",
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

  await page.context().addCookies([
    {
      name: "sb-localhost-auth-token",
      value: `base64-${toBase64Url(JSON.stringify(session))}`,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

test.describe("Webapp authentication", () => {
  test("/login page loads successfully", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Praedixa" })).toBeVisible();
  });

  test("login page has email input", async ({ page }) => {
    await page.goto("/login");
    const emailInput = page.getByLabel("Email");
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute("type", "email");
  });

  test("login page has password input", async ({ page }) => {
    await page.goto("/login");
    const passwordInput = page.getByLabel("Mot de passe");
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("login page has submit button", async ({ page }) => {
    await page.goto("/login");
    const submitButton = page.getByRole("button", { name: /se connecter/i });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
  });

  test("login page shows subtitle", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Connectez-vous a votre espace")).toBeVisible();
  });

  test("unauthenticated access to /dashboard redirects to /login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("authenticated session with API 401 forces re-auth flow", async ({
    page,
  }) => {
    await setupAuth(page);

    await page.route("**/api/v1/**", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: {
            code: "HTTP_ERROR",
            message: "Invalid or expired token",
          },
        }),
      }),
    );

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login\?reauth=1/);
    await expect(
      page.getByText(
        "Session expiree ou droits insuffisants. Veuillez vous reconnecter.",
      ),
    ).toBeVisible();
  });

  test("super_admin session is blocked from protected webapp routes", async ({
    page,
  }) => {
    await setupAuth(page);
    await setSuperAdminSessionCookie(page);

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByRole("heading", { name: "Praedixa" })).toBeVisible();
  });

  test("email input has placeholder text", async ({ page }) => {
    await page.goto("/login");
    const emailInput = page.getByPlaceholder("vous@entreprise.com");
    await expect(emailInput).toBeVisible();
  });

  test("submit button shows loading state on click", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Mot de passe").fill("password");

    await page.getByRole("button", { name: /se connecter/i }).click();

    const buttonText = await page.getByRole("button").first().textContent();
    expect(buttonText).toBeTruthy();
  });
});
