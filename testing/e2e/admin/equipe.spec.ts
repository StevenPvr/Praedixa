import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";
import {
  mockEquipeApis,
  mockCatchAll,
  TEST_ORG_ID,
} from "./fixtures/workspace-mocks";

test.describe("Equipe tab", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminAuth(page);
    await mockCatchAll(page);
    await mockEquipeApis(page);
  });

  test("renders the Equipe heading", async ({ page }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/equipe`);

    await expect(page.getByRole("heading", { name: "Equipe" })).toBeVisible({
      timeout: 10000,
    });
  });

  test("displays users from mock data", async ({ page }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/equipe`);

    await expect(page.getByText("alice@acme.fr")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("bob@acme.fr")).toBeVisible();
    await expect(page.getByText("carol@acme.fr")).toBeVisible();
  });

  test("shows invite button", async ({ page }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/equipe`);

    await expect(page.getByRole("button", { name: /Inviter/ })).toBeVisible({
      timeout: 10000,
    });
  });

  test("displays role badges in the table", async ({ page }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/equipe`);

    await expect(page.getByText("Admin Org")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Manager")).toBeVisible();
    await expect(page.getByText("Lecteur")).toBeVisible();
  });
});
