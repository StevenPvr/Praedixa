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
    await mockCatchAll(page);
    await mockPrevisionsApis(page);
  });

  test("renders the Previsions heading", async ({ page }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/previsions`);

    await expect(page.getByRole("heading", { name: "Previsions" })).toBeVisible(
      { timeout: 10000 },
    );
  });

  test("stays fail-close while the forecasting workspace is disabled", async ({
    page,
  }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/previsions`);

    await expect(page.getByText("Erreur de chargement")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText(
        "Le workspace previsions et ML monitoring n'est pas encore industrialise dans le runtime admin local. La page reste fail-close tant que la route persistante n'est pas branchee.",
      ),
    ).toBeVisible();
  });

  test("does not render legacy scenario content while fail-close is active", async ({
    page,
  }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/previsions`);

    await expect(page.getByText("Scenario base")).toHaveCount(0);
    await expect(page.getByText("Scenario optimiste")).toHaveCount(0);
  });
});
