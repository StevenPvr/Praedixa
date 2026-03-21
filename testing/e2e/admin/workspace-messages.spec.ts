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

  test("stays fail-close while the messaging workspace is disabled", async ({
    page,
  }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/messages`);

    await expect(page.getByText("Erreur de chargement")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText(
        "La messagerie client n'est pas encore industrialise dans le runtime admin local. La page reste fail-close tant que la route persistante n'est pas branchee.",
      ),
    ).toBeVisible();
  });

  test("does not render the legacy conversation list while fail-close is active", async ({
    page,
  }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/messages`);

    await expect(page.getByText("Question facturation")).toHaveCount(0);
    await expect(page.getByText("Probleme import")).toHaveCount(0);
  });

  test("does not expose the empty-thread placeholder while fail-close is active", async ({
    page,
  }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/messages`);

    await expect(
      page.getByText(
        "Selectionnez une conversation pour afficher les messages",
      ),
    ).toHaveCount(0);
  });

  test("does not expose the message thread while fail-close is active", async ({
    page,
  }) => {
    await page.goto(`/clients/${TEST_ORG_ID}/messages`);

    await expect(
      page.getByText("Bonjour, question sur la facture"),
    ).toHaveCount(0);
    await expect(page.getByText("Bonjour, nous regardons cela")).toHaveCount(0);
  });
});
