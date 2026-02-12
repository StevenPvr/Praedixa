import { test, expect } from "@playwright/test";

test.describe("CGU page", () => {
  test("displays page title", async ({ page }) => {
    await page.goto("/cgu");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Conditions",
    );
  });

  test("has back link to home", async ({ page }) => {
    await page.goto("/cgu");
    const backLink = page.getByRole("link", { name: /retour à l'accueil/i });
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute("href", "/");
  });

  test("displays section headings", async ({ page }) => {
    await page.goto("/cgu");
    await expect(page.getByRole("heading", { name: /Objet/ })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /finitions/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Programme Entreprise/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Acc.*Service/ }),
    ).toBeVisible();
  });

  test("contains links to other legal pages", async ({ page }) => {
    await page.goto("/cgu");
    await expect(page.getByRole("link", { name: /mentions/ })).toHaveAttribute(
      "href",
      "/mentions-legales",
    );
    await expect(
      page.getByRole("link", { name: /confidentialit/ }),
    ).toHaveAttribute("href", "/confidentialite");
  });

  test("displays contact email", async ({ page }) => {
    await page.goto("/cgu");
    await expect(page.getByText(/contact/i).last()).toBeVisible();
  });
});
