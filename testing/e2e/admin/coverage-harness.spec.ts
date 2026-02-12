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

    const endpointCount = Number(
      (await page.locator("#endpoints-count").textContent()) ?? "0",
    );
    expect(endpointCount).toBeGreaterThan(0);

    await expect(page.locator("#endpoint-sample")).toContainText(
      "/api/v1/admin/monitoring/platform",
    );
  });
});
