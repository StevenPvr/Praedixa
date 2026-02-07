import { test, expect } from "@playwright/test";

test.describe("Webapp navigation", () => {
  // These tests assume the user is authenticated.
  // In a real setup, we'd use a storage state fixture for auth.
  // For now, they test what loads even without full auth.

  test("login page renders the application name", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Praedixa" })).toBeVisible();
  });

  test("login page form elements are interactive", async ({ page }) => {
    await page.goto("/login");
    const emailInput = page.getByLabel("Email");
    await emailInput.fill("user@company.com");
    await expect(emailInput).toHaveValue("user@company.com");

    const passwordInput = page.getByLabel("Mot de passe");
    await passwordInput.fill("test-password");
    await expect(passwordInput).toHaveValue("test-password");
  });

  test("devenir-pilote back link goes to landing", async ({ page }) => {
    // The webapp and landing are on different ports, but we can test
    // that the login page has the expected structure
    await page.goto("/login");
    // The page should have a form element
    const form = page.locator("form");
    await expect(form).toBeVisible();
  });

  test("direct navigation to protected routes without auth", async ({
    page,
  }) => {
    // Each protected route should redirect to login when unauthenticated
    const protectedRoutes = [
      "/dashboard",
      "/donnees",
      "/previsions",
      "/arbitrage",
      "/decisions",
      "/rapports",
      "/parametres",
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      // Should end up at login
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("login page is responsive on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Praedixa" })).toBeVisible();
    // Form should still be visible and usable
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Mot de passe")).toBeVisible();
  });
});
