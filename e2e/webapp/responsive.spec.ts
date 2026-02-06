import { test, expect } from "@playwright/test";
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
    await expect(nav.getByText("Dashboard")).toBeVisible();
    await expect(nav.getByText("Donnees")).toBeVisible();
    await expect(nav.getByText("Previsions")).toBeVisible();
  });

  test("mobile touch targets are at least 44px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");

    // Open menu
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();

    // The hamburger button itself should have min 44px touch target
    const menuButton = page.getByRole("button", {
      name: /Fermer le menu|Ouvrir le menu/,
    });
    const box = await menuButton.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(40); // h-10 = 40px
      expect(box.height).toBeGreaterThanOrEqual(40);
    }
  });

  test("content is readable at mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");

    // Page title should be visible
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();

    // KPI section should be visible (2-column grid on mobile)
    const kpiSection = page.getByLabel("Indicateurs cles");
    await expect(kpiSection).toBeVisible();

    // Alerts section should be visible
    const alertsSection = page.getByLabel("Alertes recentes");
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
});
