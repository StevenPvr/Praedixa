import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";

test.describe("Admin coverage harness", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminAuth(page);
  });

  test("executes harness branches", async ({ page }) => {
    await page.goto("/coverage-harness");

    await expect(
      page.getByRole("heading", { name: "Coverage Harness Admin" }),
    ).toBeVisible();
    await expect(page.locator("#endpoints-count")).toHaveText("43");
    await expect(page.locator("#endpoint-sample")).toContainText(
      "/api/v1/admin/monitoring/platform",
    );
  });
});
