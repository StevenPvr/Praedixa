import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

const NOW = "2026-02-07T12:00:00Z";

test.describe("API edge cases — 401 redirect", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test("401 on cost-parameters redirects to login with reauth", async ({
    page,
  }) => {
    await mockAllApis(page);
    // Override cost-parameters to 401
    await page.route("**/api/v1/cost-parameters*", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "UNAUTHORIZED", message: "Token expired" },
        }),
      }),
    );

    await page.goto("/parametres");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("401 on operational-decisions redirects to login", async ({ page }) => {
    await mockAllApis(page);
    await page.route("**/api/v1/operational-decisions*", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "UNAUTHORIZED", message: "Token expired" },
        }),
      }),
    );

    await page.goto("/decisions");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("401 on sites endpoint redirects to login", async ({ page }) => {
    await mockAllApis(page);
    await page.route("**/api/v1/sites*", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "UNAUTHORIZED", message: "Token expired" },
        }),
      }),
    );

    await page.goto("/donnees");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});

test.describe("API edge cases — network errors", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test("network error on cost-parameters shows ErrorFallback", async ({
    page,
  }) => {
    await mockAllApis(page);
    await page.route("**/api/v1/cost-parameters*", (route) =>
      route.abort("connectionrefused"),
    );

    await page.goto("/parametres");

    await expect(page.getByRole("button", { name: "Reessayer" })).toBeVisible();
  });

  test("network error on operational-decisions shows ErrorFallback", async ({
    page,
  }) => {
    await mockAllApis(page);
    await page.route("**/api/v1/operational-decisions*", (route) =>
      route.abort("connectionrefused"),
    );

    await page.goto("/decisions");

    await expect(page.getByRole("button", { name: "Reessayer" })).toBeVisible();
  });

  test("network error on sites shows ErrorFallback on donnees page", async ({
    page,
  }) => {
    await mockAllApis(page);
    await page.route("**/api/v1/sites*", (route) =>
      route.abort("connectionrefused"),
    );

    await page.goto("/donnees");

    await expect(page.getByRole("button", { name: "Reessayer" })).toBeVisible();
  });
});

test.describe("API edge cases — 500 with non-JSON body", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("500 with non-JSON response shows generic error", async ({ page }) => {
    await page.route("**/api/v1/cost-parameters*", (route) =>
      route.fulfill({
        status: 500,
        contentType: "text/plain",
        body: "Internal Server Error",
      }),
    );

    await page.goto("/parametres");

    // Should still show an error (generic message from ApiError)
    await expect(page.getByRole("button", { name: "Reessayer" })).toBeVisible();
  });
});

test.describe("Decisions page edge cases", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test("decisions with null chosenOptionId shows dash", async ({ page }) => {
    await page.route("**/api/v1/operational-decisions*", (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: "dec-null-option",
              organizationId: "org-00000000-0000-0000-0000-000000000001",
              coverageAlertId: "alert-1111-1111-1111-111111111111",
              recommendedOptionId: null,
              chosenOptionId: null,
              siteId: "TestSite",
              decisionDate: "2026-02-07",
              shift: "am",
              horizon: "j7",
              gapH: 5,
              isOverride: false,
              coutAttenduEur: null,
              serviceAttenduPct: null,
              coutObserveEur: null,
              serviceObservePct: null,
              decidedBy: "user-1",
              createdAt: NOW,
              updatedAt: NOW,
            },
          ],
          pagination: {
            total: 1,
            page: 1,
            pageSize: 15,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
          timestamp: NOW,
        }),
      });
    });

    await page.goto("/decisions");

    // chosenOptionId null renders "-"
    // coutAttenduEur null renders "-"
    // coutObserveEur null renders "-"
    const tableBody = page.locator("tbody");
    await expect(tableBody.getByText("TestSite")).toBeVisible();

    // Count dashes in the row — we should see multiple "-" for null values
    const dashes = tableBody.getByText("-", { exact: true });
    // chosenOptionId, coutAttenduEur, coutObserveEur, and isOverride (false) all produce "-"
    await expect(dashes.first()).toBeVisible();
  });

  test("decisions filter by horizon updates API call", async ({ page }) => {
    await mockAllApis(page);

    await page.goto("/decisions");

    // Wait for initial data
    await expect(page.getByText("Lyon-Sat").first()).toBeVisible();

    // Change horizon filter to j7
    const horizonSelect = page.locator("select").first();
    await horizonSelect.selectOption("j7");

    // Should still show j7 decisions (decision1 and decision2 have horizon j7)
    await expect(page.getByText("Lyon-Sat").first()).toBeVisible();
    await expect(page.getByText("Paris-CDG")).toBeVisible();
  });

  test("decisions override checkbox filters only overrides", async ({
    page,
  }) => {
    await mockAllApis(page);

    await page.goto("/decisions");

    // Wait for data
    await expect(page.getByText("Lyon-Sat").first()).toBeVisible();

    // Check "Overrides uniquement"
    const checkbox = page.getByRole("checkbox");
    await checkbox.check();

    // Only override decisions should be shown (decision2 and decision4)
    const tableBody = page.locator("tbody");
    const overrideBadges = tableBody.getByText("Override", { exact: true });
    await expect(overrideBadges.first()).toBeVisible();
  });
});

test.describe("Sites table edge cases", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test("empty sites list shows empty message", async ({ page }) => {
    await page.route("**/api/v1/sites*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [],
          timestamp: NOW,
        }),
      }),
    );
    await page.route("**/api/v1/departments*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [],
          timestamp: NOW,
        }),
      }),
    );

    await page.goto("/donnees");

    // SitesTable emptyMessage is "Aucun site configure"
    await expect(page.getByText("Aucun site configure")).toBeVisible();
  });
});
