import { test, expect } from "@playwright/test";
import { setupAuth } from "./fixtures/auth";
import { mockDecisions } from "./fixtures/api-mocks";

test.describe("Decisions page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockDecisions(page);
  });

  test("displays page title and subtitle", async ({ page }) => {
    await page.goto("/decisions");
    await expect(
      page.getByRole("heading", { name: "Decisions", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText("Suivi et audit trail des decisions operationnelles"),
    ).toBeVisible();
  });

  test("displays status filter tabs", async ({ page }) => {
    await page.goto("/decisions");

    const tablist = page.getByRole("tablist", { name: "Filtrer par statut" });
    await expect(tablist).toBeVisible();

    // All status filter tabs
    await expect(tablist.getByRole("tab", { name: "Toutes" })).toBeVisible();
    await expect(tablist.getByRole("tab", { name: "Suggerees" })).toBeVisible();
    await expect(
      tablist.getByRole("tab", { name: "En attente" }),
    ).toBeVisible();
    await expect(
      tablist.getByRole("tab", { name: "Approuvees" }),
    ).toBeVisible();
    await expect(tablist.getByRole("tab", { name: "Rejetees" })).toBeVisible();
    await expect(
      tablist.getByRole("tab", { name: "Implementees" }),
    ).toBeVisible();
  });

  test("'Toutes' tab is active by default and shows all decisions", async ({
    page,
  }) => {
    await page.goto("/decisions");

    const toutesTab = page.getByRole("tab", { name: "Toutes" });
    await expect(toutesTab).toHaveAttribute("aria-selected", "true");

    // All 5 mock decisions should be visible
    await expect(
      page.getByText("Recrutement interimaire Logistique Paris"),
    ).toBeVisible();
    await expect(page.getByText("Heures sup Manutention Paris")).toBeVisible();
    await expect(page.getByText("Redistribution equipe Lyon")).toBeVisible();
    await expect(page.getByText("Aucune action Dept B1")).toBeVisible();
    await expect(page.getByText("Interimaire urgent Paris")).toBeVisible();
  });

  test("clicking a status tab filters the decisions", async ({ page }) => {
    await page.goto("/decisions");

    // Click "Suggerees" tab
    await page.getByRole("tab", { name: "Suggerees" }).click();

    // Only the "suggested" decision should be visible
    await expect(
      page.getByText("Recrutement interimaire Logistique Paris"),
    ).toBeVisible();

    // Other decisions should not be visible
    await expect(
      page.getByText("Heures sup Manutention Paris"),
    ).not.toBeVisible();
    await expect(
      page.getByText("Redistribution equipe Lyon"),
    ).not.toBeVisible();
  });

  test("decisions table shows column headers", async ({ page }) => {
    await page.goto("/decisions");

    // Wait for the table to load
    await expect(
      page.getByText("Recrutement interimaire Logistique Paris"),
    ).toBeVisible();

    // Column headers from DecisionsTable
    await expect(page.getByText("Titre")).toBeVisible();
    await expect(page.getByText("Departement")).toBeVisible();
    await expect(page.getByText("Type")).toBeVisible();
    await expect(page.getByText("Cout")).toBeVisible();
    await expect(page.getByText("Statut")).toBeVisible();
    await expect(page.getByText("Confiance")).toBeVisible();
  });

  test("decisions show department names", async ({ page }) => {
    await page.goto("/decisions");

    // Department names from mock data
    await expect(page.getByText("Logistique Paris").first()).toBeVisible();
    await expect(page.getByText("Manutention Paris")).toBeVisible();
    await expect(page.getByText("Logistique Lyon").first()).toBeVisible();
  });
});
