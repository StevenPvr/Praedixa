import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import {
  mockCoverageAlerts,
  mockDecisionQueue,
  mockDecisionWorkspace,
  mockScenarios,
  mockScenariosError,
  mockOperationalDecisions,
} from "./fixtures/api-mocks";

test.describe("Actions page (ex-Arbitrage)", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockCoverageAlerts(page);
    await mockDecisionQueue(page);
    await mockDecisionWorkspace(page);
    await mockScenarios(page);
    await mockOperationalDecisions(page);
  });

  test("displays page heading and subtitle", async ({ page }) => {
    await page.goto("/actions");
    await expect(
      page.getByRole("heading", { name: "Centre de traitement", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText("Traitez les alertes dans l'ordre d'impact operationnel"),
    ).toBeVisible();
  });

  test("displays alerts selector and optimization section", async ({
    page,
  }) => {
    await page.goto("/actions");
    await expect(page.getByLabel("Selection de l'alerte")).toBeVisible();
    await expect(page.getByLabel("Options d'optimisation")).toBeVisible();
  });

  test("displays pareto chart section", async ({ page }) => {
    await page.goto("/actions");
    await expect(page.getByLabel("Graphique Pareto")).toBeVisible();
    await expect(page.getByText("Compromis cout / couverture")).toBeVisible();
  });

  test("validate button is disabled when no option selected", async ({
    page,
  }) => {
    await page.goto("/actions");
    const validateButton = page.getByRole("button", {
      name: "Valider cette solution",
    });
    await expect(validateButton).toBeVisible();
    await expect(validateButton).toBeDisabled();
  });

  test("clicking an option enables validate button", async ({ page }) => {
    await page.goto("/actions");
    await page.getByText("Heures supplementaires").first().click();
    await expect(
      page.getByRole("button", { name: "Valider cette solution" }),
    ).toBeEnabled();
  });

  test("select option and validate shows success toast", async ({ page }) => {
    await page.goto("/actions");
    await page.getByText("Interim").first().click();
    await page.getByRole("button", { name: "Valider cette solution" }).click();
    await expect(page.getByText("Decision enregistree")).toBeVisible();
  });

  test("error state shows fallback when scenarios API fails", async ({
    page,
  }) => {
    await setupAuth(page);
    await mockCoverageAlerts(page);
    await mockDecisionQueue(page);
    await mockScenariosError(page);
    await mockOperationalDecisions(page);
    await page.route("**/api/v1/**decision-workspace/*", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Erreur interne du serveur",
          },
          timestamp: "2026-02-07T12:00:00Z",
        }),
      }),
    );

    await page.goto("/actions");
    await expect(page.getByText("Erreur interne du serveur")).toBeVisible();
  });
});
