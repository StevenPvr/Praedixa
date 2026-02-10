import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import {
  mockConversations,
  mockConversationsError,
  mockConversationMessages,
  mockConversationMessagesError,
  mockUnreadCount,
} from "./fixtures/api-mocks";

test.describe("Messages page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test("displays page header", async ({ page }) => {
    await mockConversations(page);
    await mockConversationMessages(page);
    await mockUnreadCount(page);
    await page.goto("/messages");
    await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
    await expect(
      page.getByText("Echangez avec l'equipe Praedixa"),
    ).toBeVisible();
  });

  test("displays conversation list", async ({ page }) => {
    await mockConversations(page);
    await mockConversationMessages(page);
    await mockUnreadCount(page);
    await page.goto("/messages");
    await expect(page.getByText("Conversations")).toBeVisible();
    await expect(page.getByText("Question sur les previsions")).toBeVisible();
    await expect(page.getByText("Probleme import donnees")).toBeVisible();
  });

  test("displays conversation status badges", async ({ page }) => {
    await mockConversations(page);
    await mockConversationMessages(page);
    await mockUnreadCount(page);
    await page.goto("/messages");
    await expect(page.getByText("Ouvert")).toBeVisible();
    await expect(page.getByText("Resolu")).toBeVisible();
  });

  test("shows empty state when no conversation selected", async ({ page }) => {
    await mockConversations(page);
    await mockConversationMessages(page);
    await mockUnreadCount(page);
    await page.goto("/messages");
    await expect(page.getByText("Selectionnez une conversation")).toBeVisible();
  });

  test("shows messages when conversation selected", async ({ page }) => {
    await mockConversations(page);
    await mockConversationMessages(page);
    await mockUnreadCount(page);
    await page.goto("/messages");
    // Click first conversation
    await page.getByText("Question sur les previsions").click();
    // Should show conversation header
    await expect(page.getByText("En cours")).toBeVisible();
    // Should show messages
    await expect(page.getByText("Bonjour, quand les previsions")).toBeVisible();
    await expect(
      page.getByText("les previsions seront disponibles demain"),
    ).toBeVisible();
    // Role label for non-own message
    await expect(page.getByText("Support Praedixa")).toBeVisible();
  });

  test("shows message input for open conversation", async ({ page }) => {
    await mockConversations(page);
    await mockConversationMessages(page);
    await mockUnreadCount(page);
    await page.goto("/messages");
    await page.getByText("Question sur les previsions").click();
    await expect(
      page.getByPlaceholder("Ecrivez votre message..."),
    ).toBeVisible();
    await expect(page.getByLabel("Envoyer")).toBeVisible();
  });

  test("disables input for resolved conversation", async ({ page }) => {
    await mockConversations(page);
    await mockConversationMessages(page);
    await mockUnreadCount(page);
    await page.goto("/messages");
    await page.getByText("Probleme import donnees").click();
    // The textarea should show "Conversation fermee" placeholder
    await expect(page.getByPlaceholder("Conversation fermee")).toBeVisible();
  });

  test("shows new conversation button", async ({ page }) => {
    await mockConversations(page);
    await mockConversationMessages(page);
    await mockUnreadCount(page);
    await page.goto("/messages");
    await expect(page.getByLabel("Nouvelle conversation")).toBeVisible();
  });

  test("shows new conversation input on button click", async ({ page }) => {
    await mockConversations(page);
    await mockConversationMessages(page);
    await mockUnreadCount(page);
    await page.goto("/messages");
    await page.getByLabel("Nouvelle conversation").click();
    await expect(page.getByText("Sujet de la conversation")).toBeVisible();
    await expect(page.getByRole("button", { name: "Creer" })).toBeVisible();
  });

  test("Creer button disabled when subject empty", async ({ page }) => {
    await mockConversations(page);
    await mockConversationMessages(page);
    await mockUnreadCount(page);
    await page.goto("/messages");
    await page.getByLabel("Nouvelle conversation").click();
    await expect(page.getByRole("button", { name: "Creer" })).toBeDisabled();
  });

  test("shows error fallback when conversations API fails", async ({
    page,
  }) => {
    await mockConversationsError(page);
    await mockUnreadCount(page);
    await page.goto("/messages");
    await expect(page.getByText(/erreur/i)).toBeVisible();
  });

  test("shows error fallback when messages API fails", async ({ page }) => {
    await mockConversations(page);
    await mockConversationMessagesError(page);
    await mockUnreadCount(page);
    await page.goto("/messages");
    await page.getByText("Question sur les previsions").click();
    await expect(page.getByText(/erreur/i)).toBeVisible();
  });

  test("shows resolved conversation banner", async ({ page }) => {
    await mockConversations(page);
    await mockConversationMessages(page);
    await mockUnreadCount(page);
    await page.goto("/messages");
    await page.getByText("Probleme import donnees").click();
    await expect(
      page.getByText("Cette conversation est resolue"),
    ).toBeVisible();
  });
});
