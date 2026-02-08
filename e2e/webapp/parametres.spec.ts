import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

test.describe("Parametres page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("displays page title and subtitle", async ({ page }) => {
    await page.goto("/parametres");
    await expect(
      page.getByRole("heading", { name: "Parametres", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText("Configuration des couts, shifts, seuils et sites"),
    ).toBeVisible();
  });

  test("displays tab bar with all settings tabs", async ({ page }) => {
    await page.goto("/parametres");

    await expect(page.getByRole("tab", { name: "Couts" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Shifts" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Seuils d'alerte" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Sites" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Export" })).toBeVisible();
  });

  test("Couts tab is active by default and shows cost parameters table", async ({
    page,
  }) => {
    await page.goto("/parametres");

    const section = page.getByLabel("Parametres de cout");
    await expect(section).toBeVisible();
    await expect(
      section.getByRole("heading", { name: "Parametres de cout" }),
    ).toBeVisible();

    // Column headers
    const headers = section.getByRole("columnheader");
    await expect(headers.getByText("Site")).toBeVisible();
    await expect(headers.getByText("Version")).toBeVisible();
    await expect(headers.getByText("C. interne")).toBeVisible();
    await expect(headers.getByText("Maj HS")).toBeVisible();
    await expect(headers.getByText("C. interim")).toBeVisible();
    await expect(headers.getByText("Cap HS/shift")).toBeVisible();
    await expect(headers.getByText("Effectif depuis")).toBeVisible();
  });

  test("cost parameters table shows data from API", async ({ page }) => {
    await page.goto("/parametres");

    const section = page.getByLabel("Parametres de cout");
    await expect(section).toBeVisible();

    // First row: siteId null renders "Defaut org"
    await expect(section.getByText("Defaut org")).toBeVisible();
    // Second row: siteId "Lyon-Sat"
    await expect(section.getByText("Lyon-Sat")).toBeVisible();
  });

  test("Shifts tab displays shift configuration", async ({ page }) => {
    await page.goto("/parametres");

    await page.getByRole("tab", { name: "Shifts" }).click();

    const section = page.getByLabel("Configuration des shifts");
    await expect(section).toBeVisible();
    await expect(
      section.getByRole("heading", { name: "Configuration des shifts" }),
    ).toBeVisible();

    // Shift data
    await expect(section.getByText("AM")).toBeVisible();
    await expect(section.getByText("PM")).toBeVisible();
    await expect(section.getByText("06:00")).toBeVisible();
    await expect(section.getByText("14:00").first()).toBeVisible();
    await expect(section.getByText("22:00")).toBeVisible();
    await expect(section.getByText("Matin")).toBeVisible();
    await expect(section.getByText("Apres-midi")).toBeVisible();
  });

  test("Seuils tab displays alert thresholds", async ({ page }) => {
    await page.goto("/parametres");

    await page.getByRole("tab", { name: "Seuils d'alerte" }).click();

    const section = page.getByLabel("Seuils d'alerte");
    await expect(section).toBeVisible();

    // Threshold values
    await expect(section.getByText("Low")).toBeVisible();
    await expect(section.getByText("0.2")).toBeVisible();
    await expect(section.getByText("Medium")).toBeVisible();
    await expect(section.getByText("0.4")).toBeVisible();
    await expect(section.getByText("High")).toBeVisible();
    await expect(section.getByText("0.6")).toBeVisible();
    await expect(section.getByText("Critical")).toBeVisible();
    await expect(section.getByText("0.8")).toBeVisible();
    await expect(section.getByText("Max alertes/sem.")).toBeVisible();
    await expect(section.getByText("50")).toBeVisible();
  });

  test("Sites tab displays placeholder", async ({ page }) => {
    await page.goto("/parametres");

    await page.getByRole("tab", { name: "Sites" }).click();

    const section = page.getByLabel("Configuration des sites");
    await expect(section).toBeVisible();
    await expect(
      section.getByText("Configuration des sites (a venir)"),
    ).toBeVisible();
  });

  test("Export tab displays export buttons", async ({ page }) => {
    await page.goto("/parametres");

    await page.getByRole("tab", { name: "Export" }).click();

    const section = page.getByLabel("Export");
    await expect(section).toBeVisible();
    await expect(
      section.getByText("Exportez les donnees au format CSV ou PDF"),
    ).toBeVisible();
    await expect(
      section.getByRole("button", { name: "Exporter CSV" }),
    ).toBeVisible();
    await expect(
      section.getByRole("button", { name: "Exporter PDF" }),
    ).toBeVisible();
  });

  test("switching between tabs hides previous tab content", async ({
    page,
  }) => {
    await page.goto("/parametres");

    // Couts tab visible by default
    await expect(page.getByLabel("Parametres de cout")).toBeVisible();

    // Switch to Shifts
    await page.getByRole("tab", { name: "Shifts" }).click();
    await expect(page.getByLabel("Configuration des shifts")).toBeVisible();
    await expect(page.getByLabel("Parametres de cout")).not.toBeVisible();

    // Switch to Seuils
    await page.getByRole("tab", { name: "Seuils d'alerte" }).click();
    await expect(page.getByLabel("Seuils d'alerte")).toBeVisible();
    await expect(page.getByLabel("Configuration des shifts")).not.toBeVisible();

    // Switch to Sites
    await page.getByRole("tab", { name: "Sites" }).click();
    await expect(page.getByLabel("Configuration des sites")).toBeVisible();

    // Switch to Export
    await page.getByRole("tab", { name: "Export" }).click();
    await expect(page.getByLabel("Export")).toBeVisible();
    await expect(page.getByLabel("Configuration des sites")).not.toBeVisible();
  });

  test("cost parameters error state shows ErrorFallback", async ({ page }) => {
    // Override cost-parameters mock to return 500
    await page.route("**/api/v1/cost-parameters*", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message: "Erreur serveur cost-parameters",
          },
        }),
      }),
    );

    await page.goto("/parametres");

    await expect(
      page.getByText("Erreur serveur cost-parameters"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reessayer" }),
    ).toBeVisible();
  });
});
