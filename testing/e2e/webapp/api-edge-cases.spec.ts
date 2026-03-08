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
    await expect(page).toHaveURL(
      /\/login\?reauth=1&reason=api_unauthorized/,
    );
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
    await expect(page).toHaveURL(
      /\/login\?reauth=1&reason=api_unauthorized/,
    );
  });
});
