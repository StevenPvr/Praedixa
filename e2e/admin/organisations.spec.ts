import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";
import {
  mockOrganisationsApis,
  mockOrganisationsApisEmpty,
  mockOrganisationsApisError,
  MOCK_ORG_LIST,
} from "./fixtures/api-mocks";

test.describe("Organisations page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminAuth(page);
  });

  test("displays page title and organisation count", async ({ page }) => {
    await mockOrganisationsApis(page);
    await page.goto("/organisations");

    await expect(
      page.getByRole("heading", { name: "Organisations", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(`${MOCK_ORG_LIST.length} organisations au total`),
    ).toBeVisible();
  });

  test("displays 'Nouvelle organisation' button", async ({ page }) => {
    await mockOrganisationsApis(page);
    await page.goto("/organisations");

    await expect(
      page.getByRole("button", { name: /nouvelle organisation/i }),
    ).toBeVisible();
  });

  test("displays table headers", async ({ page }) => {
    await mockOrganisationsApis(page);
    await page.goto("/organisations");

    await expect(
      page.getByRole("heading", { name: "Organisations", exact: true }),
    ).toBeVisible();

    const expectedHeaders = [
      "Organisation",
      "Statut",
      "Plan",
      "Utilisateurs",
      "Sites",
      "Contact",
    ];
    for (const header of expectedHeaders) {
      await expect(
        page.getByRole("columnheader", { name: header }),
      ).toBeVisible();
    }
  });

  test("renders organisation data in the table", async ({ page }) => {
    await mockOrganisationsApis(page);
    await page.goto("/organisations");

    // Wait for data
    await expect(
      page.getByRole("heading", { name: "Organisations", exact: true }),
    ).toBeVisible();

    // First org name and slug
    await expect(page.getByText(MOCK_ORG_LIST[0].name)).toBeVisible();
    await expect(page.getByText(MOCK_ORG_LIST[0].slug, { exact: true })).toBeVisible();
    await expect(
      page.getByText(MOCK_ORG_LIST[0].contactEmail),
    ).toBeVisible();

    // Second org
    await expect(page.getByText(MOCK_ORG_LIST[1].name)).toBeVisible();

    // Third org
    await expect(page.getByText(MOCK_ORG_LIST[2].name)).toBeVisible();
  });

  test("has search input and filter dropdowns", async ({ page }) => {
    await mockOrganisationsApis(page);
    await page.goto("/organisations");

    // Search input
    await expect(
      page.getByPlaceholder("Rechercher par nom..."),
    ).toBeVisible();

    // Status filter
    const selects = page.locator("select");
    await expect(selects).toHaveCount(2);

    // First select = status filter
    const statusSelect = selects.nth(0);
    await expect(
      statusSelect.getByRole("option", { name: "Tous les statuts" }),
    ).toBeAttached();
    await expect(
      statusSelect.getByRole("option", { name: "Actif" }),
    ).toBeAttached();
    await expect(
      statusSelect.getByRole("option", { name: "Suspendu" }),
    ).toBeAttached();

    // Second select = plan filter
    const planSelect = selects.nth(1);
    await expect(
      planSelect.getByRole("option", { name: "Tous les plans" }),
    ).toBeAttached();
    await expect(
      planSelect.getByRole("option", { name: "Enterprise" }),
    ).toBeAttached();
  });

  test("search input triggers re-fetch", async ({ page }) => {
    const requestedUrls: string[] = [];
    await page.route("**/api/v1/admin/organizations*", (route) => {
      requestedUrls.push(route.request().url());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: MOCK_ORG_LIST,
          pagination: {
            total: 3,
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

    await page.goto("/organisations");
    await expect(
      page.getByRole("heading", { name: "Organisations", exact: true }),
    ).toBeVisible();

    await page.getByPlaceholder("Rechercher par nom...").fill("Global");
    await page.waitForTimeout(500);

    const searchRequest = requestedUrls.find((url) =>
      url.includes("search=Global"),
    );
    expect(searchRequest).toBeTruthy();
  });

  test("status filter triggers re-fetch", async ({ page }) => {
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

    await page.goto("/organisations");
    await expect(
      page.getByRole("heading", { name: "Organisations", exact: true }),
    ).toBeVisible();

    // Select the first (status) dropdown
    await page.locator("select").nth(0).selectOption("suspended");
    await page.waitForTimeout(500);

    const statusRequest = requestedUrls.find((url) =>
      url.includes("status=suspended"),
    );
    expect(statusRequest).toBeTruthy();
  });

  test("plan filter triggers re-fetch", async ({ page }) => {
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

    await page.goto("/organisations");
    await expect(
      page.getByRole("heading", { name: "Organisations", exact: true }),
    ).toBeVisible();

    // Select the second (plan) dropdown
    await page.locator("select").nth(1).selectOption("enterprise");
    await page.waitForTimeout(500);

    const planRequest = requestedUrls.find((url) =>
      url.includes("plan=enterprise"),
    );
    expect(planRequest).toBeTruthy();
  });

  test("shows error fallback on API failure", async ({ page }) => {
    await mockOrganisationsApisError(page);
    await page.goto("/organisations");

    await expect(page.getByText("Erreur de chargement")).toBeVisible();
    await expect(page.getByRole("button", { name: /reessayer/i })).toBeVisible();
  });

  test("shows empty state when no organisations", async ({ page }) => {
    await mockOrganisationsApisEmpty(page);
    await page.goto("/organisations");

    await expect(
      page.getByRole("heading", { name: "Organisations", exact: true }),
    ).toBeVisible();
    // Singular because total = 0 which is !== 1 -> "s"
    await expect(page.getByText("0 organisations au total")).toBeVisible();
  });

  test("singular text when total is 1", async ({ page }) => {
    await page.route("**/api/v1/admin/organizations*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [MOCK_ORG_LIST[0]],
          pagination: {
            total: 1,
            page: 1,
            pageSize: 20,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
          timestamp: "2026-02-07T12:00:00Z",
        }),
      }),
    );

    await page.goto("/organisations");
    await expect(page.getByText("1 organisation au total")).toBeVisible();
  });
});
