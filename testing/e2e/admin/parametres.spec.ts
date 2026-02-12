import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";
import {
  mockParametresApis,
  mockParametresApisError,
} from "./fixtures/api-mocks-v2";

test.describe("Parametres page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminAuth(page);
  });

  test("displays heading and subtitle", async ({ page }) => {
    await mockParametresApis(page);
    await page.goto("/parametres");
    await expect(
      page.getByRole("heading", { name: "Parametres" }),
    ).toBeVisible();
    await expect(
      page.getByText("Onboarding et configuration systeme"),
    ).toBeVisible();
  });

  test("displays 2 section tabs", async ({ page }) => {
    await mockParametresApis(page);
    await page.goto("/parametres");
    await expect(
      page.getByRole("button", { name: /^Onboarding/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Configuration" }),
    ).toBeVisible();
  });

  test("default tab Onboarding shows form", async ({ page }) => {
    await mockParametresApis(page);
    await page.goto("/parametres");
    await expect(page.getByPlaceholder("Nom organisation")).toBeVisible();
    await expect(page.getByPlaceholder("slug")).toBeVisible();
    await expect(page.getByPlaceholder("email contact")).toBeVisible();
  });

  test("Lancer button disabled when fields empty", async ({ page }) => {
    await mockParametresApis(page);
    await page.goto("/parametres");
    const lancerBtn = page.getByRole("button", { name: "Lancer" });
    await expect(lancerBtn).toBeVisible();
    await expect(lancerBtn).toBeDisabled();
  });

  test("DataTable with onboarding entries", async ({ page }) => {
    await mockParametresApis(page);
    await page.goto("/parametres");
    // Column headers
    await expect(page.getByText("Organisation")).toBeVisible();
    await expect(page.getByText("Statut")).toBeVisible();
    await expect(page.getByText("Progression")).toBeVisible();
    await expect(page.getByText("Demarre le")).toBeVisible();
    await expect(page.getByText("Termine le")).toBeVisible();
    await expect(page.getByText("Action")).toBeVisible();
  });

  test("Configuration tab shows 3 StatCards", async ({ page }) => {
    await mockParametresApis(page);
    await page.goto("/parametres");
    // Click Configuration tab
    await page.getByRole("button", { name: "Configuration" }).click();
    // 3 StatCards
    await expect(page.getByText("Organisations avec manques")).toBeVisible();
    await expect(
      page.getByText("Parametres manquants", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Statut global")).toBeVisible();
  });

  test("Configuration tab shows missing config table", async ({ page }) => {
    await mockParametresApis(page);
    await page.goto("/parametres");
    await page.getByRole("button", { name: "Configuration" }).click();
    await expect(
      page.getByText("Configurations manquantes par organisation"),
    ).toBeVisible();
  });

  test("shows error state", async ({ page }) => {
    await mockParametresApisError(page);
    await page.goto("/parametres");
    await expect(page.getByText("Erreur de chargement")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reessayer" })).toBeVisible();
  });
});
