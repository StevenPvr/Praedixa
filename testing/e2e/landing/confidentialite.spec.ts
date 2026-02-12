import { test, expect } from "@playwright/test";

test.describe("Confidentialite page", () => {
  test("displays page title", async ({ page }) => {
    await page.goto("/confidentialite");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "confidentialit",
    );
  });

  test("has back link to home", async ({ page }) => {
    await page.goto("/confidentialite");
    const backLink = page.getByRole("link", { name: /retour à l'accueil/i });
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute("href", "/");
  });

  test("displays privacy sections", async ({ page }) => {
    await page.goto("/confidentialite");
    await expect(
      page.getByRole("heading", { name: /Responsable/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Donn.*es collect/ }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /Finalit/ })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Vos droits/ }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /Cookies/ })).toBeVisible();
  });

  test("displays contact email for exercising rights", async ({ page }) => {
    await page.goto("/confidentialite");
    await expect(page.getByText(/contact/i).first()).toBeVisible();
  });

  test("mentions CNIL", async ({ page }) => {
    await page.goto("/confidentialite");
    await expect(page.getByText(/CNIL/)).toBeVisible();
  });
});
