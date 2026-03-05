import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

test.describe("Removed donnees routes", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("/donnees returns not-found page", async ({ page }) => {
    await page.goto("/donnees");

    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText("Page introuvable")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Retour au tableau de bord" }),
    ).toBeVisible();
  });

  test("nested legacy donnees route also returns not-found", async ({ page }) => {
    await page.goto("/donnees/canonique");

    await expect(page.getByText("Page introuvable")).toBeVisible();
  });
});
