import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";
import {
  mockMessagesApis,
  mockCatchAll,
  TEST_ORG_ID,
} from "./fixtures/workspace-mocks";

test.describe("Messages tab (workspace)", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminAuth(page);
    await mockCatchAll(page);
    await mockMessagesApis(page);
  });

  test("renders the Conversations heading", async ({ page }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/messages`);

    await expect(page.getByText("Conversations")).toBeVisible({
      timeout: 10000,
    });
  });

  test("displays conversation subjects from mock data", async ({ page }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/messages`);

    await expect(page.getByText("Question facturation")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Probleme import")).toBeVisible();
  });

  test("shows empty state before selecting a conversation", async ({
    page,
  }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/messages`);

    await expect(
      page.getByText(
        "Selectionnez une conversation pour afficher les messages",
      ),
    ).toBeVisible({ timeout: 10000 });
  });

  test("shows message thread when conversation is selected", async ({
    page,
  }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/messages`);

    // Click on the first conversation
    await page.getByText("Question facturation").click();

    // Thread should show the conversation subject and messages
    await expect(
      page.getByText("Bonjour, question sur la facture"),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Bonjour, nous regardons cela")).toBeVisible();
  });
});
