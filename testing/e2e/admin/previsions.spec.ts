import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";
import {
  mockPrevisionsApis,
  mockCatchAll,
  TEST_ORG_ID,
} from "./fixtures/workspace-mocks";

test.describe("Previsions tab", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminAuth(page);
    await mockPrevisionsApis(page);
    await mockCatchAll(page);
  });

  test("renders the Previsions heading", async ({ page }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/previsions`);

    await expect(page.getByRole("heading", { name: "Previsions" })).toBeVisible(
      { timeout: 10000 },
    );
  });

  test("displays scenarios section", async ({ page }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/previsions`);

    await expect(page.getByText("Scenarios")).toBeVisible({ timeout: 10000 });
  });

  test("shows scenario names from mock data", async ({ page }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/previsions`);

    await expect(page.getByText("Scenario base")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Scenario optimiste")).toBeVisible();
  });
});
