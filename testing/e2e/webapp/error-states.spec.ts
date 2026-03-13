import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

test.describe("Error states", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("API 500 on dashboard summary shows error banner", async ({ page }) => {
    await page.route("**/api/v1/**dashboard/summary*", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: { code: "INTERNAL_ERROR", message: "Erreur dashboard" },
          timestamp: "2026-02-07T12:00:00Z",
        }),
      }),
    );

    await page.goto("/dashboard");
    await expect(page.getByText("Erreur dashboard")).toBeVisible();
  });

  test("401 error on dashboard redirects to login", async ({ page }) => {
    await page.route("**/api/v1/**dashboard/summary*", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Token expired" },
          timestamp: new Date().toISOString(),
        }),
      }),
    );

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test("network error on previsions forecast endpoint shows retry", async ({
    page,
  }) => {
    await page.route("**/api/v1/live/forecasts/latest/daily*", (route) =>
      route.abort("connectionrefused"),
    );

    await page.goto("/previsions");
    await expect(page.getByRole("button", { name: "Reessayer" })).toBeVisible();
  });

  test("API 500 on actions workspace shows error fallback", async ({
    page,
  }) => {
    await page.route("**/api/v1/**decision-workspace/*", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Erreur serveur scenarios",
          },
        }),
      }),
    );

    await page.goto("/actions");
    await expect(page.getByText("Erreur serveur scenarios")).toBeVisible();
  });
});
