import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

test.describe("Removed donnees routes", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("/donnees redirects authenticated users to dashboard", async ({
    page,
  }) => {
    await page.goto("/donnees");

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Priorites du jour" }),
    ).toBeVisible();
  });

  test("nested legacy donnees route also redirects to dashboard", async ({
    page,
  }) => {
    await page.goto("/donnees/canonique");

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Priorites du jour" }),
    ).toBeVisible();
  });
});
