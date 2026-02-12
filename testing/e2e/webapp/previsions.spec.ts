import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

test.describe("Previsions page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("displays page title and subtitle", async ({ page }) => {
    await page.goto("/previsions");
    await expect(
      page.getByRole("heading", {
        name: "Anticipation des tensions",
        level: 1,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Projetez les besoins, identifiez les causes et priorisez les alertes avant rupture.",
      ),
    ).toBeVisible();
  });

  test("displays dimension switch buttons", async ({ page }) => {
    await page.goto("/previsions");
    await expect(page.getByRole("button", { name: "Humaine" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Marchandise" }),
    ).toBeVisible();
  });

  test("displays 14-day forecast section", async ({ page }) => {
    await page.goto("/previsions");
    await expect(
      page.getByText("Prevision de couverture sur 7 jours"),
    ).toBeVisible();
    await expect(page.getByText("Capacite humaine")).toBeVisible();
  });

  test("switching to marchandise updates section label", async ({ page }) => {
    await page.goto("/previsions");
    await page.getByRole("button", { name: "Marchandise" }).click();
    await expect(page.getByText("Capacite marchandise")).toBeVisible();
  });

  test("displays decomposition and feature sections", async ({ page }) => {
    await page.goto("/previsions");
    await expect(page.getByLabel("Decomposition SARIMAX")).toBeVisible();
    await expect(page.getByLabel("Facteurs explicatifs")).toBeVisible();
  });

  test("displays top alerts cards with severity and CTA", async ({ page }) => {
    await page.goto("/previsions");
    const alertsSection = page.getByLabel("Alertes prioritaires");
    await expect(alertsSection).toBeVisible();
    await expect(alertsSection.getByText("Lyon-Sat").first()).toBeVisible();
    await expect(alertsSection.getByText("Critique")).toBeVisible();
    await expect(
      alertsSection.getByRole("link", { name: "Voir les solutions" }).first(),
    ).toHaveAttribute("href", "/actions");
  });

  test("shows empty-state when alerts API returns empty", async ({ page }) => {
    await page.route("**/api/v1/live/coverage-alerts*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [],
          timestamp: "2026-02-07T12:00:00Z",
        }),
      }),
    );

    await page.goto("/previsions");
    await expect(
      page.getByText("Aucune alerte active — vos sites sont couverts"),
    ).toBeVisible();
  });
});
