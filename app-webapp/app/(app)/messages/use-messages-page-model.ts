"use client";

import { useCallback, useMemo, useState } from "react";
import { useApiGet, useApiPost } from "@/hooks/use-api";
import { useCurrentUser } from "@/lib/auth/client";
import type { Conversation, ConversationMessage } from "@/lib/api/endpoints";
import {
  WEBAPP_RUNTIME_FEATURES,
  unavailableFeatureMessage,
} from "@/lib/runtime-features";

interface CreateConversationBody {
  subject: string;
}

interface SendConversationMessageBody {
  content: string;
}

interface MessagesPageModel {
  canSend: boolean;
  combinedError: string | null;
  conversations: Conversation[];
  conversationsLoading: boolean;
  creatingConversation: boolean;
  currentUserId: string | null;
  messagingAvailable: boolean;
  messagesLoading: boolean;
  newConversationSubject: string;
  orderedMessages: ConversationMessage[];
  selectedConversation: Conversation | null;
  selectedConversationId: string | null;
  sendingMessage: boolean;
  showCreateForm: boolean;
  trimmedSubject: string;
  openCreateForm: () => void;
  selectConversation: (conversationId: string | null) => void;
  setNewConversationSubject: (value: string) => void;
  handleCreateConversation: () => Promise<void>;
  handleSendMessage: (content: string) => Promise<void>;
}

function normalizeConversations(
  conversationsData: Conversation[] | null,
): Conversation[] {
  return Array.isArray(conversationsData) ? conversationsData : [];
}

function getSelectedConversation(
  conversations: Conversation[],
  selectedConversationId: string | null,
): Conversation | null {
  if (!selectedConversationId) {
    return null;
  }

  return (
    conversations.find(
      (conversation) => conversation.id === selectedConversationId,
    ) ?? null
  );
}

function buildMessagesUrl(
  selectedConversationId: string | null,
): string | null {
  if (!selectedConversationId) {
    return null;
  }

  return `/api/v1/conversations/${encodeURIComponent(selectedConversationId)}/messages`;
}

function sortMessagesByCreatedAt(
  messages: ConversationMessage[] | null,
): ConversationMessage[] {
  return [...(messages ?? [])].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
}

export function useMessagesPageModel(): MessagesPageModel {
  const currentUser = useCurrentUser();
  const messagingAvailable = WEBAPP_RUNTIME_FEATURES.messagingWorkspace;
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newConversationSubject, setNewConversationSubject] = useState("");

  const {
    data: conversationsData,
    loading: conversationsLoading,
    error: conversationsError,
    refetch: refetchConversations,
  } = useApiGet<Conversation[]>(
    messagingAvailable ? "/api/v1/conversations" : null,
    {
      pollInterval: 5000,
    },
  );

  const conversations = useMemo(
    () => normalizeConversations(conversationsData),
    [conversationsData],
  );

  const selectedConversation = useMemo(
    () => getSelectedConversation(conversations, selectedConversationId),
    [conversations, selectedConversationId],
  );

  const {
    data: messagesData,
    loading: messagesLoading,
    error: messagesError,
    refetch: refetchMessages,
  } = useApiGet<ConversationMessage[]>(
    messagingAvailable ? buildMessagesUrl(selectedConversationId) : null,
    {
      pollInterval: 4000,
    },
  );

  const orderedMessages = useMemo(
    () => sortMessagesByCreatedAt(messagesData),
    [messagesData],
  );

  const {
    mutate: createConversation,
    loading: creatingConversation,
    error: createConversationError,
  } = useApiPost<CreateConversationBody, Conversation>("/api/v1/conversations");

  const {
    mutate: sendMessage,
    loading: sendingMessage,
    error: sendMessageError,
  } = useApiPost<SendConversationMessageBody, ConversationMessage>(
    selectedConversationId
      ? `/api/v1/conversations/${encodeURIComponent(selectedConversationId)}/messages`
      : "/api/v1/conversations/__none__/messages",
  );

  const trimmedSubject = newConversationSubject.trim();
  const unavailableMessage = messagingAvailable
    ? null
    : unavailableFeatureMessage("La messagerie support");
  const combinedError =
    unavailableMessage ??
    conversationsError ??
    messagesError ??
    createConversationError ??
    sendMessageError;
  const canSend = selectedConversation?.status === "open";

  const openCreateForm = useCallback(() => {
    setShowCreateForm(true);
  }, []);

  const selectConversation = useCallback((conversationId: string | null) => {
    setSelectedConversationId(conversationId);
  }, []);

  const handleCreateConversation = useCallback(async (): Promise<void> => {
    if (!trimmedSubject) {
      return;
    }

    const created = await createConversation({ subject: trimmedSubject });
    if (!created) {
      return;
    }

    setSelectedConversationId(created.id);
    setShowCreateForm(false);
    setNewConversationSubject("");
    refetchConversations();
  }, [createConversation, refetchConversations, trimmedSubject]);

  const handleSendMessage = useCallback(
    async (content: string): Promise<void> => {
      if (!selectedConversationId) {
        return;
      }

      const sent = await sendMessage({ content });
      if (!sent) {
        return;
      }

      refetchMessages();
      refetchConversations();
    },
    [
      refetchConversations,
      refetchMessages,
      selectedConversationId,
      sendMessage,
    ],
  );

  return {
    canSend,
    combinedError,
    conversations,
    conversationsLoading,
    creatingConversation,
    currentUserId: currentUser?.id ?? null,
    messagingAvailable,
    handleCreateConversation,
    handleSendMessage,
    messagesLoading,
    newConversationSubject,
    openCreateForm,
    orderedMessages,
    selectedConversation,
    selectedConversationId,
    selectConversation,
    sendingMessage,
    setNewConversationSubject,
    showCreateForm,
    trimmedSubject,
  };
}
