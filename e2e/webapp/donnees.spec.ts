import { test, expect } from "./fixtures/coverage";
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

  test("displays Datasets link card", async ({ page }) => {
    await page.goto("/donnees");

    // Scope to main content to avoid matching the sidebar "Datasets" child link
    const main = page.locator("main");
    const datasetsLink = main.getByRole("link", { name: /Datasets/ });
    await expect(datasetsLink).toBeVisible();
    await expect(datasetsLink).toHaveAttribute("href", "/donnees/datasets");
    await expect(
      main.getByText("Voir les datasets configures et leurs donnees"),
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

    // DataTable column headers from SitesTable component
    await expect(sitesSection.getByText("Nom")).toBeVisible();
    await expect(sitesSection.getByText("Code")).toBeVisible();
    await expect(sitesSection.getByText("Effectif")).toBeVisible();
    await expect(sitesSection.getByText("Fuseau horaire")).toBeVisible();
  });

  test("sites table displays data from mock", async ({ page }) => {
    await page.goto("/donnees");

    const sitesSection = page.getByLabel("Sites");
    await expect(sitesSection).toBeVisible();

    // Both mock sites should be displayed — use exact match for codes
    // since "CDG" is a substring of "Paris CDG" (strict mode would fail)
    for (const site of MOCK_SITES) {
      await expect(sitesSection.getByText(site.name)).toBeVisible();
      await expect(
        sitesSection.getByText(site.code, { exact: true }),
      ).toBeVisible();
    }
  });

  test("departments section is visible with heading", async ({ page }) => {
    await page.goto("/donnees");

    const deptsSection = page.getByLabel("Departements");
    await expect(deptsSection).toBeVisible();
    await expect(
      deptsSection.getByRole("heading", { name: "Departements" }),
    ).toBeVisible();
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
    // Default value should be "" (Tous les sites)
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

    // DataTable column headers — use columnheader role to avoid matching data cells
    const headers = deptsSection.getByRole("columnheader");
    await expect(headers.getByText("Nom")).toBeVisible();
    await expect(headers.getByText("Code")).toBeVisible();
    await expect(headers.getByText("Site", { exact: true })).toBeVisible();
    await expect(headers.getByText("Effectif")).toBeVisible();
    await expect(headers.getByText("Seuil min.")).toBeVisible();
    await expect(headers.getByText("Roles critiques")).toBeVisible();
  });

  test("departments table shows site names resolved from sites data", async ({
    page,
  }) => {
    await page.goto("/donnees");

    const deptsSection = page.getByLabel("Departements");
    await expect(deptsSection).toBeVisible();

    // The DepartmentsTable resolves siteId to site name via the sites prop
    // deptA1 and deptA2 belong to siteA ("Paris CDG"), deptB1 to siteB ("Lyon Saint-Exupery")
    // Use the departments table body to scope the search (avoid matching the sites table)
    const deptsTable = deptsSection.locator("table");
    await expect(deptsTable.getByText("Paris CDG").first()).toBeVisible();
    await expect(deptsTable.getByText("Lyon Saint-Exupery")).toBeVisible();
  });
});
