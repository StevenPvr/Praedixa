import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";

/**
 * Catch-all mock that returns empty paginated responses for all API calls.
 * This prevents pages from failing when they try to fetch data during
 * navigation tests.
 */
async function mockAllApis(page: import("@playwright/test").Page) {
  await page.route("**/api/v1/**", (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: [],
        pagination: {
          total: 0,
          page: 1,
          pageSize: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        timestamp: "2026-02-07T12:00:00Z",
      }),
    });
  });
}

test.describe("Sidebar navigation", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminAuth(page);
    await mockAllApis(page);
  });

  test("sidebar has 4 nav items", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator('nav[aria-label="Navigation admin"]');
    await expect(nav.getByText("Accueil")).toBeVisible();
    await expect(nav.getByText("Clients")).toBeVisible();
    await expect(nav.getByText("Journal")).toBeVisible();
    await expect(nav.getByText("Parametres")).toBeVisible();
  });

  test("logo Praedixa and Admin badge visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Praedixa")).toBeVisible();
    await expect(page.getByText("Admin")).toBeVisible();
  });

  test("navigate to / shows Accueil heading", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Accueil" })).toBeVisible();
  });

  test("navigate to /clients shows Clients heading", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator('nav[aria-label="Navigation admin"]');
    await nav.getByText("Clients").click();
    await expect(page.getByRole("heading", { name: "Clients" })).toBeVisible();
  });

  test("navigate to /journal shows Journal heading", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator('nav[aria-label="Navigation admin"]');
    await nav.getByText("Journal").click();
    await expect(page.getByRole("heading", { name: "Journal" })).toBeVisible();
  });

  test("navigate to /parametres shows Parametres heading", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator('nav[aria-label="Navigation admin"]');
    await nav.getByText("Parametres").click();
    await expect(
      page.getByRole("heading", { name: "Parametres" }),
    ).toBeVisible();
  });

  test("active item has aria-current=page", async ({ page }) => {
    await page.goto("/clients");
    const nav = page.locator('nav[aria-label="Navigation admin"]');
    const clientsLink = nav.getByRole("link", { name: "Clients" });
    await expect(clientsLink).toHaveAttribute("aria-current", "page");
  });
});
