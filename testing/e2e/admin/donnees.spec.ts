import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";
import {
  mockDonneesApis,
  mockCatchAll,
  TEST_ORG_ID,
} from "./fixtures/workspace-mocks";

test.describe("Donnees tab", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminAuth(page);
    await mockDonneesApis(page);
    await mockCatchAll(page);
  });

  test("renders the Donnees heading", async ({ page }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/donnees`);

    await expect(page.getByRole("heading", { name: "Donnees" })).toBeVisible({
      timeout: 10000,
    });
  });

  test("displays data quality section", async ({ page }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/donnees`);

    await expect(page.getByText("Qualite des donnees")).toBeVisible({
      timeout: 10000,
    });
  });

  test("displays consolidated data section", async ({ page }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/donnees`);

    await expect(page.getByText("Donnees consolidees")).toBeVisible({
      timeout: 10000,
    });
  });

  test("displays ingestion log section", async ({ page }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/donnees`);

    await expect(page.getByText(/Journal d.ingestion/)).toBeVisible({
      timeout: 10000,
    });
  });
});
