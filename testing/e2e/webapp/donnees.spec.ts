import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

test.describe("Donnees page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("displays page title and subtitle", async ({ page }) => {
    await page.goto("/donnees");
    await expect(
      page.getByRole("heading", { name: "Donnees", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText("Toutes les donnees de vos equipes"),
    ).toBeVisible();
  });

  test("displays quality metric cards", async ({ page }) => {
    await page.goto("/donnees");

    await expect(page.getByText("Lignes de donnees")).toBeVisible();
    await expect(page.getByText("Taux de remplissage")).toBeVisible();
    await expect(page.getByText("Absence moyenne")).toBeVisible();
    await expect(page.getByText("Postes non renseignes")).toBeVisible();
    await expect(page.getByText("54000")).toBeVisible();
  });

  test("displays filters for site, shift and date range", async ({ page }) => {
    await page.goto("/donnees");

    await expect(page.getByLabel("Site")).toBeVisible();
    await expect(page.getByLabel("Poste")).toBeVisible();
    const selects = page.locator("select");
    await expect(selects).toHaveCount(2);
  });

  test("displays canonical table with headers and data", async ({ page }) => {
    await page.goto("/donnees");

    const headers = page.getByRole("columnheader");
    await expect(headers.getByText("Site")).toBeVisible();
    await expect(headers.getByText("Date")).toBeVisible();
    await expect(headers.getByText("Poste")).toBeVisible();
    await expect(headers.getByText("Capacite plan. (h)")).toBeVisible();
    await expect(headers.getByText("Realise (h)")).toBeVisible();

    await expect(page.getByRole("cell", { name: "Paris CDG" })).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Lyon Saint-Exupery" }),
    ).toBeVisible();
  });

  test("empty canonical list shows empty-state message", async ({ page }) => {
    await page.route("**/api/v1/canonical*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [],
          pagination: {
            total: 0,
            page: 1,
            pageSize: 20,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
          timestamp: "2026-02-07T12:00:00Z",
        }),
      }),
    );

    await page.goto("/donnees");
    await expect(
      page.getByText("Aucune donnee disponible pour les filtres selectionnes."),
    ).toBeVisible();
  });
});
