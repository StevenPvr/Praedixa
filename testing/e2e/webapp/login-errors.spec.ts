import { test, expect } from "./fixtures/coverage";

test.describe("Login page error handling", () => {
  test("displays reauth banner when reauth=1 query param is set", async ({
    page,
  }) => {
    await page.goto("/login?reauth=1");

    await expect(
      page.getByText(
        "Session expiree ou droits insuffisants. Veuillez vous reconnecter.",
      ),
    ).toBeVisible();
  });

  test("displays OIDC configuration error when provider config is missing", async ({
    page,
  }) => {
    await page.goto("/login?error=oidc_config_missing");

    await expect(page.getByText(/Configuration OIDC invalide\./)).toBeVisible();
  });

  test("displays provider trust error when OIDC provider is untrusted", async ({
    page,
  }) => {
    await page.goto("/login?error=oidc_provider_untrusted");

    await expect(
      page.getByText(
        "Le fournisseur OIDC est non fiable ou mal configure (TLS/certificat/endpoints). Contactez l'administrateur.",
      ),
    ).toBeVisible();
  });

  test("displays generic error message for unknown error code", async ({
    page,
  }) => {
    await page.goto("/login?error=upstream_failure");

    await expect(
      page.getByText("La connexion a echoue. Veuillez reessayer."),
    ).toBeVisible();
  });

  test("login page presents OIDC CTA and no legacy password fields", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("button", { name: "Continuer vers la connexion" }),
    ).toBeVisible();
    await expect(page.getByLabel(/Email/)).toHaveCount(0);
    await expect(page.getByLabel("Mot de passe")).toHaveCount(0);
  });

  test("login page subtitle is displayed", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByText(
        "Authentification geree par votre fournisseur d'identite entreprise.",
      ),
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

    await page.goto("/login?next=/actions");
    await page
      .getByRole("button", { name: "Continuer vers la connexion" })
      .click();

    await expect(page).toHaveURL(/\/auth\/login\?next=%2Factions/);
  });

  test("unsafe next path falls back to dashboard", async ({ page }) => {
    await page.route("**/auth/login**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: "ok",
      }),
    );

    await page.goto("/login?next=//malicious.example");
    await page
      .getByRole("button", { name: "Continuer vers la connexion" })
      .click();

    await expect(page).toHaveURL(/\/auth\/login\?next=%2Fdashboard/);
  });
});
