import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

test.describe("API edge cases — 401 redirect", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test("401 on cost-parameters redirects to login with reauth", async ({
    page,
  }) => {
    await mockAllApis(page);
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

  test("401 on live alerts endpoint redirects to login from actions page", async ({
    page,
  }) => {
    await mockAllApis(page);
    await page.route("**/api/v1/live/coverage-alerts*", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "UNAUTHORIZED", message: "Token expired" },
        }),
      }),
    );
    await page.goto("/actions");
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

  test("network error on scenarios shows ErrorFallback on actions page", async ({
    page,
  }) => {
    await mockAllApis(page);

    await page.route("**/api/v1/live/coverage-alerts*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: "alert-1",
              organizationId: "org-1",
              siteId: "Lyon",
              alertDate: "2026-02-10",
              shift: "am",
              horizon: "j7",
              pRupture: 0.62,
              gapH: 6,
              severity: "critical",
              status: "open",
              driversJson: ["absence_rate"],
              createdAt: "2026-02-10T00:00:00Z",
              updatedAt: "2026-02-10T00:00:00Z",
            },
          ],
          timestamp: "2026-02-07T12:00:00Z",
        }),
      }),
    );

    await page.route("**/api/v1/coverage-alerts/queue*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: "alert-1",
              siteId: "Lyon",
              alertDate: "2026-02-10",
              shift: "am",
              severity: "critical",
              gapH: 6,
              pRupture: 0.62,
              horizon: "j7",
              driversJson: ["absence_rate"],
              priorityScore: 95,
              estimatedImpactEur: 1200,
              timeToBreachHours: 5,
            },
          ],
          timestamp: "2026-02-07T12:00:00Z",
        }),
      }),
    );

    await page.route("**/api/v1/decision-workspace/*", (route) =>
      route.abort("connectionrefused"),
    );
    await page.route("**/api/v1/scenarios/alert/*", (route) =>
      route.abort("connectionrefused"),
    );

    await page.goto("/actions");
    await expect(
      page.getByText("Une erreur inattendue est survenue").first(),
    ).toBeVisible();
  });

  test("network error on canonical records shows ErrorFallback", async ({
    page,
  }) => {
    await mockAllApis(page);
    await page.route("**/api/v1/live/canonical/quality*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            totalRecords: 10,
            coveragePct: 90,
            sites: ["CDG"],
            dateRange: { from: "2026-01-01", to: "2026-02-01" },
            missingShiftsPct: 1.2,
            avgAbsPct: 4.1,
          },
          timestamp: "2026-02-07T12:00:00Z",
        }),
      }),
    );
    await page.route("**/api/v1/live/canonical*", (route) =>
      route.abort("connectionrefused"),
    );
    await page.goto("/donnees");
    await expect(
      page.getByRole("button", { name: "Reessayer" }).first(),
    ).toBeVisible();
  });
});

test.describe("Sites and canonical edge cases", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test("empty canonical list shows empty message", async ({ page }) => {
    await page.route("**/api/v1/live/canonical/quality*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            totalRecords: 0,
            coveragePct: 0,
            sites: [],
            dateRange: { from: "", to: "" },
            missingShiftsPct: 0,
            avgAbsPct: 0,
          },
          timestamp: "2026-02-07T12:00:00Z",
        }),
      }),
    );
    await page.route("**/api/v1/sites*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [],
          timestamp: "2026-02-07T12:00:00Z",
        }),
      }),
    );
    await page.route("**/api/v1/live/canonical*", (route) =>
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
    await expect(page.getByText(/Aucune donnee.*filtres/)).toBeVisible();
  });
});
