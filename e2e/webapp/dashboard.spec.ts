import { test, expect } from "@playwright/test";
import { setupAuth } from "./fixtures/auth";
import {
  mockDashboardSummary,
  mockAlerts,
  mockForecasts,
  mockDailyForecasts,
  IDS,
} from "./fixtures/api-mocks";

test.describe("Dashboard page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockDashboardSummary(page);
    await mockAlerts(page);
    await mockForecasts(page);
    await mockDailyForecasts(page);
  });

  test("displays page title and subtitle", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
    await expect(
      page.getByText("Vue d'ensemble de la capacite operationnelle"),
    ).toBeVisible();
  });

  test("displays KPI stat cards with correct values", async ({ page }) => {
    await page.goto("/dashboard");

    // Wait for the KPI section to load
    const kpiSection = page.getByLabel("Indicateurs cles");
    await expect(kpiSection).toBeVisible();

    // Check KPI values from the mock data
    await expect(kpiSection.getByText("87%")).toBeVisible(); // coverageHuman
    await expect(kpiSection.getByText("92%")).toBeVisible(); // coverageMerchandise
    await expect(kpiSection.getByText("3")).toBeVisible(); // activeAlertsCount
    await expect(kpiSection.getByText("94%")).toBeVisible(); // forecastAccuracy
  });

  test("displays alerts list with alert titles", async ({ page }) => {
    await page.goto("/dashboard");

    const alertsSection = page.getByLabel("Alertes recentes");
    await expect(alertsSection).toBeVisible();

    // Check that risk alerts are displayed
    await expect(
      alertsSection.getByText("Deficit critique Dept. A1"),
    ).toBeVisible();
    await expect(
      alertsSection.getByText("Risque modere Dept. B1"),
    ).toBeVisible();
  });

  test("shows 'Arbitrer' link only for risk-type alerts", async ({ page }) => {
    await page.goto("/dashboard");

    const alertsSection = page.getByLabel("Alertes recentes");
    await expect(alertsSection).toBeVisible();

    // Risk alerts should have "Arbitrer" links
    const arbitrerLinks = alertsSection.getByRole("link", { name: "Arbitrer" });
    // 2 risk alerts out of 3 total
    await expect(arbitrerLinks).toHaveCount(2);

    // First "Arbitrer" link should point to the correct arbitrage detail
    const firstLink = arbitrerLinks.first();
    await expect(firstLink).toHaveAttribute("href", `/arbitrage/${IDS.alert1}`);
  });

  test("'Arbitrer' button navigates to arbitrage detail page", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    const alertsSection = page.getByLabel("Alertes recentes");
    await expect(alertsSection).toBeVisible();

    // Click on the first "Arbitrer" link
    await alertsSection.getByRole("link", { name: "Arbitrer" }).first().click();

    // Should navigate to the arbitrage detail page
    await expect(page).toHaveURL(new RegExp(`/arbitrage/${IDS.alert1}`));
  });

  test("displays forecast chart section", async ({ page }) => {
    await page.goto("/dashboard");

    const chartSection = page.getByLabel("Prevision de couverture");
    await expect(chartSection).toBeVisible();
    await expect(
      chartSection.getByText("Prevision de couverture a 14 jours"),
    ).toBeVisible();
  });

  test("forecast chart has dimension toggle (Humaine / Marchandise)", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    const chartSection = page.getByLabel("Prevision de couverture");
    await expect(chartSection).toBeVisible();

    // Should have dimension toggle buttons
    await expect(
      chartSection.getByRole("button", { name: "Humaine" }),
    ).toBeVisible();
    await expect(
      chartSection.getByRole("button", { name: "Marchandise" }),
    ).toBeVisible();
  });
});
