import { test, expect } from "./fixtures/coverage";

test.describe("Webapp navigation", () => {
  test("login page renders the application name", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Connexion securisee" }),
    ).toBeVisible();
  });

  test("login page OIDC action is interactive", async ({ page }) => {
    await page.route("**/auth/login**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: "ok",
      }),
    );

    await page.goto("/login");
    await page
      .getByRole("button", { name: "Continuer vers la connexion" })
      .click();
    await expect(page).toHaveURL(/\/auth\/login\?next=%2Fdashboard/);
  });

  test("login page uses OIDC-only flow", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("Client access")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continuer vers la connexion" }),
    ).toBeVisible();
    await expect(page.getByLabel(/Email/)).toHaveCount(0);
    await expect(page.getByLabel("Mot de passe")).toHaveCount(0);
  });

  test("direct navigation to protected routes without auth", async ({
    page,
  }) => {
    const protectedRoutes = [
      "/dashboard",
      "/donnees",
      "/previsions",
      "/actions",
      "/rapports",
      "/parametres",
      "/messages",
    ];

    for (const route of protectedRoutes) {
      await page.goto(route, {
        waitUntil: "domcontentloaded",
        timeout: 25_000,
      });
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    }
  });

  test("login page is responsive on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Connexion securisee" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continuer vers la connexion" }),
    ).toBeVisible();
    await expect(page.getByLabel(/Email/)).toHaveCount(0);
    await expect(page.getByLabel("Mot de passe")).toHaveCount(0);
  });
});
