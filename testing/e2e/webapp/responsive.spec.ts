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

    await expect(
      page.getByRole("button", { name: "Ouvrir la navigation", exact: true }),
    ).toBeVisible();
  });

  test("mobile hamburger opens sidebar overlay", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");

    await page
      .getByRole("button", { name: "Ouvrir la navigation", exact: true })
      .click();

    const nav = page.getByLabel("Navigation principale");
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Accueil" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Previsions" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Actions" })).toBeVisible();
  });

  test("mobile touch targets are at least 24px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");

    const menuButton = page.getByRole("button", {
      name: "Ouvrir la navigation",
      exact: true,
    });
    await expect(menuButton).toBeVisible();
    const box = await menuButton.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(24);
      expect(box.height).toBeGreaterThanOrEqual(24);
    }
  });

  test("dashboard content remains readable at mobile width", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: "Priorites du jour" }),
    ).toBeVisible();
    await expect(page.getByText("Alertes ouvertes").first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Alertes prioritaires" }),
    ).toBeVisible();

    const mainBox = await page.locator("main").boundingBox();
    expect(mainBox).not.toBeNull();
    if (mainBox) {
      expect(mainBox.width).toBeLessThanOrEqual(375);
    }
  });
});
