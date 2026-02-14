import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

test.describe("Responsive behavior", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("mobile viewport shows hamburger menu button", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");

    // On mobile, the sidebar is hidden and a hamburger button is visible
    const menuButton = page.getByRole("button", { name: "Ouvrir le menu" });
    await expect(menuButton).toBeVisible();
  });

  test("mobile hamburger opens sidebar overlay", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");

    // Open menu
    const menuButton = page.getByRole("button", { name: "Ouvrir le menu" });
    await menuButton.click();

    // Sidebar should now be visible with nav items
    const nav = page.getByLabel("Navigation principale");
    await expect(nav).toBeVisible();

    // Should show navigation items
    await expect(nav.getByText("War room")).toBeVisible();
    await expect(nav.getByText("Donnees")).toBeVisible();
    await expect(nav.getByText("Anticipation")).toBeVisible();
  });

  test("mobile touch targets are at least 24px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");

    // Hamburger button should have usable touch target (WCAG 2.5.5 recommends 44px; current design uses ~24px)
    const menuButton = page.getByRole("button", { name: "Ouvrir le menu" });
    await expect(menuButton).toBeVisible();
    const box = await menuButton.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(24);
      expect(box.height).toBeGreaterThanOrEqual(24);
    }
  });

  test("content is readable at mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");

    // Page title should be visible
    await expect(
      page.getByRole("heading", { name: "War room operationnelle" }),
    ).toBeVisible();

    // KPI section should be visible
    await expect(page.getByText("Alertes ouvertes").first()).toBeVisible();

    // Next action section should be visible
    await expect(page.getByText("Priorites a traiter")).toBeVisible();

    // Verify nothing overflows horizontally
    const pageWidth = 375;
    const mainContent = page.locator("main");
    const mainBox = await mainContent.boundingBox();
    expect(mainBox).not.toBeNull();
    if (mainBox) {
      // Content should not exceed viewport width (with some tolerance for padding)
      expect(mainBox.width).toBeLessThanOrEqual(pageWidth);
    }
  });

  test("forecast section is visible on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");

    await expect(
      page.getByText("Pression capacitaire a 14 jours"),
    ).toBeVisible();
  });

  test("scenario comparison section is visible on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");

    await expect(page.getByText("Indice d'exposition immediate")).toBeVisible();
  });
});
