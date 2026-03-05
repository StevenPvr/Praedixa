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

    await expect(
      page.getByRole("heading", { name: "Messagerie support" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Un sujet par conversation. Posez votre question et suivez la reponse ici.",
      ),
    ).toBeVisible();
  });

  test("displays conversation list and status badges", async ({ page }) => {
    await mockConversations(page);
    await mockConversationMessages(page);
    await mockUnreadCount(page);
    await page.goto("/messages");

    await expect(page.getByText("Conversations")).toBeVisible();
    await expect(page.getByText("Question sur les previsions")).toBeVisible();
    await expect(page.getByText("Probleme import donnees")).toBeVisible();
    await expect(page.getByText("Ouvert")).toBeVisible();
    await expect(page.getByText("Resolu")).toBeVisible();
  });

  test("shows empty state when no conversation selected", async ({ page }) => {
    await mockConversations(page);
    await mockConversationMessages(page);
    await mockUnreadCount(page);
    await page.goto("/messages");

    await expect(
      page.getByText("Selectionnez une conversation", { exact: true }),
    ).toBeVisible();
  });

  test("shows messages when conversation selected", async ({ page }) => {
    await mockConversations(page);
    await mockConversationMessages(page);
    await mockUnreadCount(page);
    await page.goto("/messages");

    await page.getByText("Question sur les previsions").click();
    await expect(page.getByText("Ouvert").first()).toBeVisible();
    await expect(page.getByText("Bonjour, quand les previsions")).toBeVisible();
    await expect(
      page.getByText("les previsions seront disponibles demain"),
    ).toBeVisible();
    await expect(page.getByText("Support Praedixa")).toBeVisible();
  });

  test("shows message input for open conversation", async ({ page }) => {
    await mockConversations(page);
    await mockConversationMessages(page);
    await mockUnreadCount(page);
    await page.goto("/messages");

    await page.getByText("Question sur les previsions").click();
    await expect(page.getByPlaceholder("Ecrivez votre message...")).toBeVisible();
    await expect(page.getByLabel("Envoyer")).toBeVisible();
  });

  test("disables input for resolved conversation", async ({ page }) => {
    await mockConversations(page);
    await mockConversationMessages(page);
    await mockUnreadCount(page);
    await page.goto("/messages");

    await page.getByText("Probleme import donnees").click();
    await expect(page.getByPlaceholder("Conversation fermee")).toBeVisible();
  });

  test("shows new conversation form", async ({ page }) => {
    await mockConversations(page);
    await mockConversationMessages(page);
    await mockUnreadCount(page);
    await page.goto("/messages");

    await page.getByLabel("Nouvelle conversation").click();
    await expect(page.getByLabel("Sujet", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Creer le sujet" })).toBeDisabled();
  });

  test("shows fallback when conversations API fails", async ({ page }) => {
    await mockConversationsError(page);
    await mockUnreadCount(page);
    await page.goto("/messages");

    await expect(page.getByTestId("error-fallback")).toBeVisible();
    await expect(page.getByText("Erreur serveur conversations")).toBeVisible();
  });

  test("shows fallback when messages API fails", async ({ page }) => {
    await mockConversations(page);
    await mockConversationMessagesError(page);
    await mockUnreadCount(page);
    await page.goto("/messages");

    await page.getByText("Question sur les previsions").click();
    await expect(page.getByTestId("error-fallback")).toBeVisible();
    await expect(page.getByText("Erreur serveur messages")).toBeVisible();
  });

  test("shows resolved conversation banner", async ({ page }) => {
    await mockConversations(page);
    await mockConversationMessages(page);
    await mockUnreadCount(page);
    await page.goto("/messages");

    await page.getByText("Probleme import donnees").first().click();
    await expect(page.getByText("Resolu").first()).toBeVisible();
    await expect(page.getByPlaceholder("Conversation fermee")).toBeVisible();
  });
});
