import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";
import {
  mockFacturationApis,
  mockFacturationApisEmpty,
  mockFacturationApisError,
  MOCK_ORG_BILLING_LIST,
} from "./fixtures/api-mocks";

test.describe("Facturation page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminAuth(page);
  });

  test("displays page title and subtitle", async ({ page }) => {
    await mockFacturationApis(page);
    await page.goto("/facturation");

    await expect(
      page.getByRole("heading", { name: "Facturation", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Gestion des plans et facturation des organisations"),
    ).toBeVisible();
  });

  test("displays table headers", async ({ page }) => {
    await mockFacturationApis(page);
    await page.goto("/facturation");

    await expect(
      page.getByRole("heading", { name: "Facturation", exact: true }),
    ).toBeVisible();

    const expectedHeaders = [
      "Organisation",
      "Plan actuel",
      "Statut",
      "Utilisateurs",
      "Contact",
    ];
    for (const header of expectedHeaders) {
      await expect(
        page.getByRole("columnheader", { name: header }),
      ).toBeVisible();
    }
  });

  test("renders organisation billing data", async ({ page }) => {
    await mockFacturationApis(page);
    await page.goto("/facturation");

    // Wait for table to load
    await expect(
      page.getByRole("heading", { name: "Facturation", exact: true }),
    ).toBeVisible();

    // First org
    await expect(page.getByText(MOCK_ORG_BILLING_LIST[0].name)).toBeVisible();
    await expect(
      page.getByText(MOCK_ORG_BILLING_LIST[0].contactEmail),
    ).toBeVisible();

    // Second org
    await expect(page.getByText(MOCK_ORG_BILLING_LIST[1].name)).toBeVisible();
  });

  test("has search input and plan filter", async ({ page }) => {
    await mockFacturationApis(page);
    await page.goto("/facturation");

    // Search input
    await expect(page.getByPlaceholder("Rechercher...")).toBeVisible();

    // Plan filter dropdown
    const planSelect = page.locator("select");
    await expect(planSelect).toBeVisible();
    await expect(
      planSelect.getByRole("option", { name: "Tous les plans" }),
    ).toBeAttached();
    await expect(
      planSelect.getByRole("option", { name: "Free" }),
    ).toBeAttached();
    await expect(
      planSelect.getByRole("option", { name: "Enterprise" }),
    ).toBeAttached();
  });

  test("search input triggers re-fetch with query param", async ({ page }) => {
    const requestedUrls: string[] = [];
    await page.route("**/api/v1/admin/organizations*", (route) => {
      requestedUrls.push(route.request().url());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: MOCK_ORG_BILLING_LIST,
          pagination: {
            total: 2,
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

    await page.goto("/facturation");
    await expect(
      page.getByRole("heading", { name: "Facturation", exact: true }),
    ).toBeVisible();

    await page.getByPlaceholder("Rechercher...").fill("Acme");
    await page.waitForTimeout(500);

    const searchRequest = requestedUrls.find((url) =>
      url.includes("search=Acme"),
    );
    expect(searchRequest).toBeTruthy();
  });

  test("plan filter triggers re-fetch with query param", async ({ page }) => {
    const requestedUrls: string[] = [];
    await page.route("**/api/v1/admin/organizations*", (route) => {
      requestedUrls.push(route.request().url());
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

    await page.goto("/facturation");
    await expect(
      page.getByRole("heading", { name: "Facturation", exact: true }),
    ).toBeVisible();

    await page.locator("select").selectOption("enterprise");
    await page.waitForTimeout(500);

    const planRequest = requestedUrls.find((url) =>
      url.includes("plan=enterprise"),
    );
    expect(planRequest).toBeTruthy();
  });

  test("shows error fallback on API failure", async ({ page }) => {
    await mockFacturationApisError(page);
    await page.goto("/facturation");

    await expect(page.getByText("Erreur de chargement")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /reessayer/i }),
    ).toBeVisible();
  });

  test("shows empty table when no organisations", async ({ page }) => {
    await mockFacturationApisEmpty(page);
    await page.goto("/facturation");

    await expect(
      page.getByRole("heading", { name: "Facturation", exact: true }),
    ).toBeVisible();
  });
});
