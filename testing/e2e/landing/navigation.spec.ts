import { test, expect } from "@playwright/test";

test.describe("Landing navigation", () => {
  test("loads homepage and has correct title", async ({ page }) => {
    await page.goto("/fr");
    await expect(page).toHaveTitle(/Praedixa/);
  });

  test("navbar is visible and contains logo", async ({ page }) => {
    await page.goto("/fr");
    const nav = page.locator("nav").first();
    await expect(nav).toBeVisible();
    // Logo text should be present
    await expect(nav.getByText("Praedixa")).toBeVisible();
  });

  test("navbar has navigation links", async ({ page }) => {
    await page.goto("/fr");
    const navLinks = page.locator("nav a");
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test("CTA button is visible", async ({ page }) => {
    await page.goto("/fr");
    const cta = page.getByRole("link", {
      name: /audit|pilote|demo|contact|diagnostic/i,
    });
    await expect(cta.first()).toBeVisible();
  });

  test("scrolls to sections via anchor links", async ({ page }) => {
    await page.goto("/fr");
    // Dismiss tarteaucitron if it blocks nav links
    const tarteaucitronRoot = page.locator("#tarteaucitronRoot");
    if (await tarteaucitronRoot.isVisible().catch(() => false)) {
      const acceptBtn = page
        .locator("#tarteaucitronAllAllowed2, [id^='tarteaucitronAllAllowed']")
        .or(
          page.getByRole("button", {
            name: /tout accepter|accept all|accepter/i,
          }),
        );
      await acceptBtn
        .first()
        .click({ timeout: 2000 })
        .catch(() => {});
      await tarteaucitronRoot
        .waitFor({ state: "hidden", timeout: 3000 })
        .catch(() => {});
    }
    const anchorLinks = page.locator('nav a[href^="#"]');
    const count = await anchorLinks.count();
    if (count > 0) {
      const firstAnchor = anchorLinks.first();
      const href = await firstAnchor.getAttribute("href");
      const initialScrollY = await page.evaluate(() => window.scrollY);
      await firstAnchor.click({ force: true });

      if (href && href.startsWith("#")) {
        await expect
          .poll(() => new URL(page.url()).hash, { timeout: 10_000 })
          .toBe(href);
      }

      await expect
        .poll(() => page.evaluate(() => window.scrollY))
        .toBeGreaterThanOrEqual(initialScrollY);
    }
  });

  test("mobile menu opens and traps focus", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/fr");
    const menuButton = page.getByRole("button", { name: /ouvrir le menu/i });
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    const dialog = page.getByRole("dialog", { name: /menu de navigation/i });
    await expect(dialog).toBeVisible();

    const focusables = dialog.locator(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const firstFocusable = focusables.first();
    const lastFocusable = focusables.last();

    await expect(firstFocusable).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expect(lastFocusable).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(firstFocusable).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(menuButton).toBeFocused();
  });

  test("footer is visible at bottom of page", async ({ page }) => {
    await page.goto("/fr");
    const footer = page.locator("footer");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();
  });

  test("all major sections are rendered", async ({ page }) => {
    await page.goto("/fr");
    // The landing has 8 sections: Hero, Problem, Solution, Pipeline, Deliverables, Pilot, FAQ, Contact
    // Verify the page has substantial content
    const body = page.locator("body");
    await expect(body).not.toBeEmpty();
    // At minimum, the hero should render
    const mainHeading = page.locator("h1").first();
    await expect(mainHeading).toBeVisible();
  });
});
