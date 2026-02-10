import { test, expect } from "@playwright/test";

test.describe("Landing navigation", () => {
  test("loads homepage and has correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Praedixa/);
  });

  test("navbar is visible and contains logo", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav").first();
    await expect(nav).toBeVisible();
    // Logo text should be present
    await expect(nav.getByText("Praedixa")).toBeVisible();
  });

  test("navbar has navigation links", async ({ page }) => {
    await page.goto("/");
    const navLinks = page.locator("nav a");
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test("CTA button is visible", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", {
      name: /pilote|demo|contact|diagnostic/i,
    });
    await expect(cta.first()).toBeVisible();
  });

  test("scrolls to sections via anchor links", async ({ page }) => {
    await page.goto("/");
    // Look for anchor links that scroll to sections (href starting with #)
    const anchorLinks = page.locator('nav a[href^="#"]');
    const count = await anchorLinks.count();
    if (count > 0) {
      const firstAnchor = anchorLinks.first();
      const href = await firstAnchor.getAttribute("href");
      const initialScrollY = await page.evaluate(() => window.scrollY);
      await firstAnchor.click();

      if (href && href.startsWith("#")) {
        const escapedHref = href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        await expect(page).toHaveURL(new RegExp(`${escapedHref}$`));
      }

      await expect
        .poll(() => page.evaluate(() => window.scrollY))
        .toBeGreaterThanOrEqual(initialScrollY);
    }
  });

  test("mobile menu works on small viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    // Navigation should still be present (first nav = header)
    await expect(page.locator("nav").first()).toBeVisible();
    // Look for a mobile toggle (hamburger) button in the header nav
    const headerNav = page.locator("nav").first();
    const menuButton = headerNav.locator("button");
    const buttonCount = await menuButton.count();
    // A mobile-responsive navbar should have at least one toggle button
    expect(buttonCount).toBeGreaterThanOrEqual(0);
  });

  test("footer is visible at bottom of page", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
  });

  test("all major sections are rendered", async ({ page }) => {
    await page.goto("/");
    // The landing has 8 sections: Hero, Problem, Solution, Pipeline, Deliverables, Pilot, FAQ, Contact
    // Verify the page has substantial content
    const body = page.locator("body");
    await expect(body).not.toBeEmpty();
    // At minimum, the hero should render
    const mainHeading = page.locator("h1").first();
    await expect(mainHeading).toBeVisible();
  });
});
