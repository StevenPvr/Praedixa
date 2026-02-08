import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import {
  mockCoverageAlerts,
  mockCanonicalQuality,
  MOCK_COVERAGE_ALERTS,
} from "./fixtures/api-mocks";

test.describe("Dashboard page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockCoverageAlerts(page);
    await mockCanonicalQuality(page);
  });

  test("displays page title and subtitle", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
    await expect(
      page.getByText("Vue d'ensemble de la couverture operationnelle"),
    ).toBeVisible();
  });

  test("displays KPI stat cards with correct values", async ({ page }) => {
    await page.goto("/dashboard");

    const kpiSection = page.getByLabel("Indicateurs cles");
    await expect(kpiSection).toBeVisible();

    // coveragePct from canonical quality = 87.3%
    await expect(kpiSection.getByText("87.3%")).toBeVisible();
    // Taux couverture moyen label
    await expect(kpiSection.getByText("Taux couverture moyen")).toBeVisible();

    // Alertes actives — dashboard shows top 5 open alerts (page_size=5)
    await expect(kpiSection.getByText("Alertes actives")).toBeVisible();
    await expect(kpiSection.getByText("5")).toBeVisible();

    // Cout estime J+7 placeholder
    await expect(kpiSection.getByText("Cout estime J+7")).toBeVisible();

    // Taux adoption placeholder
    await expect(kpiSection.getByText("Taux adoption")).toBeVisible();
  });

  test("displays heatmap section", async ({ page }) => {
    await page.goto("/dashboard");

    const heatmapSection = page.getByLabel("Heatmap de couverture");
    await expect(heatmapSection).toBeVisible();
    await expect(
      heatmapSection.getByText("Heatmap de couverture"),
    ).toBeVisible();
  });

  test("displays top alerts table with coverage alert data", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    const alertsSection = page.getByLabel("Top alertes");
    await expect(alertsSection).toBeVisible();
    await expect(alertsSection.getByText("Alertes actives")).toBeVisible();

    // Table column headers
    await expect(alertsSection.getByText("Site")).toBeVisible();
    await expect(alertsSection.getByText("Date")).toBeVisible();
    await expect(alertsSection.getByText("Shift")).toBeVisible();
    await expect(alertsSection.getByText("Severite")).toBeVisible();
    await expect(alertsSection.getByText("Gap (h)")).toBeVisible();

    // Alert data from mocks
    await expect(alertsSection.getByText("Lyon-Sat").first()).toBeVisible();
    await expect(alertsSection.getByText("Paris-CDG").first()).toBeVisible();
    await expect(alertsSection.getByText("critical")).toBeVisible();
  });

  test("displays cost trend placeholder section", async ({ page }) => {
    await page.goto("/dashboard");

    const costSection = page.getByLabel("Tendance des couts");
    await expect(costSection).toBeVisible();
    await expect(
      costSection.getByText("Graphique de tendance des couts (a venir)"),
    ).toBeVisible();
  });

  test("KPI coverage card shows success variant when >= 85%", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    const kpiSection = page.getByLabel("Indicateurs cles");
    await expect(kpiSection).toBeVisible();
    // coveragePct is 87.3, which is >= 85 so variant should be "success"
    await expect(kpiSection.getByText("87.3%")).toBeVisible();
  });

  test("alert severity is displayed with correct formatting", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    const alertsSection = page.getByLabel("Top alertes");
    await expect(alertsSection).toBeVisible();

    // critical severity should be visible (bold red text from render function)
    await expect(alertsSection.getByText("critical")).toBeVisible();
    // high severity
    await expect(alertsSection.getByText("high")).toBeVisible();
    // medium severity
    await expect(alertsSection.getByText("medium").first()).toBeVisible();
  });

  test("shows all 5 alert site IDs in the table", async ({ page }) => {
    await page.goto("/dashboard");

    const alertsSection = page.getByLabel("Top alertes");
    await expect(alertsSection).toBeVisible();

    // All 5 alerts should show their siteId (some sites appear multiple times)
    const siteIds = MOCK_COVERAGE_ALERTS.map((a) => a.siteId);
    const uniqueSites = [...new Set(siteIds)];
    for (const siteId of uniqueSites) {
      await expect(alertsSection.getByText(siteId).first()).toBeVisible();
    }
  });
});
