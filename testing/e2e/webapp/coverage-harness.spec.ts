import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

test.describe("Webapp coverage harness", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("coverage harness route falls back to not-found page", async ({
    page,
  }) => {
    await page.goto("/coverage-harness");

    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText("Page introuvable")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Retour au tableau de bord" }),
    ).toBeVisible();
  });
});
