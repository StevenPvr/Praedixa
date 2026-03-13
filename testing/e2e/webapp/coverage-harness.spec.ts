import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

test.describe("Webapp coverage harness", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("coverage harness route redirects authenticated users to dashboard", async ({
    page,
  }) => {
    await page.goto("/coverage-harness");

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Priorites du jour" }),
    ).toBeVisible();
  });
});
