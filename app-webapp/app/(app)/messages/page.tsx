"use client";

import { useState, useCallback } from "react";
import { MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DetailCard } from "@/components/ui/detail-card";
import { useApiGet, useApiPost } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";
import { ConversationList } from "@/components/chat/conversation-list";
import { MessageThread } from "@/components/chat/message-thread";
import { MessageInput } from "@/components/chat/message-input";
import { PageTransition } from "@/components/page-transition";
import { useCurrentUser } from "@/lib/auth/client";
import type { Conversation, ConversationMessage } from "@/lib/api/endpoints";
import { CHAT_POLL_INTERVAL_MS } from "@/lib/chat-config";

interface CreateConversationBody {
  subject: string;
}

interface SendMessageBody {
  content: string;
}

export default function MessagesPage() {
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [showNewConvInput, setShowNewConvInput] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const currentUser = useCurrentUser();

  const {
    data: conversations,
    loading: convsLoading,
    error: convsError,
    refetch: refetchConvs,
  } = useApiGet<Conversation[]>("/api/v1/conversations", {
    pollInterval: CHAT_POLL_INTERVAL_MS,
  });

  const {
    data: messages,
    loading: msgsLoading,
    error: msgsError,
    refetch: refetchMessages,
  } = useApiGet<ConversationMessage[]>(
    selectedConvId
      ? `/api/v1/conversations/${encodeURIComponent(selectedConvId)}/messages`
      : null,
    { pollInterval: CHAT_POLL_INTERVAL_MS },
  );

  const { mutate: createConv, loading: creating } = useApiPost<
    CreateConversationBody,
    Conversation
  >("/api/v1/conversations");

  const { mutate: sendMsg, loading: sendingMsg } = useApiPost<
    SendMessageBody,
    ConversationMessage
  >(
    selectedConvId
      ? `/api/v1/conversations/${encodeURIComponent(selectedConvId)}/messages`
      : "/api/v1/conversations",
  );

  const selectedConv =
    conversations?.find((c) => c.id === selectedConvId) ?? null;

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConvId(id);
    setShowNewConvInput(false);
  }, []);

  const handleNewConversation = useCallback(() => {
    setShowNewConvInput(true);
    setSelectedConvId(null);
  }, []);

  const handleCreateConversation = useCallback(async () => {
    const trimmed = newSubject.trim();
    if (!trimmed || creating) return;
    const result = await createConv({ subject: trimmed });
    if (result) {
      setNewSubject("");
      setShowNewConvInput(false);
      setSelectedConvId(result.id);
      refetchConvs();
    }
  }, [newSubject, creating, createConv, refetchConvs]);

  const handleSendMessage = useCallback(
    (content: string) => {
      if (!selectedConvId) return;
      void sendMsg({ content }).then((result) => {
        if (result) {
          refetchMessages();
          refetchConvs();
        }
      });
    },
    [selectedConvId, sendMsg, refetchMessages, refetchConvs],
  );

  const isConversationClosed =
    selectedConv?.status === "resolved" || selectedConv?.status === "archived";

  if (convsError) {
    return (
      <PageTransition>
        <div className="space-y-8">
          <PageHeader
            eyebrow="Suivre"
            title="Support strategique"
            subtitle="Coordonnez vos decisions avec l'equipe Praedixa."
          />
          <ErrorFallback
            variant="api"
            message={convsError}
            onRetry={refetchConvs}
          />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="gradient-mesh min-h-full space-y-8">
        <PageHeader
          eyebrow="Suivre"
          title="Support strategique"
          subtitle="Coordonnez vos decisions avec l'equipe Praedixa."
        />

        <DetailCard className="p-0">
          <div className="flex h-[calc(100vh-220px)] min-h-[500px]">
            <div className="w-80 shrink-0 border-r border-border bg-surface-sunken">
              <ConversationList
                conversations={conversations ?? []}
                selectedId={selectedConvId}
                onSelect={handleSelectConversation}
                onNewConversation={handleNewConversation}
                loading={convsLoading}
              />
            </div>

            <div className="flex flex-1 flex-col">
              {showNewConvInput && (
                <div className="border-b border-border px-4 py-3">
                  <label
                    htmlFor="new-conv-subject"
                    className="mb-1 block text-title-sm text-ink"
                  >
                    Sujet de la conversation
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="new-conv-subject"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      placeholder="Ex: Question sur les previsions"
                      className="flex-1 rounded-lg border border-border bg-surface-sunken px-3 py-2 text-body-sm text-ink outline-none transition-all duration-fast focus:border-primary focus:ring-2 focus:ring-primary/20"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleCreateConversation();
                        }
                      }}
                    />
                    <button
                      onClick={() => void handleCreateConversation()}
                      disabled={!newSubject.trim() || creating}
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-all duration-normal hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
                    >
                      {creating ? "Creation..." : "Creer"}
                    </button>
                  </div>
                </div>
              )}

              {selectedConv && (
                <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                  <MessageSquare className="h-5 w-5 text-ink-tertiary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-medium text-ink">
                      {selectedConv.subject}
                    </p>
                    <p className="text-caption text-ink-secondary">
                      {selectedConv.status === "open"
                        ? "En cours"
                        : selectedConv.status === "resolved"
                          ? "Resolu"
                          : "Archive"}
                    </p>
                  </div>
                </div>
              )}

              {msgsError ? (
                <div className="flex-1 p-4">
                  <ErrorFallback
                    variant="api"
                    message={msgsError}
                    onRetry={refetchMessages}
                  />
                </div>
              ) : (
                <MessageThread
                  messages={messages ?? []}
                  currentUserId={
                    selectedConvId ? (currentUser?.id ?? null) : null
                  }
                  loading={msgsLoading}
                  conversationStatus={selectedConv?.status}
                />
              )}

              {selectedConvId && !showNewConvInput && (
                <MessageInput
                  onSend={handleSendMessage}
                  disabled={isConversationClosed ?? false}
                  sending={sendingMsg}
                />
              )}
            </div>
          </div>
        </DetailCard>
      </div>
    </PageTransition>
  );
}
