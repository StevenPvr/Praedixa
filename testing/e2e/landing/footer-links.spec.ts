import { test, expect } from "@playwright/test";

// Landing uses [locale] routing; Accept-Language: fr in playwright config redirects to /fr
const FR = "/fr";

test.describe("Footer legal links", () => {
  test("footer contains CGU link", async ({ page }) => {
    await page.goto("/fr");
    const footer = page.locator("footer");
    await expect(footer.getByRole("link", { name: "CGU" })).toHaveAttribute(
      "href",
      `${FR}/cgu`,
    );
  });

  test("footer contains Confidentialite link", async ({ page }) => {
    await page.goto("/fr");
    const footer = page.locator("footer");
    await expect(
      footer.getByRole("link", { name: /onfidentialit/ }),
    ).toHaveAttribute("href", `${FR}/confidentialite`);
  });

  test("footer contains Mentions legales link", async ({ page }) => {
    await page.goto("/fr");
    const footer = page.locator("footer");
    await expect(footer.getByRole("link", { name: /entions/ })).toHaveAttribute(
      "href",
      `${FR}/mentions-legales`,
    );
  });

  test("CGU link navigates to CGU page", async ({ page }) => {
    await page.goto("/fr");
    const footer = page.locator("footer");
    await footer.getByRole("link", { name: "CGU" }).click();
    await expect(page).toHaveURL(/\/fr\/cgu$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Conditions",
    );
  });

  test("Confidentialite link navigates to correct page", async ({ page }) => {
    await page.goto("/fr");
    const footer = page.locator("footer");
    await footer.getByRole("link", { name: /onfidentialit/ }).click();
    await expect(page).toHaveURL(/\/fr\/confidentialite$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "confidentialit",
    );
  });

  test("Mentions legales link navigates to correct page", async ({ page }) => {
    await page.goto("/fr");
    const footer = page.locator("footer");
    await footer.getByRole("link", { name: /entions/ }).click();
    await expect(page).toHaveURL(/\/fr\/mentions-legales$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Mentions",
    );
  });
});
