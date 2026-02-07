import { test, expect } from "@playwright/test";
import { setupAuth } from "./fixtures/auth";

test.describe("Error states", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test("network error on dashboard shows ErrorFallback", async ({ page }) => {
    // Mock API to return network error
    await page.route("**/api/v1/dashboard/summary*", (route) =>
      route.abort("connectionrefused"),
    );
    await page.route("**/api/v1/alerts*", (route) =>
      route.abort("connectionrefused"),
    );
    // Mock forecast endpoints too to prevent side-effect errors
    await page.route("**/api/v1/forecasts*", (route) =>
      route.abort("connectionrefused"),
    );

    await page.goto("/dashboard");

    // ErrorFallback should be displayed with retry button
    await expect(
      page.getByRole("button", { name: "Reessayer" }).first(),
    ).toBeVisible();
  });

  test("API 500 error shows error fallback message", async ({ page }) => {
    await page.route("**/api/v1/dashboard/summary*", (route) =>
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
    await page.route("**/api/v1/alerts*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [] }),
      }),
    );
    await page.route("**/api/v1/forecasts*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [] }),
      }),
    );

    await page.goto("/dashboard");

    // Should show the error message
    await expect(page.getByText("Erreur interne du serveur")).toBeVisible();
    // Retry button should be present
    await expect(page.getByRole("button", { name: "Reessayer" })).toBeVisible();
  });

  test("401 error redirects to login page", async ({ page }) => {
    await page.route("**/api/v1/dashboard/summary*", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "UNAUTHORIZED", message: "Token expired" },
        }),
      }),
    );
    await page.route("**/api/v1/alerts*", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "UNAUTHORIZED", message: "Token expired" },
        }),
      }),
    );
    await page.route("**/api/v1/forecasts*", (route) =>
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
    // Mock decisions to return empty
    await page.route("**/api/v1/decisions*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [],
          pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
        }),
      }),
    );

    await page.goto("/decisions");

    // Empty state message from DecisionsPage
    await expect(
      page.getByText("Aucune decision pour les filtres selectionnes"),
    ).toBeVisible();
  });
});
