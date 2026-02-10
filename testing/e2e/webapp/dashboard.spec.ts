import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis, MOCK_COVERAGE_ALERTS } from "./fixtures/api-mocks";

test.describe("Dashboard page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("displays page title and subtitle", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Accueil" })).toBeVisible();
    await expect(
      page.getByText("Vue d'ensemble de vos previsions"),
    ).toBeVisible();
  });

  test("displays KPI stat cards with correct values", async ({ page }) => {
    await page.goto("/dashboard");

    const kpiSection = page.getByLabel("Indicateurs cles");
    await expect(kpiSection).toBeVisible();

    await expect(kpiSection.getByText("87.3%")).toBeVisible();
    await expect(kpiSection.getByText("Alertes actives")).toBeVisible();
    await expect(kpiSection.getByText("5")).toBeVisible();
    await expect(kpiSection.getByText("Derniere prevision")).toBeVisible();
  });

  test("displays forecast timeline section", async ({ page }) => {
    await page.goto("/dashboard");

    const section = page.getByLabel("Prevision de capacite");
    await expect(section).toBeVisible();
    await expect(section.getByText("Prevision de capacite")).toBeVisible();
  });

  test("displays next action card with coverage alert data", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    const alertsSection = page.getByLabel("Prochaine action recommandee");
    await expect(alertsSection).toBeVisible();
    await expect(alertsSection.getByText("Lyon-Sat").first()).toBeVisible();
    await expect(alertsSection.getByText("Critique")).toBeVisible();
  });

  test("displays scenario comparison section", async ({ page }) => {
    await page.goto("/dashboard");

    const costSection = page.getByLabel("Comparaison des scenarios");
    await expect(costSection).toBeVisible();
    await expect(
      costSection.getByText("Comparaison des scenarios"),
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

    const alertsSection = page.getByLabel("Prochaine action recommandee");
    await expect(alertsSection).toBeVisible();
    await expect(alertsSection.getByText("Critique")).toBeVisible();
  });

  test("shows status banner with CTA", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByText(
        `${MOCK_COVERAGE_ALERTS.filter((a) => a.severity === "critical").length} alerte(s) critique(s) necessitent votre attention immediate`,
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Voir les actions" }),
    ).toHaveAttribute("href", "/actions");
  });
});
