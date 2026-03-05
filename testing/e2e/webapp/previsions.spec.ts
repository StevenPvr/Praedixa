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
      page.getByRole("heading", { name: "Previsions 7 jours", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Projection de risque et capacite previsionnelle pour orienter les actions.",
      ),
    ).toBeVisible();
  });

  test("displays forecast summary cards", async ({ page }) => {
    await page.goto("/previsions");

    await expect(page.getByText("Alertes ouvertes").first()).toBeVisible();
    await expect(page.getByText("Alertes critiques").first()).toBeVisible();
    await expect(page.getByText("Horizon couvert").first()).toBeVisible();
    await expect(page.getByText("7 jours").first()).toBeVisible();
  });

  test("displays capacity table and actions link", async ({ page }) => {
    await page.goto("/previsions");

    await expect(
      page.getByRole("heading", { name: "Capacite previsionnelle" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Aller dans Actions" }),
    ).toHaveAttribute("href", "/actions");

    const hasDateColumn = await page
      .getByRole("columnheader", { name: "Date" })
      .first()
      .isVisible()
      .catch(() => false);

    if (hasDateColumn) {
      await expect(page.getByRole("columnheader", { name: "Date" }).first()).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Demande" }).first()).toBeVisible();
    } else {
      await expect(page.getByText("Aucune prevision disponible.")).toBeVisible();
    }
  });

  test("displays priority alerts section", async ({ page }) => {
    await page.goto("/previsions");

    await expect(
      page.getByRole("heading", { name: "Alertes prioritaires" }),
    ).toBeVisible();
    await expect(page.getByText("Lyon-Sat").first()).toBeVisible();
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
    await expect(page.getByText("Aucune alerte active.")).toBeVisible();
  });
});
