import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";
import {
  mockJournalApis,
  mockJournalApisEmpty,
  mockJournalApisError,
} from "./fixtures/api-mocks-v2";

test.describe("Journal page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminAuth(page);
  });

  test("displays heading and subtitle", async ({ page }) => {
    await mockJournalApis(page);
    await page.goto("/journal");
    await expect(page.getByRole("heading", { name: "Journal" })).toBeVisible();
    await expect(page.getByText("Audit et conformite RGPD")).toBeVisible();
  });

  test("displays 2 section tabs", async ({ page }) => {
    await mockJournalApis(page);
    await page.goto("/journal");
    await expect(page.getByRole("button", { name: /^Audit/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "RGPD" })).toBeVisible();
  });

  test("default tab is Audit — shows DataTable columns", async ({ page }) => {
    await mockJournalApis(page);
    await page.goto("/journal");
    // Column headers
    await expect(
      page.getByRole("columnheader", { name: "Date" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Action" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Severite" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Ressource" }),
    ).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "IP" })).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Request ID" }),
    ).toBeVisible();
  });

  test("audit table shows mock data rows", async ({ page }) => {
    await mockJournalApis(page);
    await page.goto("/journal");
    const table = page.getByRole("table").first();
    await expect(table.getByText("Consultation organisation")).toBeVisible();
    await expect(table.getByText("Suspension organisation")).toBeVisible();
  });

  test("action filter dropdown is visible", async ({ page }) => {
    await mockJournalApis(page);
    await page.goto("/journal");
    const filter = page.getByRole("combobox");
    await expect(filter).toBeVisible();
    await expect(filter.locator("option").first()).toHaveText(
      "Toutes les actions",
    );
  });

  test("RGPD tab shows 4 cards", async ({ page }) => {
    await mockJournalApis(page);
    await page.goto("/journal");
    // Click RGPD tab
    await page.getByRole("button", { name: "RGPD" }).click();
    // 4 RGPD cards
    await expect(
      page.getByRole("heading", {
        name: "Registre des traitements",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Consulter" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Export des donnees", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Exporter" })).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Suppression des donnees",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Supprimer" })).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Politique de retention",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Configurer" }),
    ).toBeVisible();
  });

  test("shows error state for audit table", async ({ page }) => {
    await mockJournalApisError(page);
    await page.goto("/journal");
    await expect(page.getByText("Erreur de chargement")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reessayer" })).toBeVisible();
  });

  test("shows empty state for audit table", async ({ page }) => {
    await mockJournalApisEmpty(page);
    await page.goto("/journal");
    // Empty DataTable — no data rows, just headers
    await expect(page.getByText("Date")).toBeVisible();
    await expect(page.getByText("Consultation organisation")).not.toBeVisible();
  });
});
