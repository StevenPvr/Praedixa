import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

test.describe("Sidebar interactions", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("shows expected top-level navigation links", async ({ page }) => {
    await page.goto("/dashboard");
    const nav = page.getByLabel("Navigation principale");
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "War room" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Donnees" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Anticipation" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Traitement" })).toBeVisible();
  });

  test("active page has aria-current styling", async ({ page }) => {
    await page.goto("/donnees");
    const nav = page.getByLabel("Navigation principale");
    await expect(nav.getByRole("link", { name: "Donnees" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(
      nav.getByRole("link", { name: "War room" }),
    ).not.toHaveAttribute("aria-current", "page");
  });

  test("collapse button toggles sidebar state on desktop", async ({ page }) => {
    await page.goto("/dashboard");
    const collapseBtn = page.getByLabel("Reduire le menu");
    await expect(collapseBtn).toBeVisible();
    await page.evaluate(() =>
      document.querySelector("nextjs-portal")?.remove(),
    );
    await collapseBtn.click();
    await expect(page.getByLabel("Agrandir le menu")).toBeVisible();
  });

  test("collapsed sidebar hides text labels", async ({ page }) => {
    await page.goto("/dashboard");
    const nav = page.getByLabel("Navigation principale");
    await expect(nav.getByText("War room")).toBeVisible();

    await page.evaluate(() =>
      document.querySelector("nextjs-portal")?.remove(),
    );
    await page.getByLabel("Reduire le menu").click();

    await expect(nav.getByText("War room")).not.toBeVisible();
    await expect(page.locator("aside").getByText("Praedixa")).not.toBeVisible();
  });

  test("bottom links include Rapports and hide admin-only settings by default", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    const sidebar = page.locator("aside");
    await expect(sidebar.getByRole("link", { name: "Rapports" })).toBeVisible();
    await expect(
      sidebar.getByRole("link", { name: "Reglages" }),
    ).not.toBeVisible();
  });
});

test.describe("Sidebar mobile behavior", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("mobile hamburger opens and closes sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "War room operationnelle" }),
    ).toBeVisible();

    const sidebar = page.locator("aside");
    await expect(sidebar).not.toBeVisible();

    await page.getByLabel("Ouvrir le menu").click();
    await expect(sidebar).toBeVisible();

    const backdrop = page.locator("[aria-hidden='true']").first();
    await backdrop.click({ position: { x: 350, y: 300 } });
    await expect(sidebar).not.toBeVisible();
  });

  test("clicking overlay backdrop closes mobile sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");
    await page.getByLabel("Ouvrir le menu").click();
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible();
    await page
      .locator("[aria-hidden='true']")
      .first()
      .click({
        position: { x: 350, y: 300 },
      });
    await expect(sidebar).not.toBeVisible();
  });
});
