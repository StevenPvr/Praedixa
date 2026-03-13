import { test, expect } from "./fixtures/coverage";

test.describe("Login page", () => {
  test("displays OIDC access page", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("Console Admin Praedixa")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continuer vers la connexion" }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveCount(0);
    await expect(page.getByLabel("Mot de passe")).toHaveCount(0);
  });

  test("shows reauth banner when reauth=1 query param", async ({ page }) => {
    await page.goto("/login?reauth=1");

    await expect(
      page.getByText(/session expiree ou droits insuffisants/i),
    ).toBeVisible();
  });

  test("does not show reauth banner normally", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByText(/session expiree ou droits insuffisants/i),
    ).toHaveCount(0);
  });

  test("shows explicit OIDC config error", async ({ page }) => {
    await page.goto("/login?error=oidc_config_missing");

    await expect(
      page.getByText(/Configuration OIDC manquante en local/i),
    ).toBeVisible();
  });

  test("shows explicit OIDC provider trust error", async ({ page }) => {
    await page.goto("/login?error=oidc_provider_untrusted");

    await expect(
      page.getByText(/Le fournisseur OIDC est non fiable ou mal configure/i),
    ).toBeVisible();
  });

  test("shows generic login error for unknown code", async ({ page }) => {
    await page.goto("/login?error=auth_callback_failed");

    await expect(
      page.getByText(/La connexion a echoue\. Veuillez reessayer\./i),
    ).toBeVisible();
  });

  test("login CTA preserves safe next path", async ({ page }) => {
    await page.route("**/auth/login**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: "ok",
      }),
    );

    await page.goto("/login?next=/clients");
    await page
      .getByRole("button", { name: "Continuer vers la connexion" })
      .click();

    await expect(page).toHaveURL(/\/auth\/login\?next=%2Fclients/);
  });

  test("unsafe next path is sanitized and reauth adds prompt", async ({
    page,
  }) => {
    await page.route("**/auth/login**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: "ok",
      }),
    );

    await page.goto("/login?next=//evil.com&reauth=1");
    await page
      .getByRole("button", { name: "Continuer vers la connexion" })
      .click();

    await expect(page).toHaveURL(/\/auth\/login\?next=%2F&prompt=login/);
  });
});
