import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";
import {
  mockAlertesApis,
  mockCatchAll,
  TEST_ORG_ID,
} from "./fixtures/workspace-mocks";

test.describe("Alertes tab (workspace)", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminAuth(page);
    await mockCatchAll(page);
    await mockAlertesApis(page);
  });

  test("renders the Alertes heading", async ({ page }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/alertes`);

    await expect(page.getByRole("heading", { name: "Alertes" })).toBeVisible({
      timeout: 10000,
    });
  });

  test("displays summary stat cards", async ({ page }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/alertes`);

    await expect(page.getByText("Critiques")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Avertissements")).toBeVisible();
    await expect(page.getByText("Informations")).toBeVisible();
  });

  test("displays alert data in table", async ({ page }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/alertes`);

    // Verify table columns are present
    await expect(page.getByText("Severite")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Statut")).toBeVisible();
  });
});
