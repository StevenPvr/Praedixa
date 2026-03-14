import { test, expect } from "@playwright/test";

test.describe("CGU page", () => {
  test("displays page title", async ({ page }) => {
    await page.goto("/fr/cgu");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Conditions",
    );
  });

  test("has back link to home", async ({ page }) => {
    await page.goto("/fr/cgu");
    const backLink = page.getByRole("link", { name: /retour à l'accueil/i });
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute("href", "/fr");
  });

  test("displays section headings", async ({ page }) => {
    await page.goto("/fr/cgu");
    await expect(page.getByRole("heading", { name: /Objet/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Usage/ })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Offres publiques/ }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /Contact/ })).toBeVisible();
  });

  test("displays contact email", async ({ page }) => {
    await page.goto("/fr/cgu");
    await expect(page.getByText("hello@praedixa.com")).toBeVisible();
  });
});
