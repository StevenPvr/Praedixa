import { test, expect } from "@playwright/test";
import { setupAuth } from "./fixtures/auth";
import {
  mockSites,
  mockDepartments,
  MOCK_SITES,
  MOCK_DEPARTMENTS,
} from "./fixtures/api-mocks";

test.describe("Donnees page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockSites(page);
    await mockDepartments(page);
  });

  test("displays page title and subtitle", async ({ page }) => {
    await page.goto("/donnees");
    await expect(
      page.getByRole("heading", { name: "Donnees", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText("Consultation des donnees importees (lecture seule)"),
    ).toBeVisible();
  });

  test("displays Sites section with heading", async ({ page }) => {
    await page.goto("/donnees");

    const sitesSection = page.getByLabel("Sites");
    await expect(sitesSection).toBeVisible();
    await expect(
      sitesSection.getByRole("heading", { name: "Sites" }),
    ).toBeVisible();
  });

  test("sites table shows correct column headers", async ({ page }) => {
    await page.goto("/donnees");

    const sitesSection = page.getByLabel("Sites");
    await expect(sitesSection).toBeVisible();

    // DataTable column headers
    await expect(sitesSection.getByText("Nom")).toBeVisible();
    await expect(sitesSection.getByText("Code")).toBeVisible();
    await expect(sitesSection.getByText("Effectif")).toBeVisible();
    await expect(sitesSection.getByText("Fuseau horaire")).toBeVisible();
  });

  test("sites table displays data from mock", async ({ page }) => {
    await page.goto("/donnees");

    const sitesSection = page.getByLabel("Sites");
    await expect(sitesSection).toBeVisible();

    // Both mock sites should be displayed
    for (const site of MOCK_SITES) {
      await expect(sitesSection.getByText(site.name)).toBeVisible();
      await expect(sitesSection.getByText(site.code)).toBeVisible();
    }
  });

  test("departments section has site filter dropdown", async ({ page }) => {
    await page.goto("/donnees");

    const deptsSection = page.getByLabel("Departements");
    await expect(deptsSection).toBeVisible();

    // Site filter select
    const filterLabel = deptsSection.getByText("Filtrer par site");
    await expect(filterLabel).toBeVisible();

    const select = deptsSection.getByRole("combobox");
    await expect(select).toBeVisible();
    // Default value should be "Tous les sites"
    await expect(select).toHaveValue("");
  });

  test("departments table shows all departments by default", async ({
    page,
  }) => {
    await page.goto("/donnees");

    const deptsSection = page.getByLabel("Departements");
    await expect(deptsSection).toBeVisible();

    // All 3 departments should be shown
    for (const dept of MOCK_DEPARTMENTS) {
      await expect(deptsSection.getByText(dept.name)).toBeVisible();
    }
  });

  test("departments table shows correct column headers", async ({ page }) => {
    await page.goto("/donnees");

    const deptsSection = page.getByLabel("Departements");
    await expect(deptsSection).toBeVisible();

    // DataTable column headers for departments
    await expect(deptsSection.getByText("Nom")).toBeVisible();
    await expect(deptsSection.getByText("Code")).toBeVisible();
    await expect(deptsSection.getByText("Site")).toBeVisible();
    await expect(deptsSection.getByText("Effectif")).toBeVisible();
    await expect(deptsSection.getByText("Seuil min.")).toBeVisible();
    await expect(deptsSection.getByText("Roles critiques")).toBeVisible();
  });
});
