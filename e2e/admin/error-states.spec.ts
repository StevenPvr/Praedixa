import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";

test.describe("Admin error states and edge cases", () => {
  test.describe("API 500 error shows ErrorFallback", () => {
    test.beforeEach(async ({ page }) => {
      await setupAdminAuth(page);
    });

    test("dashboard shows error on monitoring API failure", async ({
      page,
    }) => {
      await page.route("**/api/v1/admin/**", (route) =>
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: {
              code: "INTERNAL_ERROR",
              message: "Database connection failed",
            },
            timestamp: "2026-02-07T12:00:00Z",
          }),
        }),
      );

      await page.goto("/dashboard");

      await expect(page.getByText("Erreur de chargement").first()).toBeVisible();
      await expect(
        page.getByRole("button", { name: /reessayer/i }).first(),
      ).toBeVisible();
    });
  });

  test.describe("401 redirects to login", () => {
    test("API 401 on protected page redirects to login with reauth", async ({
      page,
    }) => {
      await setupAdminAuth(page);

      // Mock API to return 401
      await page.route("**/api/v1/admin/**", (route) =>
        route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: {
              code: "UNAUTHORIZED",
              message: "Token expired",
            },
            timestamp: "2026-02-07T12:00:00Z",
          }),
        }),
      );

      // Also mock Supabase signOut to not fail
      await page.route("**/auth/v1/logout*", (route) =>
        route.fulfill({ status: 204 }),
      );

      await page.goto("/dashboard");

      // Should redirect to login with reauth=1
      await expect(page).toHaveURL(/\/login\?reauth=1/, { timeout: 10000 });
    });
  });

  test.describe("Unauthenticated access", () => {
    test("unauthenticated user is redirected to login", async ({ page }) => {
      // Don't set up auth -- go directly to a protected page
      await page.goto("/dashboard");

      // Middleware should redirect to /login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });
  });

  test.describe("ErrorFallback retry button", () => {
    test("retry button triggers refetch on alertes page", async ({ page }) => {
      await setupAdminAuth(page);

      let callCount = 0;
      await page.route(
        "**/api/v1/admin/monitoring/alerts/summary*",
        (route) => {
          callCount++;
          if (callCount <= 1) {
            return route.fulfill({
              status: 500,
              contentType: "application/json",
              body: JSON.stringify({
                success: false,
                error: {
                  code: "INTERNAL_ERROR",
                  message: "Temporary error",
                },
                timestamp: "2026-02-07T12:00:00Z",
              }),
            });
          }
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: {
                total: 5,
                bySeverity: { low: 1, medium: 2, high: 1, critical: 1 },
                byStatus: {
                  open: 2,
                  acknowledged: 1,
                  resolved: 1,
                  expired: 1,
                },
              },
              timestamp: "2026-02-07T12:00:00Z",
            }),
          });
        },
      );

      await page.goto("/alertes");

      // First: error state
      await expect(page.getByText("Erreur de chargement")).toBeVisible();

      // Click retry
      await page.getByRole("button", { name: /reessayer/i }).click();

      // After retry: data should appear
      await expect(page.getByText("5 alertes au total")).toBeVisible();
    });
  });
});
