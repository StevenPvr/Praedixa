import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

test.describe("Removed rapports routes", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("/rapports redirects authenticated users to dashboard", async ({
    page,
  }) => {
    await page.goto("/rapports", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Priorites du jour" }),
    ).toBeVisible();
  });

  test("legacy nested rapports route redirects to dashboard", async ({
    page,
  }) => {
    await page.goto("/rapports/precision", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Priorites du jour" }),
    ).toBeVisible();
  });
});
