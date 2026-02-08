import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockCoverageAlerts } from "./fixtures/api-mocks";

test.describe("Previsions page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockCoverageAlerts(page);
  });

  test("displays page title and subtitle", async ({ page }) => {
    await page.goto("/previsions");
    await expect(
      page.getByRole("heading", { name: "Previsions", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText("Heatmap de couverture et alertes par horizon"),
    ).toBeVisible();
  });

  test("displays TabBar with J+3, J+7, J+14 horizon tabs", async ({ page }) => {
    await page.goto("/previsions");

    await expect(page.getByText("J+3")).toBeVisible();
    await expect(page.getByText("J+7")).toBeVisible();
    await expect(page.getByText("J+14")).toBeVisible();
  });

  test("J+7 tab is active by default", async ({ page }) => {
    await page.goto("/previsions");

    // The default horizon is "j7"; the TabBar renders J+7 as the active tab
    // Only j7 alerts should appear in the table by default
    // Mock has 3 alerts with horizon "j7": alert1, alert2, alert5
    const alertsSection = page.getByLabel("Alertes de couverture");
    await expect(alertsSection).toBeVisible();

    // alert1 (Lyon-Sat, j7), alert2 (Paris-CDG, j7), alert5 (Paris-CDG, j7) should be visible
    await expect(alertsSection.getByText("Lyon-Sat").first()).toBeVisible();
    await expect(alertsSection.getByText("Paris-CDG").first()).toBeVisible();
  });

  test("displays site filter SelectDropdown", async ({ page }) => {
    await page.goto("/previsions");

    // SelectDropdown — value defaults to "all" which shows "Tous les sites",
    // not the placeholder. Check for the combobox (select) element instead.
    const siteFilter = page.locator("select").last();
    await expect(siteFilter).toBeVisible();
    // The default selected option text should be "Tous les sites"
    await expect(siteFilter).toHaveValue("all");
  });

  test("displays heatmap section", async ({ page }) => {
    await page.goto("/previsions");

    const heatmapSection = page.getByLabel("Heatmap de couverture");
    await expect(heatmapSection).toBeVisible();
    await expect(heatmapSection.getByText("Couverture par site")).toBeVisible();
  });

  test("displays alerts table section with column headers", async ({
    page,
  }) => {
    await page.goto("/previsions");

    const alertsSection = page.getByLabel("Alertes de couverture");
    await expect(alertsSection).toBeVisible();

    // Column headers
    await expect(alertsSection.getByText("Site")).toBeVisible();
    await expect(alertsSection.getByText("Date")).toBeVisible();
    await expect(alertsSection.getByText("Shift")).toBeVisible();
    await expect(alertsSection.getByText("Severite")).toBeVisible();
    await expect(alertsSection.getByText("P(rupture)")).toBeVisible();
    await expect(alertsSection.getByText("Gap (h)")).toBeVisible();
  });

  test("alert rows show severity badges", async ({ page }) => {
    await page.goto("/previsions");

    const alertsSection = page.getByLabel("Alertes de couverture");
    await expect(alertsSection).toBeVisible();

    // j7 alerts include critical, high, and medium
    await expect(alertsSection.getByText("critical")).toBeVisible();
    await expect(alertsSection.getByText("high")).toBeVisible();
    await expect(alertsSection.getByText("medium").first()).toBeVisible();
  });

  test("alert rows show P(rupture) as percentage", async ({ page }) => {
    await page.goto("/previsions");

    const alertsSection = page.getByLabel("Alertes de couverture");
    await expect(alertsSection).toBeVisible();

    // pRupture for alert1 (j7) = 0.72 => "72%"
    await expect(alertsSection.getByText("72%")).toBeVisible();
    // pRupture for alert2 (j7) = 0.55 => "55%"
    await expect(alertsSection.getByText("55%")).toBeVisible();
  });

  test("alert rows have Detail links to alert detail page", async ({
    page,
  }) => {
    await page.goto("/previsions");

    const detailLinks = page.getByRole("link", { name: "Detail" });
    // 3 j7 alerts
    await expect(detailLinks).toHaveCount(3);
  });

  test("clicking J+3 tab shows only j3 horizon alerts", async ({ page }) => {
    await page.goto("/previsions");

    // Click J+3 tab
    await page.getByText("J+3").click();

    const alertsSection = page.getByLabel("Alertes de couverture");
    await expect(alertsSection).toBeVisible();

    // Only 1 alert with horizon "j3" (alert3: Marseille)
    await expect(alertsSection.getByText("Marseille")).toBeVisible();
    // Lyon-Sat j7 alert should not appear
    const detailLinks = page.getByRole("link", { name: "Detail" });
    await expect(detailLinks).toHaveCount(1);
  });

  test("clicking J+14 tab shows only j14 horizon alerts", async ({ page }) => {
    await page.goto("/previsions");

    // Click J+14 tab
    await page.getByText("J+14").click();

    const alertsSection = page.getByLabel("Alertes de couverture");
    await expect(alertsSection).toBeVisible();

    // Only 1 alert with horizon "j14" (alert4: Lyon-Sat)
    await expect(alertsSection.getByText("Lyon-Sat")).toBeVisible();
    const detailLinks = page.getByRole("link", { name: "Detail" });
    await expect(detailLinks).toHaveCount(1);
  });

  test("heatmap section shows empty state when no alerts for horizon", async ({
    page,
  }) => {
    // Override coverage alerts to return empty for a specific horizon
    await page.route("**/api/v1/coverage-alerts*", (route) =>
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

    const heatmapSection = page.getByLabel("Heatmap de couverture");
    await expect(heatmapSection).toBeVisible();
    await expect(
      heatmapSection.getByText("Aucune donnee de couverture"),
    ).toBeVisible();
  });
});
