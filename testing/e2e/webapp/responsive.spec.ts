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
    await expect(nav.getByText("Accueil")).toBeVisible();
    await expect(nav.getByText("Donnees")).toBeVisible();
    await expect(nav.getByText("Previsions")).toBeVisible();
  });

  test("mobile touch targets are at least 40px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");

    // The hamburger button itself should have min 40px touch target (h-10 w-10)
    const menuButton = page.getByRole("button", { name: "Ouvrir le menu" });
    await expect(menuButton).toBeVisible();
    const box = await menuButton.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(40);
      expect(box.height).toBeGreaterThanOrEqual(40);
    }
  });

  test("content is readable at mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");

    // Page title should be visible
    await expect(page.getByRole("heading", { name: "Accueil" })).toBeVisible();

    // KPI section should be visible
    const kpiSection = page.getByLabel("Indicateurs cles");
    await expect(kpiSection).toBeVisible();

    // Next action section should be visible
    const alertsSection = page.getByLabel("Prochaine action recommandee");
    await expect(alertsSection).toBeVisible();

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

    const heatmapSection = page.getByLabel("Prevision de capacite");
    await expect(heatmapSection).toBeVisible();
  });

  test("scenario comparison section is visible on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");

    const costSection = page.getByLabel("Comparaison des scenarios");
    await expect(costSection).toBeVisible();
  });
});
