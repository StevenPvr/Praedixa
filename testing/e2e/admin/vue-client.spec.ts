import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";
import {
  mockVueClientApis,
  mockCatchAll,
  TEST_ORG_ID,
} from "./fixtures/workspace-mocks";

test.describe("Vue client tab", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminAuth(page);
    await mockVueClientApis(page);
    await mockCatchAll(page);
  });

  test("renders the Vue client heading", async ({ page }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/vue-client`);

    await expect(page.getByRole("heading", { name: "Vue client" })).toBeVisible(
      { timeout: 10000 },
    );
  });

  test("displays organisation info card", async ({ page }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/vue-client`);

    await expect(page.getByText("Organisation")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Acme Logistique")).toBeVisible();
    await expect(page.getByText("admin@acme-logistique.fr")).toBeVisible();
  });

  test("displays KPI section with stat cards", async ({ page }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/vue-client`);

    await expect(page.getByText("Indicateurs cles")).toBeVisible({
      timeout: 10000,
    });
  });

  test("displays billing section", async ({ page }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/vue-client`);

    await expect(page.getByText("Facturation")).toBeVisible({ timeout: 10000 });
  });
});
