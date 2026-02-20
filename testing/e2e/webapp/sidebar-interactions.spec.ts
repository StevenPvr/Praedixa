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
    await expect(nav.locator('a[href="/donnees"]').first()).toBeVisible();
    await expect(nav.locator('a[href="/previsions"]').first()).toBeVisible();
    await expect(nav.locator('a[href="/actions"]').first()).toBeVisible();
  });

  test("active page has aria-current styling", async ({ page }) => {
    await page.goto("/donnees");
    const nav = page.getByLabel("Navigation principale");
    await expect(nav.locator('a[href="/donnees"]').first()).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(
      nav.locator('a[href="/dashboard"]').first(),
    ).not.toHaveAttribute("aria-current", "page");
  });

  test("collapse button is interactive on desktop", async ({ page }) => {
    await gotoDashboard(page);
    const collapseBtn = page.getByLabel("Reduire le menu");
    await expect(collapseBtn).toBeVisible();
    await expect(collapseBtn).toBeEnabled();
    await page.evaluate(() =>
      document.querySelector("nextjs-portal")?.remove(),
    );
    await collapseBtn.click();
    await expect(page.getByLabel("Navigation principale")).toBeVisible();
  });

  test("sidebar labels are rendered on desktop", async ({ page }) => {
    await gotoDashboard(page);
    const nav = page.getByLabel("Navigation principale");
    await expect(nav.getByText("Tableau de bord").first()).toBeVisible();
    await expect(page.locator("aside").getByText("Praedixa")).toBeVisible();
  });

  test("bottom links include Rapports and settings for admin role", async ({
    page,
  }) => {
    await gotoDashboard(page);
    const sidebar = page.locator("aside");
    await expect(sidebar.getByRole("link", { name: "Rapports" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Reglages" })).toBeVisible();
  });

  test("profile menu exposes admin actions", async ({ page }) => {
    await gotoDashboard(page);
    await page
      .getByRole("button", { name: "Ouvrir le menu profil", exact: true })
      .click({ force: true });
    await expect(
      page.getByRole("menuitem", { name: "Tableau de bord" }),
    ).toBeVisible();
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
    await expect(
      page.getByRole("heading", { name: "War room operationnelle" }),
    ).toBeVisible();

    const sidebarNav = page.getByLabel("Navigation principale");
    await expect(sidebarNav).not.toBeVisible();

    await page
      .getByRole("button", { name: "Ouvrir le menu", exact: true })
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

  test("clicking overlay backdrop closes mobile sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await gotoDashboard(page);
    await page
      .getByRole("button", { name: "Ouvrir le menu", exact: true })
      .click({ force: true });
    const sidebarNav = page.getByLabel("Navigation principale");
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
