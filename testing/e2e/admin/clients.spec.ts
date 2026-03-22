import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";
import {
  mockClientsApis,
  mockClientsApisEmpty,
  mockClientsApisError,
} from "./fixtures/api-mocks-v2";

test.describe("Clients page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminAuth(page);
  });

  test("displays heading and total count", async ({ page }) => {
    await mockClientsApis(page);
    await page.goto("/clients");
    await expect(page.getByRole("heading", { name: "Clients" })).toBeVisible();
    await expect(page.getByText("3 clients au total")).toBeVisible();
  });

  test("displays DataTable with organization rows", async ({ page }) => {
    await mockClientsApis(page);
    await page.goto("/clients");
    // Column headers
    await expect(page.getByRole("columnheader", { name: "Nom" })).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Plan" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Statut" }),
    ).toBeVisible();
    // Data rows
    await expect(page.getByText("Acme Logistique")).toBeVisible();
    await expect(page.getByText("Express Transport")).toBeVisible();
    await expect(page.getByText("Global Freight")).toBeVisible();
  });

  test("has search input", async ({ page }) => {
    await mockClientsApis(page);
    await page.goto("/clients");
    await expect(page.getByPlaceholder("Rechercher par nom...")).toBeVisible();
  });

  test("has status and plan filter dropdowns", async ({ page }) => {
    await mockClientsApis(page);
    await page.goto("/clients");
    const filters = page.getByRole("combobox");
    await expect(filters).toHaveCount(2);
    await expect(filters.nth(0).locator("option").first()).toHaveText(
      "Tous les statuts",
    );
    await expect(filters.nth(1).locator("option").first()).toHaveText(
      "Tous les plans",
    );
  });

  test("has Nouveau client button", async ({ page }) => {
    await mockClientsApis(page);
    await page.goto("/clients");
    await expect(page.getByText("Nouveau client")).toBeVisible();
  });

  test("shows empty state", async ({ page }) => {
    await mockClientsApisEmpty(page);
    await page.goto("/clients");
    await expect(page.getByText("0 client au total")).toBeVisible();
  });

  test("shows error fallback", async ({ page }) => {
    await mockClientsApisError(page);
    await page.goto("/clients");
    await expect(page.getByText("Erreur de chargement")).toBeVisible();
  });
});
