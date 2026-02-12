import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";

/**
 * Route-level mocks that keep all admin pages stable for navigation-only checks.
 */
async function mockAllApis(page: import("@playwright/test").Page) {
  const timestamp = "2026-02-07T12:00:00Z";
  const apiResponse = (data: unknown) => ({ success: true, data, timestamp });
  const paginatedResponse = (data: unknown[]) => ({
    success: true,
    data,
    pagination: {
      total: data.length,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    timestamp,
  });

  await page.route("**/api/v1/**", (route) => {
    const { pathname } = new URL(route.request().url());

    if (pathname.startsWith("/api/v1/admin/monitoring/platform")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          apiResponse({
            totalOrganizations: 12,
            activeOrganizations: 10,
            totalUsers: 245,
            ingestionSuccessRate: 97.8,
            apiErrorRate: 0.3,
          }),
        ),
      });
    }

    if (pathname.startsWith("/api/v1/admin/monitoring/alerts/by-org")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          apiResponse({ organizations: [], totalAlerts: 0 }),
        ),
      });
    }

    if (pathname.startsWith("/api/v1/admin/monitoring/cost-params/missing")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(apiResponse({ organizations: [] })),
      });
    }

    if (pathname.startsWith("/api/v1/admin/monitoring/decisions/adoption")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(apiResponse({ organizations: [] })),
      });
    }

    if (pathname.startsWith("/api/v1/admin/conversations/unread-count")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(apiResponse({ total: 0, byOrg: [] })),
      });
    }

    if (pathname.startsWith("/api/v1/admin/audit-log")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(paginatedResponse([])),
      });
    }

    if (pathname.startsWith("/api/v1/admin/organizations")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(paginatedResponse([])),
      });
    }

    if (pathname.startsWith("/api/v1/admin/onboarding")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(paginatedResponse([])),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(apiResponse([])),
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
    await expect(
      nav.getByRole("link", { name: "Accueil", exact: true }).first(),
    ).toBeVisible();
    await expect(
      nav.getByRole("link", { name: "Clients", exact: true }).first(),
    ).toBeVisible();
    await expect(
      nav.getByRole("link", { name: "Journal", exact: true }).first(),
    ).toBeVisible();
    await expect(
      nav.getByRole("link", { name: "Parametres", exact: true }).first(),
    ).toBeVisible();
  });

  test("logo Praedixa and Admin badge visible", async ({ page }) => {
    await page.goto("/");
    const sidebar = page.locator("[data-sidebar]");
    await expect(sidebar.getByText("Praedixa", { exact: true })).toBeVisible();
    await expect(sidebar.getByText("Admin", { exact: true })).toBeVisible();
  });

  test("navigate to / shows Accueil heading", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Accueil", level: 1 }),
    ).toBeVisible();
  });

  test("navigate to /clients shows Clients heading", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator('nav[aria-label="Navigation admin"]');
    await nav.getByRole("link", { name: "Clients", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Clients", level: 1 }),
    ).toBeVisible();
  });

  test("navigate to /journal shows Journal heading", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator('nav[aria-label="Navigation admin"]');
    await nav.getByRole("link", { name: "Journal", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Journal", level: 1 }),
    ).toBeVisible();
  });

  test("navigate to /parametres shows Parametres heading", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator('nav[aria-label="Navigation admin"]');
    await nav.getByRole("link", { name: "Parametres", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Parametres", level: 1 }),
    ).toBeVisible();
  });

  test("active item has aria-current=page", async ({ page }) => {
    await page.goto("/clients");
    const nav = page.locator('nav[aria-label="Navigation admin"]');
    const clientsLink = nav.getByRole("link", { name: "Clients" });
    await expect(clientsLink).toHaveAttribute("aria-current", "page");
  });
});
