import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import {
  mockCoverageAlerts,
  mockDecisionQueue,
  mockScenarios,
  mockOperationalDecisions,
} from "./fixtures/api-mocks";

test.describe("Actions decisions flow", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockCoverageAlerts(page);
    await mockDecisionQueue(page);
    await mockScenarios(page);
    await mockOperationalDecisions(page);
  });

  test("shows active alerts list and first alert details", async ({ page }) => {
    await page.goto("/actions");
    const selector = page.getByLabel("Selection de l'alerte");
    await expect(selector).toBeVisible();
    await expect(selector.getByText("Lyon-Sat").first()).toBeVisible();
    await expect(selector.getByText("Paris-CDG").first()).toBeVisible();
  });

  test("shows expected scenario option cards", async ({ page }) => {
    await page.goto("/actions");
    const section = page.getByLabel("Options d'optimisation");
    await expect(section).toBeVisible();
    await expect(section.getByText("Heures supplementaires")).toBeVisible();
    await expect(section.getByText("Interim")).toBeVisible();
    await expect(section.getByText("Reallocation intra-site")).toBeVisible();
  });

  test("shows recommendation and optimal badges", async ({ page }) => {
    await page.goto("/actions");
    const section = page.getByLabel("Options d'optimisation");
    await expect(section.getByText("Recommande")).toBeVisible();
    await expect(section.getByText("Pareto").first()).toBeVisible();
  });

  test("submitting with selected option keeps user on actions page", async ({
    page,
  }) => {
    await page.goto("/actions");
    await page.getByText("Interim").first().click();
    await page.getByRole("button", { name: "Valider cette solution" }).click();
    await expect(page).toHaveURL(/\/actions/);
  });

  test("shows empty state when no alerts are available", async ({ page }) => {
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
    await page.route("**/api/v1/**coverage-alerts/queue*", (route) =>
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

    await page.goto("/actions");
    await expect(page.getByText("Aucune alerte active")).toBeVisible();
    await expect(page.getByText("Tous vos sites sont couverts")).toBeVisible();
  });
});
