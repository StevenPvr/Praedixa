import type { ApiResponse } from "@praedixa/shared-types";
import {
  encodePathSegment,
  getEndpoint,
  postEndpoint,
  type GetAccessToken,
} from "./shared";

interface Conversation {
  id: string;
  organizationId: string;
  subject: string;
  status: "open" | "resolved" | "archived";
  initiatedBy: "client" | "admin";
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ConversationMessage {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderRole: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export type { Conversation, ConversationMessage };

function conversationsPath(): string {
  return "/api/v1/conversations";
}

function conversationMessagesPath(convId: string): string {
  return `${conversationsPath()}/${encodePathSegment(convId)}/messages`;
}

function unreadCountPath(): string {
  return `${conversationsPath()}/unread-count`;
}

export function listConversations(
  token: GetAccessToken,
): Promise<ApiResponse<Conversation[]>> {
  return getEndpoint<Conversation[]>(conversationsPath(), token);
}

export function createConversation(
  body: { subject: string },
  token: GetAccessToken,
): Promise<ApiResponse<Conversation>> {
  return postEndpoint<Conversation>(conversationsPath(), body, token);
}

export function listConversationMessages(
  convId: string,
  token: GetAccessToken,
): Promise<ApiResponse<ConversationMessage[]>> {
  return getEndpoint<ConversationMessage[]>(
    conversationMessagesPath(convId),
    token,
  );
}

export function sendConversationMessage(
  convId: string,
  body: { content: string },
  token: GetAccessToken,
): Promise<ApiResponse<ConversationMessage>> {
  return postEndpoint<ConversationMessage>(
    conversationMessagesPath(convId),
    body,
    token,
  );
}

export function getUnreadCount(
  token: GetAccessToken,
): Promise<ApiResponse<{ unreadCount: number }>> {
  return getEndpoint<{ unreadCount: number }>(unreadCountPath(), token);
}
