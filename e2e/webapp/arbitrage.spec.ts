import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import {
  mockCoverageAlerts,
  mockScenarios,
  mockScenariosError,
  mockOperationalDecisions,
  IDS,
  MOCK_COVERAGE_ALERTS,
} from "./fixtures/api-mocks";

test.describe("Arbitrage list page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockCoverageAlerts(page);
  });

  test("displays page title and subtitle", async ({ page }) => {
    await page.goto("/arbitrage");
    await expect(
      page.getByRole("heading", { name: "Arbitrage", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Scenarios d'arbitrage pour les alertes de couverture ouvertes",
      ),
    ).toBeVisible();
  });

  test("displays a DataTable with all open coverage alerts", async ({
    page,
  }) => {
    await page.goto("/arbitrage");

    // Table column headers
    await expect(page.getByText("Site")).toBeVisible();
    await expect(page.getByText("Date")).toBeVisible();
    await expect(page.getByText("Shift")).toBeVisible();
    await expect(page.getByText("Horizon")).toBeVisible();
    await expect(page.getByText("Severite")).toBeVisible();
    await expect(page.getByText("Gap (h)")).toBeVisible();

    // All 5 open alerts should appear (not filtered by horizon)
    for (const alert of MOCK_COVERAGE_ALERTS) {
      await expect(page.getByText(alert.siteId).first()).toBeVisible();
    }
  });

  test("severity column shows Badge components", async ({ page }) => {
    await page.goto("/arbitrage");

    // Severity badges — the table renders Badge components for severity
    await expect(page.getByText("critical")).toBeVisible();
    await expect(page.getByText("high")).toBeVisible();
    await expect(page.getByText("medium").first()).toBeVisible();
  });

  test("each alert row has an 'Arbitrer' link", async ({ page }) => {
    await page.goto("/arbitrage");

    const arbitrerLinks = page.getByRole("link", { name: "Arbitrer" });
    // All 5 alerts have an "Arbitrer" link
    await expect(arbitrerLinks).toHaveCount(5);
  });

  test("clicking 'Arbitrer' navigates to alert detail", async ({ page }) => {
    await page.goto("/arbitrage");

    // Mock the scenarios endpoint for navigation
    await mockScenarios(page);
    await mockOperationalDecisions(page);

    // Click the first "Arbitrer" link
    await page.getByRole("link", { name: "Arbitrer" }).first().click();
    await expect(page).toHaveURL(new RegExp(`/arbitrage/${IDS.alert1}`));
  });

  test("first Arbitrer link points to the correct alert ID", async ({
    page,
  }) => {
    await page.goto("/arbitrage");

    const firstLink = page.getByRole("link", { name: "Arbitrer" }).first();
    await expect(firstLink).toHaveAttribute("href", `/arbitrage/${IDS.alert1}`);
  });
});

