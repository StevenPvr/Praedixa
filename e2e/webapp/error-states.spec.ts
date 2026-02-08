import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";

test.describe("Error states", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test("network error on dashboard shows ErrorFallback", async ({ page }) => {
    // Mock dashboard API endpoints to return network errors
    await page.route("**/api/v1/coverage-alerts*", (route) =>
      route.abort("connectionrefused"),
    );
    await page.route("**/api/v1/canonical/quality*", (route) =>
      route.abort("connectionrefused"),
    );

    await page.goto("/dashboard");

    // ErrorFallback should be displayed with retry button
    await expect(
      page.getByRole("button", { name: "Reessayer" }).first(),
    ).toBeVisible();
  });

  test("API 500 error on dashboard shows error message", async ({ page }) => {
    await page.route("**/api/v1/coverage-alerts*", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message: "Erreur interne du serveur",
          },
        }),
      }),
    );
    await page.route("**/api/v1/canonical/quality*", (route) =>
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

    await page.goto("/dashboard");

    // Should show the error message from the alerts API
    await expect(page.getByText("Erreur interne du serveur")).toBeVisible();
    // Retry button should be present
    await expect(page.getByRole("button", { name: "Reessayer" })).toBeVisible();
  });

  test("401 error on dashboard redirects to login page", async ({ page }) => {
    await page.route("**/api/v1/coverage-alerts*", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "UNAUTHORIZED", message: "Token expired" },
        }),
      }),
    );
    await page.route("**/api/v1/canonical/quality*", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "UNAUTHORIZED", message: "Token expired" },
        }),
      }),
    );

    await page.goto("/dashboard");

    // Hook-level 401 handling redirects to /login via router.replace
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("empty decisions state shows appropriate message", async ({ page }) => {
    // Mock operational decisions to return empty
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

    // Empty state message from DecisionsPage
    await expect(
      page.getByText("Aucune decision pour les filtres selectionnes"),
    ).toBeVisible();
  });

  test("network error on previsions shows ErrorFallback", async ({ page }) => {
    await page.route("**/api/v1/coverage-alerts*", (route) =>
      route.abort("connectionrefused"),
    );

    await page.goto("/previsions");

    await expect(page.getByRole("button", { name: "Reessayer" })).toBeVisible();
  });

  test("API 500 on arbitrage list shows error fallback", async ({ page }) => {
    await page.route("**/api/v1/coverage-alerts*", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message: "Erreur serveur coverage-alerts",
          },
        }),
      }),
    );

    await page.goto("/arbitrage");

    await expect(
      page.getByText("Erreur serveur coverage-alerts"),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Reessayer" })).toBeVisible();
  });

  test("API 500 on arbitrage detail shows error fallback", async ({ page }) => {
    await page.route("**/api/v1/scenarios/alert/*", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message: "Erreur serveur scenarios",
          },
        }),
      }),
    );

    await page.goto("/arbitrage/some-alert-id");

    await expect(page.getByText("Erreur serveur scenarios")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reessayer" })).toBeVisible();
  });
});
