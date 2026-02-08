import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

test.describe("Sidebar interactions", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("accordion expand/collapse toggles sub-items visibility", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    const nav = page.getByLabel("Navigation principale");
    await expect(nav).toBeVisible();

    // "Donnees" has children — click to expand
    await nav.getByText("Donnees", { exact: true }).click();

    // Sub-items should now be visible
    await expect(nav.getByText("Sites & Departements")).toBeVisible();
    await expect(nav.getByText("Datasets")).toBeVisible();
    await expect(nav.getByText("Donnees canoniques")).toBeVisible();

    // Click again to collapse
    await nav.getByText("Donnees", { exact: true }).click();

    // Sub-items should be hidden
    await expect(nav.getByText("Sites & Departements")).not.toBeVisible();
    await expect(nav.getByText("Datasets")).not.toBeVisible();
  });

  test("multiple accordion sections can be expanded simultaneously", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    const nav = page.getByLabel("Navigation principale");

    // Expand Donnees
    await nav.getByText("Donnees", { exact: true }).click();
    await expect(nav.getByText("Sites & Departements")).toBeVisible();

    // Expand Previsions (both should stay open)
    await nav.getByText("Previsions", { exact: true }).click();
    await expect(nav.getByText("Heatmap couverture")).toBeVisible();
    await expect(nav.getByText("Alertes couverture")).toBeVisible();

    // Donnees sub-items should still be visible
    await expect(nav.getByText("Sites & Departements")).toBeVisible();
  });

  test("section containing current path is auto-expanded", async ({ page }) => {
    // Navigate to /donnees — the Donnees section should auto-expand
    await page.goto("/donnees");

    const nav = page.getByLabel("Navigation principale");

    // Sub-items under Donnees should be visible since current path matches
    await expect(nav.getByText("Sites & Departements")).toBeVisible();
    await expect(nav.getByText("Datasets")).toBeVisible();
    await expect(nav.getByText("Donnees canoniques")).toBeVisible();
  });

  test("sub-item for current path has active styling", async ({ page }) => {
    await page.goto("/donnees");

    const nav = page.getByLabel("Navigation principale");

    // The "Sites & Departements" sub-item should have aria-current
    const subItem = nav.getByRole("link", { name: "Sites & Departements" });
    await expect(subItem).toHaveAttribute("aria-current", "page");
  });

  test("collapse button toggles sidebar width on desktop", async ({ page }) => {
    await page.goto("/dashboard");

    // Find the collapse toggle button
    const collapseBtn = page.getByLabel("Reduire le menu");
    await expect(collapseBtn).toBeVisible();

    // Click to collapse
    await page.evaluate(() =>
      document.querySelector("nextjs-portal")?.remove(),
    );
    await collapseBtn.click();

    // After collapse, button label changes
    const expandBtn = page.getByLabel("Agrandir le menu");
    await expect(expandBtn).toBeVisible();

    // Click to expand back
    await page.evaluate(() =>
      document.querySelector("nextjs-portal")?.remove(),
    );
    await expandBtn.click();
    await expect(page.getByLabel("Reduire le menu")).toBeVisible();
  });

  test("collapsed sidebar hides nav labels", async ({ page }) => {
    await page.goto("/dashboard");

    const nav = page.getByLabel("Navigation principale");

    // Before collapse, text labels are visible
    await expect(nav.getByText("Dashboard")).toBeVisible();

    // Collapse sidebar
    await page.evaluate(() =>
      document.querySelector("nextjs-portal")?.remove(),
    );
    await page.getByLabel("Reduire le menu").click();

    // Labels should be hidden, but icons remain (sidebar still visible)
    await expect(nav.getByText("Dashboard")).not.toBeVisible();
    // The Praedixa brand text should be hidden too
    await expect(page.locator("aside").getByText("Praedixa")).not.toBeVisible();
  });

  test("Decisions accordion expand shows sub-items", async ({ page }) => {
    await page.goto("/dashboard");

    const nav = page.getByLabel("Navigation principale");

    // Expand Decisions
    await nav.getByText("Decisions", { exact: true }).click();
    await expect(nav.getByText("Journal")).toBeVisible();
    await expect(nav.getByText("Statistiques")).toBeVisible();
  });

  test("Arbitrage accordion expand shows sub-items", async ({ page }) => {
    await page.goto("/dashboard");

    const nav = page.getByLabel("Navigation principale");

    // Expand Arbitrage
    await nav.getByText("Arbitrage", { exact: true }).click();
    await expect(nav.getByText("Scenarios")).toBeVisible();
    await expect(nav.getByText("Historique")).toBeVisible();
  });

  test("Parametres link is visible for admin users", async ({ page }) => {
    await page.goto("/dashboard");

    // Parametres is in BOTTOM_ITEMS with adminOnly=true
    // userRole is "admin" in the layout, so it should be visible
    const sidebar = page.locator("aside");
    await expect(sidebar.getByText("Parametres")).toBeVisible();
  });
});

test.describe("Sidebar mobile behavior", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("mobile hamburger opens and closes sidebar", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();

    // Sidebar should be hidden on mobile
    const sidebar = page.locator("aside");
    await expect(sidebar).not.toBeVisible();

    // Click hamburger to open
    await page.getByLabel("Ouvrir le menu").click();

    // Sidebar should now be visible
    await expect(sidebar).toBeVisible();

    // Close sidebar by clicking the backdrop overlay (header button is behind sidebar z-40)
    const backdrop = page.locator("[aria-hidden='true']").first();
    await backdrop.click({ position: { x: 350, y: 300 } });
    await expect(sidebar).not.toBeVisible();
  });

  test("clicking overlay backdrop closes mobile sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto("/dashboard");

    // Open mobile sidebar
    await page.getByLabel("Ouvrir le menu").click();
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible();

    // Click the backdrop overlay
    const backdrop = page.locator("[aria-hidden='true']").first();
    await backdrop.click({ position: { x: 350, y: 300 } });

    // Sidebar should close
    await expect(sidebar).not.toBeVisible();
  });
});
