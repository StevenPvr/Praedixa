import { test, expect } from "@playwright/test";

test.describe("Logo preview page", () => {
  test("displays logo variants", async ({ page }) => {
    await page.goto("/logo-preview");
    await expect(
      page.getByRole("heading", { level: 2, name: "Industrial" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Arrondi" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Minimal" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Géométrique" }),
    ).toBeVisible();
  });

  test("has interactive color controls", async ({ page }) => {
    await page.goto("/logo-preview");
    // Color selector buttons (6 colors: Ink, Amber, Blue, Emerald, Violet, White)
    const colorButtons = page.locator("button[title]");
    await expect(colorButtons).toHaveCount(6);
  });

  test("has size and stroke sliders", async ({ page }) => {
    await page.goto("/logo-preview");
    const sliders = page.locator('input[type="range"]');
    await expect(sliders).toHaveCount(2);
  });

  test("displays navbar preview section", async ({ page }) => {
    await page.goto("/logo-preview");
    await expect(
      page.getByRole("heading", { name: /Aper.*navbar/ }),
    ).toBeVisible();
  });

  test("displays small sizes test section", async ({ page }) => {
    await page.goto("/logo-preview");
    await expect(
      page.getByRole("heading", { name: /petites tailles/ }),
    ).toBeVisible();
  });
});
