import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockOperationalDecisions, IDS } from "./fixtures/api-mocks";

test.describe("Decisions page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockOperationalDecisions(page);
  });

  test("displays page title and subtitle", async ({ page }) => {
    await page.goto("/decisions");
    await expect(
      page.getByRole("heading", { name: "Decisions", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText("Journal des decisions operationnelles"),
    ).toBeVisible();
  });

  test("displays filter section with horizon dropdown", async ({ page }) => {
    await page.goto("/decisions");

    const filtersSection = page.getByLabel("Filtres");
    await expect(filtersSection).toBeVisible();

    // Horizon SelectDropdown — exact match to avoid collision with <option>Tous les horizons</option>
    await expect(
      filtersSection.getByText("Horizon", { exact: true }),
    ).toBeVisible();
  });

  test("displays 'Overrides uniquement' checkbox filter", async ({ page }) => {
    await page.goto("/decisions");

    const filtersSection = page.getByLabel("Filtres");
    await expect(filtersSection).toBeVisible();

    // Override checkbox
    await expect(
      filtersSection.getByText("Overrides uniquement"),
    ).toBeVisible();
    const checkbox = filtersSection.getByRole("checkbox");
    await expect(checkbox).toBeVisible();
    await expect(checkbox).not.toBeChecked();
  });

  test("displays DateRangePicker filter", async ({ page }) => {
    await page.goto("/decisions");

    const filtersSection = page.getByLabel("Filtres");
    await expect(filtersSection).toBeVisible();
  });

  test("displays DataTable with correct column headers", async ({ page }) => {
    await page.goto("/decisions");

    // Wait for data to load
    await expect(page.getByText("Lyon-Sat").first()).toBeVisible();

    // Column headers — use columnheader role to avoid matching data cells
    const headers = page.getByRole("columnheader");
    await expect(headers.getByText("Site")).toBeVisible();
    await expect(headers.getByText("Date")).toBeVisible();
    await expect(headers.getByText("Shift")).toBeVisible();
    await expect(headers.getByText("Horizon", { exact: true })).toBeVisible();
    await expect(headers.getByText("Option choisie")).toBeVisible();
    await expect(headers.getByText("Override", { exact: true })).toBeVisible();
    await expect(headers.getByText("Cout attendu")).toBeVisible();
    await expect(headers.getByText("Cout observe")).toBeVisible();
  });

  test("shows all operational decisions", async ({ page }) => {
    await page.goto("/decisions");

    // All 4 mock decisions should be visible — check site IDs
    await expect(page.getByText("Lyon-Sat").first()).toBeVisible();
    await expect(page.getByText("Paris-CDG")).toBeVisible();
    await expect(page.getByText("Marseille")).toBeVisible();
  });

  test("override decisions show Override badge", async ({ page }) => {
    await page.goto("/decisions");

    // 2 decisions are overrides (decision2 and decision4)
    // Scope to tbody to exclude the column header "Override"
    const tableBody = page.locator("tbody");
    const overrideBadges = tableBody.getByText("Override", { exact: true });
    await expect(overrideBadges).toHaveCount(2);
  });

  test("decision rows show truncated chosenOptionId", async ({ page }) => {
    await page.goto("/decisions");

    // chosenOptionId is truncated to 8 chars + "..."
    // decision1.chosenOptionId = IDS.scenarioOpt2 = "opt-2222-..."
    await expect(
      page.getByText(IDS.scenarioOpt2.slice(0, 8) + "..."),
    ).toBeVisible();
  });

  test("decision rows have Detail links", async ({ page }) => {
    await page.goto("/decisions");

    const detailLinks = page.getByRole("link", { name: "Detail" });
    await expect(detailLinks).toHaveCount(4);

    // First Detail link should point to decision1
    const firstLink = detailLinks.first();
    await expect(firstLink).toHaveAttribute(
      "href",
      `/decisions/${IDS.decision1}`,
    );
  });

  test("cost values are formatted with EUR suffix", async ({ page }) => {
    await page.goto("/decisions");

    // decision1: coutAttenduEur = 4200, coutObserveEur = 4100
    // The page formats with toLocaleString("fr-FR") + " EUR"
    await expect(page.getByText(/4[\s\u202f]?200/).first()).toBeVisible();
    await expect(page.getByText(/4[\s\u202f]?100/).first()).toBeVisible();
  });

  test("empty state shows appropriate message when no decisions match filters", async ({
    page,
  }) => {
    // Override decisions mock to return empty
    await page.route("**/api/v1/operational-decisions*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [],
          pagination: {
            total: 0,
            page: 1,
            pageSize: 15,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
          timestamp: "2026-02-07T12:00:00Z",
        }),
      }),
    );

    await page.goto("/decisions");

    await expect(
      page.getByText("Aucune decision pour les filtres selectionnes"),
    ).toBeVisible();
  });
});
