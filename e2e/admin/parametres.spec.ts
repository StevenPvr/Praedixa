import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";
import {
  mockParametresApis,
  mockParametresApisAllConfigured,
  mockParametresApisError,
  MOCK_COST_PARAMS_MISSING,
} from "./fixtures/api-mocks";

test.describe("Parametres page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminAuth(page);
  });

  test("displays page title and subtitle", async ({ page }) => {
    await mockParametresApis(page);
    await page.goto("/parametres");

    await expect(
      page.getByRole("heading", { name: "Parametres", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Statut de configuration des parametres de cout par organisation",
      ),
    ).toBeVisible();
  });

  test("displays summary stat cards with correct values", async ({ page }) => {
    await mockParametresApis(page);
    await page.goto("/parametres");

    await expect(
      page.getByRole("heading", { name: "Parametres", exact: true }),
    ).toBeVisible();

    await expect(page.getByText("Organisations avec manques")).toBeVisible();
    await expect(
      page
        .getByText(String(MOCK_COST_PARAMS_MISSING.totalOrgsWithMissing))
        .first(),
    ).toBeVisible();

    await expect(
      page.getByText("Parametres manquants", { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByText(String(MOCK_COST_PARAMS_MISSING.totalMissingParams))
        .first(),
    ).toBeVisible();

    await expect(page.getByText("Statut global")).toBeVisible();
    await expect(page.getByText("Incomplet")).toBeVisible();
  });

  test("shows warning banner when missing params exist", async ({ page }) => {
    await mockParametresApis(page);
    await page.goto("/parametres");

    await expect(
      page.getByText(/2 organisations avec des parametres manquants/),
    ).toBeVisible();
  });

  test("displays missing config table with org details", async ({ page }) => {
    await mockParametresApis(page);
    await page.goto("/parametres");

    await expect(
      page.getByText("Configurations manquantes par organisation"),
    ).toBeVisible();

    // Truncated org IDs
    const orgPrefix = MOCK_COST_PARAMS_MISSING.orgs[0].organizationId.slice(
      0,
      8,
    );
    await expect(page.getByText(`${orgPrefix}...`)).toBeVisible();

    // Type labels
    await expect(page.getByText("Cout horaire HS")).toBeVisible();
    await expect(page.getByText("Cout journalier interim")).toBeVisible();
    await expect(page.getByText("Penalite sous-effectif")).toBeVisible();
    await expect(page.getByText("Cout reallocation")).toBeVisible();
    await expect(page.getByText("Cout sous-traitance")).toBeVisible();
  });

  test("shows success banner when all configured", async ({ page }) => {
    await mockParametresApisAllConfigured(page);
    await page.goto("/parametres");

    await expect(page.getByText("Complet")).toBeVisible();
    await expect(
      page.getByText(
        "Toutes les organisations ont leurs parametres de cout configures.",
      ),
    ).toBeVisible();
  });

  test("shows loading skeletons before data loads", async ({ page }) => {
    await page.route(
      "**/api/v1/admin/monitoring/cost-params/missing*",
      (route) =>
        new Promise((resolve) => setTimeout(resolve, 2000)).then(() =>
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: MOCK_COST_PARAMS_MISSING,
              timestamp: "2026-02-07T12:00:00Z",
            }),
          }),
        ),
    );

    await page.goto("/parametres");

    await expect(
      page.getByRole("heading", { name: "Parametres", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Configuration des parametres de cout"),
    ).toBeVisible();
  });

  test("shows error fallback on API failure", async ({ page }) => {
    await mockParametresApisError(page);
    await page.goto("/parametres");

    await expect(page.getByText("Erreur de chargement")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /reessayer/i }),
    ).toBeVisible();
  });
});
