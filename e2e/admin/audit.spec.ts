import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";
import {
  mockAuditApis,
  mockAuditApisEmpty,
  mockAuditApisError,
  MOCK_AUDIT_ENTRIES,
} from "./fixtures/api-mocks";

test.describe("Audit page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminAuth(page);
  });

  test("displays page title and entry count", async ({ page }) => {
    await mockAuditApis(page);
    await page.goto("/audit");

    await expect(
      page.getByRole("heading", { name: /journal d'audit/i }),
    ).toBeVisible();
    await expect(
      page.getByText(`${MOCK_AUDIT_ENTRIES.length} entrees`),
    ).toBeVisible();
  });

  test("displays table headers", async ({ page }) => {
    await mockAuditApis(page);
    await page.goto("/audit");

    await expect(
      page.getByRole("heading", { name: /journal d'audit/i }),
    ).toBeVisible();

    const expectedHeaders = [
      "Date",
      "Action",
      "Severite",
      "Ressource",
      "IP",
      "Request ID",
    ];
    for (const header of expectedHeaders) {
      await expect(
        page.getByRole("columnheader", { name: header }),
      ).toBeVisible();
    }
  });

  test("renders audit log data in the table", async ({ page }) => {
    await mockAuditApis(page);
    await page.goto("/audit");

    // Wait for data
    await expect(
      page.getByRole("heading", { name: /journal d'audit/i }),
    ).toBeVisible();

    // First entry: action = view_org -> "Consultation organisation"
    await expect(
      page.locator("table").getByText("Consultation organisation"),
    ).toBeVisible();
    // IP address of first entry
    await expect(page.getByText("192.168.1.1")).toBeVisible();

    // Second entry: action = suspend_org -> "Suspension organisation"
    await expect(
      page.locator("table").getByText("Suspension organisation"),
    ).toBeVisible();
    await expect(page.getByText("10.0.0.1")).toBeVisible();

    // Request ID truncated to 8 chars
    await expect(
      page
        .getByText(MOCK_AUDIT_ENTRIES[0].requestId.substring(0, 8) + "...")
        .first(),
    ).toBeVisible();
  });

  test("shows action filter dropdown with all options", async ({ page }) => {
    await mockAuditApis(page);
    await page.goto("/audit");

    const select = page.locator("select");
    await expect(select).toBeVisible();

    // Default option
    await expect(
      select.getByRole("option", { name: "Toutes les actions" }),
    ).toBeAttached();

    // Some specific action labels
    await expect(
      select.getByRole("option", { name: "Consultation organisation" }),
    ).toBeAttached();
    await expect(
      select.getByRole("option", { name: "Suspension organisation" }),
    ).toBeAttached();
    await expect(
      select.getByRole("option", { name: "Changement plan" }),
    ).toBeAttached();
  });

  test("filters by action when selecting from dropdown", async ({ page }) => {
    // Track requested URLs to verify query params
    const requestedUrls: string[] = [];
    await page.route("**/api/v1/admin/audit-log*", (route) => {
      requestedUrls.push(route.request().url());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: MOCK_AUDIT_ENTRIES,
          pagination: {
            total: 2,
            page: 1,
            pageSize: 30,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
          timestamp: "2026-02-07T12:00:00Z",
        }),
      });
    });

    await page.goto("/audit");
    await expect(
      page.getByRole("heading", { name: /journal d'audit/i }),
    ).toBeVisible();

    // Select a filter
    await page.locator("select").selectOption("view_org");

    // Wait for refetch
    await page.waitForTimeout(500);

    // Verify that the filter was applied in the URL
    const filteredRequest = requestedUrls.find((url) =>
      url.includes("action=view_org"),
    );
    expect(filteredRequest).toBeTruthy();
  });

  test("shows error fallback on API failure", async ({ page }) => {
    await mockAuditApisError(page);
    await page.goto("/audit");

    await expect(page.getByText("Erreur de chargement")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /reessayer/i }),
    ).toBeVisible();
  });

  test("shows empty table when no entries", async ({ page }) => {
    await mockAuditApisEmpty(page);
    await page.goto("/audit");

    await expect(
      page.getByRole("heading", { name: /journal d'audit/i }),
    ).toBeVisible();
    await expect(page.getByText("0 entrees")).toBeVisible();
  });
});
