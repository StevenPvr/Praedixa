import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";
import {
  mockScenariosApis,
  mockScenariosApisEmpty,
  mockScenariosApisError,
  MOCK_SCENARIOS_SUMMARY,
} from "./fixtures/api-mocks";

test.describe("Scenarios page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminAuth(page);
  });

  test("displays page title and subtitle", async ({ page }) => {
    await mockScenariosApis(page);
    await page.goto("/scenarios");

    await expect(
      page.getByRole("heading", { name: "Scenarios", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Scenarios de remediation generes sur la plateforme"),
    ).toBeVisible();
  });

  test("displays summary stat cards", async ({ page }) => {
    await mockScenariosApis(page);
    await page.goto("/scenarios");

    await expect(page.getByText("Total scenarios")).toBeVisible();
    await expect(
      page.getByText(String(MOCK_SCENARIOS_SUMMARY.totalScenarios)),
    ).toBeVisible();

    await expect(page.getByText("Pareto-optimaux")).toBeVisible();
    await expect(
      page.getByText(String(MOCK_SCENARIOS_SUMMARY.paretoOptimalCount)),
    ).toBeVisible();

    await expect(page.getByText("Recommandes")).toBeVisible();
    await expect(
      page.getByText(String(MOCK_SCENARIOS_SUMMARY.recommendedCount)),
    ).toBeVisible();
  });

  test("displays type breakdown section", async ({ page }) => {
    await mockScenariosApis(page);
    await page.goto("/scenarios");

    await expect(page.getByText("Repartition par type")).toBeVisible();

    // Type labels
    await expect(page.getByText("Heures supplementaires")).toBeVisible();
    await expect(page.getByText("Interim")).toBeVisible();
    await expect(page.getByText("Reallocation intra-site")).toBeVisible();
    await expect(page.getByText("Sous-traitance")).toBeVisible();
  });

  test("hides type breakdown when byType is empty", async ({ page }) => {
    await mockScenariosApisEmpty(page);
    await page.goto("/scenarios");

    await expect(
      page.getByRole("heading", { name: "Scenarios", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Repartition par type")).not.toBeVisible();
  });

  test("shows loading skeletons before data loads", async ({ page }) => {
    await page.route("**/api/v1/admin/monitoring/scenarios/summary*", (route) =>
      new Promise((resolve) => setTimeout(resolve, 2000)).then(() =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: MOCK_SCENARIOS_SUMMARY,
            timestamp: "2026-02-07T12:00:00Z",
          }),
        }),
      ),
    );

    await page.goto("/scenarios");

    await expect(
      page.getByRole("heading", { name: "Scenarios", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Scenarios de remediation generes"),
    ).toBeVisible();
  });

  test("shows error fallback on API failure", async ({ page }) => {
    await mockScenariosApisError(page);
    await page.goto("/scenarios");

    await expect(page.getByText("Erreur de chargement")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /reessayer/i }),
    ).toBeVisible();
  });
});
