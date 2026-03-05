import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

test.describe("Removed rapports routes", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("/rapports returns not-found page", async ({ page }) => {
    await page.goto("/rapports", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText("Page introuvable")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Retour au tableau de bord" }),
    ).toBeVisible();
  });

  test("legacy nested rapports route returns not-found", async ({ page }) => {
    await page.goto("/rapports/precision", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Page introuvable")).toBeVisible();
  });
});
