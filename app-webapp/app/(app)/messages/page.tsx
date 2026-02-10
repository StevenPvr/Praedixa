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
import type { Conversation, ConversationMessage } from "@/lib/api/endpoints";

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

  // Hardcoded current user id — in production this comes from auth context
  // For now we pass it to differentiate own messages from others
  const currentUserId = "current-user";

  const {
    data: conversations,
    loading: convsLoading,
    error: convsError,
    refetch: refetchConvs,
  } = useApiGet<Conversation[]>("/api/v1/conversations", {
    pollInterval: 10000,
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
    { pollInterval: 5000 },
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
      <div className="space-y-6">
        <PageHeader
          title="Messages"
          subtitle="Echangez avec l'equipe Praedixa"
        />
        <ErrorFallback
          variant="api"
          message={convsError}
          onRetry={refetchConvs}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Messages" subtitle="Echangez avec l'equipe Praedixa" />

      <DetailCard className="p-0">
        <div className="flex h-[calc(100vh-220px)] min-h-[500px]">
          {/* Left panel — conversation list */}
          <div className="w-80 shrink-0 border-r border-neutral-200/80">
            <ConversationList
              conversations={conversations ?? []}
              selectedId={selectedConvId}
              onSelect={handleSelectConversation}
              onNewConversation={handleNewConversation}
              loading={convsLoading}
            />
          </div>

          {/* Right panel — message thread + input */}
          <div className="flex flex-1 flex-col">
            {/* New conversation input */}
            {showNewConvInput && (
              <div className="border-b border-neutral-200/80 px-4 py-3">
                <label
                  htmlFor="new-conv-subject"
                  className="mb-1 block text-sm font-medium text-charcoal"
                >
                  Sujet de la conversation
                </label>
                <div className="flex gap-2">
                  <input
                    id="new-conv-subject"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Ex: Question sur les previsions"
                    className="flex-1 rounded-lg border border-neutral-200 bg-gray-50 px-3 py-2 text-sm text-charcoal outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-200"
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
                    className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-400 disabled:opacity-50"
                  >
                    {creating ? "Creation..." : "Creer"}
                  </button>
                </div>
              </div>
            )}

            {/* Conversation header */}
            {selectedConv && (
              <div className="flex items-center gap-3 border-b border-neutral-200/80 px-4 py-3">
                <MessageSquare className="h-5 w-5 text-gray-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-charcoal">
                    {selectedConv.subject}
                  </p>
                  <p className="text-xs text-gray-400">
                    {selectedConv.status === "open"
                      ? "En cours"
                      : selectedConv.status === "resolved"
                        ? "Resolu"
                        : "Archive"}
                  </p>
                </div>
              </div>
            )}

            {/* Messages */}
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
                currentUserId={selectedConvId ? currentUserId : null}
                loading={msgsLoading}
                conversationStatus={selectedConv?.status}
              />
            )}

            {/* Input */}
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
  );
}
