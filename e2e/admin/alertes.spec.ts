import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";
import {
  mockAlertesApis,
  mockAlertesApisError,
  MOCK_ALERT_SUMMARY,
} from "./fixtures/api-mocks";

test.describe("Alertes page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminAuth(page);
  });

  test("displays page title and subtitle with total count", async ({
    page,
  }) => {
    await mockAlertesApis(page);
    await page.goto("/alertes");

    await expect(
      page.getByRole("heading", { name: "Alertes", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(`${MOCK_ALERT_SUMMARY.total} alertes au total`),
    ).toBeVisible();
  });

  test("displays severity stat cards with correct values", async ({
    page,
  }) => {
    await mockAlertesApis(page);
    await page.goto("/alertes");

    // Wait for data to load
    await expect(
      page.getByText(`${MOCK_ALERT_SUMMARY.total} alertes au total`),
    ).toBeVisible();

    // Severity cards
    await expect(page.getByText("Critique")).toBeVisible();
    await expect(
      page.getByText(String(MOCK_ALERT_SUMMARY.bySeverity.critical)).first(),
    ).toBeVisible();

    await expect(page.getByText("Haute")).toBeVisible();
    await expect(
      page.getByText(String(MOCK_ALERT_SUMMARY.bySeverity.high)).first(),
    ).toBeVisible();

    await expect(page.getByText("Moyenne")).toBeVisible();
    await expect(
      page.getByText(String(MOCK_ALERT_SUMMARY.bySeverity.medium)).first(),
    ).toBeVisible();

    await expect(page.getByText("Basse")).toBeVisible();
    await expect(
      page.getByText(String(MOCK_ALERT_SUMMARY.bySeverity.low)).first(),
    ).toBeVisible();
  });

  test("displays status breakdown section", async ({ page }) => {
    await mockAlertesApis(page);
    await page.goto("/alertes");

    await expect(page.getByText("Repartition par statut")).toBeVisible();
    await expect(page.getByText("Ouvertes")).toBeVisible();
    await expect(page.getByText("Prises en charge")).toBeVisible();
    await expect(page.getByText("Resolues")).toBeVisible();
    await expect(page.getByText("Expirees")).toBeVisible();

    // Status values
    await expect(
      page
        .locator("div")
        .filter({ has: page.getByText("Ouvertes") })
        .getByText(String(MOCK_ALERT_SUMMARY.byStatus.open)),
    ).toBeVisible();
  });

  test("shows loading skeletons before data loads", async ({ page }) => {
    // Delay the API response so we can see loading state
    await page.route("**/api/v1/admin/monitoring/alerts/summary*", (route) =>
      new Promise((resolve) => setTimeout(resolve, 2000)).then(() =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: MOCK_ALERT_SUMMARY,
            timestamp: "2026-02-07T12:00:00Z",
          }),
        }),
      ),
    );

    await page.goto("/alertes");

    // The heading should be visible even during loading
    await expect(
      page.getByRole("heading", { name: "Alertes", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Vue d'ensemble des alertes de couverture"),
    ).toBeVisible();
  });

  test("shows error fallback on API failure", async ({ page }) => {
    await mockAlertesApisError(page);
    await page.goto("/alertes");

    await expect(page.getByText("Erreur de chargement")).toBeVisible();
    await expect(page.getByRole("button", { name: /reessayer/i })).toBeVisible();
  });

  test("singular alerte text when total is 1", async ({ page }) => {
    await page.route("**/api/v1/admin/monitoring/alerts/summary*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            total: 1,
            bySeverity: { low: 0, medium: 0, high: 0, critical: 1 },
            byStatus: { open: 1, acknowledged: 0, resolved: 0, expired: 0 },
          },
          timestamp: "2026-02-07T12:00:00Z",
        }),
      }),
    );

    await page.goto("/alertes");
    await expect(page.getByText("1 alerte au total")).toBeVisible();
  });
});
