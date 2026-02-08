import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";

test.describe("Admin back-office smoke tests", () => {
  test("login page loads successfully", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Praedixa" })).toBeVisible();
  });

  test("authenticated super_admin can access dashboard", async ({ page }) => {
    await setupAdminAuth(page);

    // Mock admin API endpoints with proper response shapes to avoid runtime crashes
    await page.route("**/api/v1/admin/monitoring/platform*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { totalOrganizations: 5, totalUsers: 42, totalDatasets: 10, totalForecasts: 100, activeOrganizations: 3, totalDecisions: 200 },
          timestamp: "2026-02-07T12:00:00Z",
        }),
      }),
    );
    await page.route("**/api/v1/admin/monitoring/errors*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { ingestionSuccessRate: 0.95, ingestionErrorCount: 3, apiErrorRate: 0.01 },
          timestamp: "2026-02-07T12:00:00Z",
        }),
      }),
    );
    // Catch-all for remaining admin monitoring endpoints
    await page.route("**/api/v1/admin/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: null,
          timestamp: "2026-02-07T12:00:00Z",
        }),
      }),
    );

    await page.goto("/dashboard");

    // Should NOT be redirected to /login or /unauthorized
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).not.toHaveURL(/\/unauthorized/);

    // Admin dashboard heading is "Tableau de bord" (French)
    await expect(
      page.getByRole("heading", { name: /tableau de bord/i }),
    ).toBeVisible();
  });
});
