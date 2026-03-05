import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

test.describe("API edge cases", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test("401 on live alerts redirects to login with reauth", async ({
    page,
  }) => {
    await mockAllApis(page);
    await page.route("**/api/v1/live/coverage-alerts*", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Token expired" },
        }),
      }),
    );

    await page.goto("/actions");
    await expect(page).toHaveURL(/\/login\?/);
    await expect(page).toHaveURL(/reauth=1/);
  });

  test("401 on forecasts endpoint redirects to login", async ({ page }) => {
    await mockAllApis(page);
    await page.route("**/api/v1/live/forecasts/latest/daily*", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Token expired" },
        }),
      }),
    );

    await page.goto("/previsions");
    await expect(page).toHaveURL(/\/login\?/);
    await expect(page).toHaveURL(/reauth=1/);
  });

  test("network error on forecasts shows retry control on previsions", async ({
    page,
  }) => {
    await mockAllApis(page);
    await page.route("**/api/v1/live/forecasts/latest/daily*", (route) =>
      route.abort("connectionrefused"),
    );

    await page.goto("/previsions");
    await expect(page.getByRole("button", { name: "Reessayer" })).toBeVisible();
  });

  test("server error on decision workspace is surfaced on actions", async ({
    page,
  }) => {
    await mockAllApis(page);
    await page.route("**/api/v1/**decision-workspace/*", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Erreur interne du serveur",
          },
        }),
      }),
    );

    await page.goto("/actions");
    await expect(page.getByText("Erreur interne du serveur")).toBeVisible();
  });

  test("removed routes return not-found page", async ({ page }) => {
    await mockAllApis(page);

    await page.goto("/donnees");
    await expect(page.getByText("Page introuvable")).toBeVisible();

    await page.goto("/rapports");
    await expect(page.getByText("Page introuvable")).toBeVisible();
  });
});
