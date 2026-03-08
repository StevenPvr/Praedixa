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

export function listConversations(
  token: GetAccessToken,
): Promise<ApiResponse<Conversation[]>> {
  return getEndpoint<Conversation[]>("/api/v1/conversations", token);
}

export function createConversation(
  body: { subject: string },
  token: GetAccessToken,
): Promise<ApiResponse<Conversation>> {
  return postEndpoint<Conversation>("/api/v1/conversations", body, token);
}

export function listConversationMessages(
  convId: string,
  token: GetAccessToken,
): Promise<ApiResponse<ConversationMessage[]>> {
  return getEndpoint<ConversationMessage[]>(
    `/api/v1/conversations/${encodePathSegment(convId)}/messages`,
    token,
  );
}

export function sendConversationMessage(
  convId: string,
  body: { content: string },
  token: GetAccessToken,
): Promise<ApiResponse<ConversationMessage>> {
  return postEndpoint<ConversationMessage>(
    `/api/v1/conversations/${encodePathSegment(convId)}/messages`,
    body,
    token,
  );
}

export function getUnreadCount(
  token: GetAccessToken,
): Promise<ApiResponse<{ unreadCount: number }>> {
  return getEndpoint<{ unreadCount: number }>(
    "/api/v1/conversations/unread-count",
    token,
  );
}
