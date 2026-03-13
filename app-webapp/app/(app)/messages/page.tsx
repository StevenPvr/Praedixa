"use client";

import type { Conversation } from "@/lib/api/endpoints";
import { ConversationList } from "@/components/chat/conversation-list";
import { MessageInput } from "@/components/chat/message-input";
import { MessageThread } from "@/components/chat/message-thread";
import { useMessagesPageModel } from "./use-messages-page-model";
import { cn } from "@praedixa/ui";

const STATUS_LABELS: Record<Conversation["status"], string> = {
  open: "Ouvert",
  resolved: "Resolu",
  archived: "Archive",
};

const STATUS_STYLES: Record<Conversation["status"], string> = {
  open: "bg-success-light text-success-text",
  resolved: "bg-border text-ink-secondary",
  archived: "bg-border text-ink-secondary",
};

export default function MessagesPage() {
  const {
    canSend,
    combinedError,
    conversations,
    conversationsLoading,
    creatingConversation,
    currentUserId,
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
  } = useMessagesPageModel();

  return (
    <div className="min-h-full space-y-6">
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-secondary">
          Support
        </p>
        <h1 className="text-2xl font-semibold text-ink">Messagerie support</h1>
        <p className="text-sm text-ink-secondary">
          Un sujet par conversation. Posez votre question et suivez la reponse
          ici.
        </p>
      </section>

      {combinedError && (
        <div
          data-testid="error-fallback"
          className="rounded-xl border border-warning-light bg-warning-light/20 px-4 py-3 text-sm text-warning-text"
        >
          {combinedError}
        </div>
      )}

      {showCreateForm && (
        <section className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <label
                htmlFor="new-conversation-subject"
                className="text-sm font-medium text-ink"
              >
                Sujet
              </label>
              <input
                id="new-conversation-subject"
                value={newConversationSubject}
                onChange={(event) =>
                  setNewConversationSubject(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  void handleCreateConversation();
                }}
                placeholder="Resumez votre besoin en une phrase"
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="button"
              disabled={trimmedSubject.length === 0 || creatingConversation}
              onClick={() => {
                void handleCreateConversation();
              }}
              className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creatingConversation ? "Creation..." : "Creer le sujet"}
            </button>
          </div>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="min-h-[560px] overflow-hidden rounded-xl border border-border bg-card">
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversationId}
            onSelect={selectConversation}
            onNewConversation={openCreateForm}
            loading={conversationsLoading}
          />
        </div>

        <div className="flex min-h-[560px] flex-col overflow-hidden rounded-xl border border-border bg-card">
          {selectedConversation ? (
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="truncate text-sm font-semibold text-ink">
                {selectedConversation.subject}
              </p>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  STATUS_STYLES[selectedConversation.status],
                )}
              >
                {STATUS_LABELS[selectedConversation.status]}
              </span>
            </div>
          ) : (
            <div className="border-b border-border px-4 py-3 text-sm text-ink-secondary">
              Selectionnez une conversation ou creez un nouveau sujet.
            </div>
          )}

          <MessageThread
            messages={orderedMessages}
            currentUserId={selectedConversation ? currentUserId : null}
            loading={messagesLoading}
            conversationStatus={selectedConversation?.status}
          />

          {selectedConversation && (
            <MessageInput
              onSend={(content) => {
                void handleSendMessage(content);
              }}
              disabled={!canSend || sendingMessage}
              sending={sendingMessage}
            />
          )}
        </div>
      </section>
    </div>
  );
}
