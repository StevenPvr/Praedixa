import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

test.describe("Webapp coverage harness", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("executes harness branches", async ({ page }) => {
    await page.goto("/coverage-harness");

    await expect(
      page.getByRole("heading", { name: "Coverage Harness Webapp" }),
    ).toBeVisible();
    await expect(page.locator("#decomposition-trend-count")).toHaveText("3");
    await expect(page.locator("#decomposition-empty-count")).toHaveText("0");
    await expect(page.locator("#drivers-count")).toHaveText("2");
    await expect(page.locator("#drivers-empty-count")).toHaveText("0");

    await expect(page.locator("#format-severity-known")).toHaveText("Critique");
    await expect(page.locator("#format-severity-unknown")).toHaveText(
      "unexpected",
    );
  });
});