test.describe("Arbitrage detail page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockScenarios(page);
    await mockOperationalDecisions(page);
  });

  test("displays page heading and subtitle", async ({ page }) => {
    await page.goto(`/arbitrage/${IDS.alert1}`);

    await expect(
      page.getByRole("heading", { name: "Arbitrage", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText("Comparez les scenarios et validez votre choix"),
    ).toBeVisible();
  });

  test("displays alert summary with alert ID", async ({ page }) => {
    await page.goto(`/arbitrage/${IDS.alert1}`);

    const summary = page.getByLabel("Resume alerte");
    await expect(summary).toBeVisible();
    await expect(summary.getByText(IDS.alert1)).toBeVisible();
  });

  test("displays 4 scenario option cards", async ({ page }) => {
    await page.goto(`/arbitrage/${IDS.alert1}`);

    const optionsSection = page.getByLabel("Options de scenario");
    await expect(optionsSection).toBeVisible();

    // 4 option labels
    await expect(
      optionsSection.getByText("Heures supplementaires"),
    ).toBeVisible();
    await expect(optionsSection.getByText("Interim externe")).toBeVisible();
    await expect(
      optionsSection.getByText("Reallocation interne"),
    ).toBeVisible();
    await expect(optionsSection.getByText("Ajustement service")).toBeVisible();
  });

  test("recommended option shows 'Recommande' badge", async ({ page }) => {
    await page.goto(`/arbitrage/${IDS.alert1}`);

    // "Interim externe" is the recommended option
    await expect(page.getByText("Recommande")).toBeVisible();
  });

  test("pareto-optimal options show 'Pareto' badge", async ({ page }) => {
    await page.goto(`/arbitrage/${IDS.alert1}`);

    // 3 options are Pareto-optimal — scope to options section to avoid
    // matching the heading "Frontiere de Pareto"
    const optionsSection = page.getByLabel("Options de scenario");
    const paretoBadges = optionsSection.getByText("Pareto", { exact: true });
    await expect(paretoBadges).toHaveCount(3);
  });

  test("option cards show cost, service, and hours data", async ({ page }) => {
    await page.goto(`/arbitrage/${IDS.alert1}`);

    const optionsSection = page.getByLabel("Options de scenario");
    await expect(optionsSection).toBeVisible();

    // Check values from first option (Heures supplementaires):
    // coutTotalEur: 2800, serviceAttenduPct: 85.0, heuresCouvertes: 10
    await expect(optionsSection.getByText("85.0%")).toBeVisible();
    await expect(optionsSection.getByText("10h")).toBeVisible();

    // Check recommended option (Interim externe):
    // coutTotalEur: 4200, serviceAttenduPct: 95.0, heuresCouvertes: 14
    await expect(optionsSection.getByText("95.0%")).toBeVisible();
    await expect(optionsSection.getByText("14h")).toBeVisible();
  });

  test("option cards show option type", async ({ page }) => {
    await page.goto(`/arbitrage/${IDS.alert1}`);

    const optionsSection = page.getByLabel("Options de scenario");
    await expect(optionsSection).toBeVisible();

    // optionType values from mock data — exact match to avoid substring collisions
    // (e.g. "interim" is a case-insensitive substring of "Interim externe")
    await expect(optionsSection.getByText("hs", { exact: true })).toBeVisible();
    await expect(
      optionsSection.getByText("interim", { exact: true }),
    ).toBeVisible();
    await expect(
      optionsSection.getByText("realloc_intra", { exact: true }),
    ).toBeVisible();
    await expect(
      optionsSection.getByText("service_adjust", { exact: true }),
    ).toBeVisible();
  });

  test("displays Pareto chart section", async ({ page }) => {
    await page.goto(`/arbitrage/${IDS.alert1}`);

    const paretoSection = page.getByLabel("Graphique Pareto");
    await expect(paretoSection).toBeVisible();
    await expect(paretoSection.getByText("Frontiere de Pareto")).toBeVisible();
  });

  test("'Valider la decision' button is disabled when no option selected", async ({
    page,
  }) => {
    await page.goto(`/arbitrage/${IDS.alert1}`);

    const validateButton = page.getByRole("button", {
      name: "Valider la decision",
    });
    await expect(validateButton).toBeVisible();
    await expect(validateButton).toBeDisabled();
  });

  test("clicking an option card enables the validate button", async ({
    page,
  }) => {
    await page.goto(`/arbitrage/${IDS.alert1}`);

    // Click the first option card
    const optionsSection = page.getByLabel("Options de scenario");
    await optionsSection.getByText("Heures supplementaires").click();

    // Now the validate button should be enabled
    const validateButton = page.getByRole("button", {
      name: "Valider la decision",
    });
    await expect(validateButton).toBeEnabled();
  });

  test("selecting an option then clicking validate shows success and redirects", async ({
    page,
  }) => {
    await page.goto(`/arbitrage/${IDS.alert1}`);

    // Click the recommended option card
    const optionsSection = page.getByLabel("Options de scenario");
    await optionsSection.getByText("Interim externe").click();

    // Click validate
    await page.getByRole("button", { name: "Valider la decision" }).click();

    // Success banner should appear
    await expect(
      page.getByText(
        "Decision enregistree avec succes. Redirection en cours...",
      ),
    ).toBeVisible();

    // Should redirect to /decisions
    await expect(page).toHaveURL(/\/decisions/, { timeout: 5000 });
  });

  test("error state shows ErrorFallback when scenarios API fails", async ({
    page,
  }) => {
    // Override with failing scenario mock
    await setupAuth(page);
    await mockScenariosError(page);

    await page.goto(`/arbitrage/${IDS.alert1}`);

    // Error fallback should be visible with retry button
    await expect(page.getByText("Erreur interne du serveur")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reessayer" })).toBeVisible();
  });
});
