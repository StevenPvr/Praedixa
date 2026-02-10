import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";

test.describe("Error states", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test("network error on dashboard summary shows fallback in timeline section", async ({
    page,
  }) => {
    await page.route("**/api/v1/coverage-alerts*", (route) =>
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
    await page.route("**/api/v1/dashboard/summary*", (route) =>
      route.abort("connectionrefused"),
    );
    await page.route("**/api/v1/forecasts*", (route) =>
      route.abort("connectionrefused"),
    );

    await page.goto("/dashboard");
    await expect(
      page
        .getByLabel("Prevision de capacite")
        .getByText("Erreur de chargement"),
    ).toBeVisible();
    await expect(
      page
        .getByLabel("Prevision de capacite")
        .getByRole("button", { name: "Reessayer" }),
    ).toBeVisible();
  });

  test("401 error on dashboard redirects to login", async ({ page }) => {
    await page.route("**/api/v1/coverage-alerts*", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "UNAUTHORIZED", message: "Token expired" },
        }),
      }),
    );
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("network error on previsions forecast endpoint shows fallback", async ({
    page,
  }) => {
    await page.route("**/api/v1/forecasts*", (route) =>
      route.abort("connectionrefused"),
    );
    await page.route("**/api/v1/coverage-alerts*", (route) =>
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

    await page.goto("/previsions");
    await expect(page.getByRole("button", { name: "Reessayer" })).toBeVisible();
  });

  test("API 500 on actions scenarios shows error fallback", async ({
    page,
  }) => {
    await page.route("**/api/v1/coverage-alerts*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: "alert-1111-1111-1111-111111111111",
              organizationId: "org-1",
              siteId: "Lyon-Sat",
              alertDate: "2026-02-10",
              shift: "am",
              horizon: "j7",
              pRupture: 0.7,
              gapH: 10,
              severity: "critical",
              status: "open",
              driversJson: [],
              createdAt: "2026-02-07T12:00:00Z",
              updatedAt: "2026-02-07T12:00:00Z",
            },
          ],
          timestamp: "2026-02-07T12:00:00Z",
        }),
      }),
    );
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
    await page.goto("/actions");
    await expect(page.getByText("Erreur serveur scenarios")).toBeVisible();
  });
});
