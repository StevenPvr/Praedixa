import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";
import {
  mockConfigApis,
  mockCatchAll,
  TEST_ORG_ID,
} from "./fixtures/workspace-mocks";

test.describe("Config tab (workspace)", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminAuth(page);
    await mockConfigApis(page);
    await mockCatchAll(page);
  });

  test("renders the Configuration heading", async ({ page }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/config`);

    await expect(
      page.getByRole("heading", { name: "Configuration" }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("displays cost parameters section", async ({ page }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/config`);

    await expect(page.getByText("Parametres de cout")).toBeVisible({
      timeout: 10000,
    });
  });

  test("displays proof packs section", async ({ page }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/config`);

    await expect(page.getByText("Packs de preuves")).toBeVisible({
      timeout: 10000,
    });
  });
});
