import { test, expect } from "@playwright/test";

test.describe("Confidentialite page", () => {
  test("displays page title", async ({ page }) => {
    await page.goto("/fr/confidentialite");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "confidentialit",
    );
  });

  test("has back link to home", async ({ page }) => {
    await page.goto("/fr/confidentialite");
    const backLink = page.getByRole("link", { name: /retour à l'accueil/i });
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute("href", "/fr");
  });

  test("displays privacy sections", async ({ page }) => {
    await page.goto("/fr/confidentialite");
    await expect(
      page.getByRole("heading", { name: /Responsable/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Donn.*es collect/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Hébergement et sous-traitants/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Conservation/ }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /Droits/ })).toBeVisible();
  });

  test("displays contact email for exercising rights", async ({ page }) => {
    await page.goto("/fr/confidentialite");
    await expect(page.getByText(/hello@praedixa\.com/).first()).toBeVisible();
  });

  test("mentions RGPD", async ({ page }) => {
    await page.goto("/fr/confidentialite");
    await expect(page.getByText(/RGPD/)).toBeVisible();
  });
});
