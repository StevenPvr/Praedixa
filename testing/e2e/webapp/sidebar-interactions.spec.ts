import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

async function gotoDashboard(page: Page) {
  await page.goto("/dashboard");
  if (page.url().includes("/login")) {
    await setupAuth(page);
    await page.goto("/dashboard");
  }
}

test.describe("Sidebar interactions", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("shows expected top-level navigation links", async ({ page }) => {
    await gotoDashboard(page);
    const nav = page.getByLabel("Navigation principale");

    await expect(nav).toBeVisible();
    await expect(nav.locator('a[href="/dashboard"]').first()).toBeVisible();
    await expect(nav.locator('a[href="/previsions"]').first()).toBeVisible();
    await expect(nav.locator('a[href="/actions"]').first()).toBeVisible();
    await expect(nav.locator('a[href="/messages"]').first()).toBeVisible();
    await expect(nav.locator('a[href="/parametres"]').first()).toBeVisible();
  });

  test("active page has aria-current styling", async ({ page }) => {
    await page.goto("/previsions");

    const nav = page.getByLabel("Navigation principale");
    await expect(nav.locator('a[href="/previsions"]').first()).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(
      nav.locator('a[href="/dashboard"]').first(),
    ).not.toHaveAttribute("aria-current", "page");
  });

  test("sidebar brand is visible on desktop", async ({ page }) => {
    await gotoDashboard(page);
    await expect(page.locator("aside").getByText("Praedixa")).toBeVisible();
  });

  test("profile menu exposes account actions", async ({ page }) => {
    await gotoDashboard(page);

    await page
      .getByRole("button", { name: "Ouvrir le compte", exact: true })
      .click({
        force: true,
      });

    await expect(page.getByRole("menuitem", { name: "Accueil" })).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: "Reglages" }),
    ).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Support" })).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: "Se deconnecter" }),
    ).toBeVisible();
  });
});

test.describe("Sidebar mobile behavior", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("mobile hamburger opens and closes sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await gotoDashboard(page);

    const sidebarNav = page.getByLabel("Navigation principale");
    await expect(sidebarNav).not.toBeVisible();

    await page
      .getByRole("button", { name: "Ouvrir la navigation", exact: true })
      .click({ force: true });
    await expect(sidebarNav).toBeVisible();

    await page.evaluate(() => {
      const overlay = document.querySelector(
        '[data-testid="mobile-sidebar-overlay"]',
      );
      overlay?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await expect(sidebarNav).not.toBeVisible();
  });
});
