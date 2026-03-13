import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";

test.describe("Webapp authentication", () => {
  test("/login page loads successfully", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Connexion securisee" }),
    ).toBeVisible();
  });

  test("login page exposes OIDC CTA", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("button", { name: "Continuer vers la connexion" }),
    ).toBeVisible();
  });

  test("login page displays reauth banner when reauth=1", async ({ page }) => {
    await page.goto("/login?reauth=1");
    await expect(
      page.getByText(
        "Session expiree ou droits insuffisants. Veuillez vous reconnecter.",
      ),
    ).toBeVisible();
  });

  test("login page displays OIDC config error", async ({ page }) => {
    await page.goto("/login?error=oidc_config_missing");
    await expect(page.getByText(/Configuration OIDC invalide\./)).toBeVisible();
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
  });

  test("super_admin session is blocked from protected webapp routes", async ({
    page,
  }) => {
    await setupAuth(page, {
      role: "super_admin",
      email: "superadmin@praedixa.com",
      userId: "sa-00000000-0000-0000-0000-000000000001",
      organizationId: null,
      siteId: null,
    });

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(
      page.getByRole("heading", { name: "Connexion securisee" }),
    ).toBeVisible();
  });
});
