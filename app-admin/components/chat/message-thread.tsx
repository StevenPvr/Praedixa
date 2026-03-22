"use client";

import { useEffect, useRef } from "react";
import { CheckCheck, Clock } from "lucide-react";
import { Button } from "@praedixa/ui";
import { StatusBadge } from "@/components/ui/status-badge";
import { useApiGet, useApiPatch } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { MessageInput } from "./message-input";
import { CHAT_POLL_INTERVAL_MS } from "@/lib/chat-config";

interface Message {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderRole: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

type ConversationStatus = "open" | "resolved" | "archived";

type MessageThreadProps = Readonly<{
  conversationId: string;
  conversationSubject: string;
  conversationStatus: ConversationStatus;
  onStatusChange: () => void;
}>;

const STATUS_BADGE_MAP: Record<
  ConversationStatus,
  { variant: "warning" | "success" | "neutral"; label: string }
> = {
  open: { variant: "warning", label: "Ouverte" },
  resolved: { variant: "success", label: "Resolue" },
  archived: { variant: "neutral", label: "Archivee" },
};

function isAdminRole(role: string): boolean {
  return role === "super_admin";
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function MessageThread({
  conversationId,
  conversationSubject,
  conversationStatus,
  onStatusChange,
}: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    data: messages,
    loading,
    error,
    refetch,
  } = useApiGet<Message[]>(
    ADMIN_ENDPOINTS.conversationMessages(conversationId),
    { pollInterval: CHAT_POLL_INTERVAL_MS },
  );

  const { mutate: patchStatus, loading: patchLoading } = useApiPatch<
    { status: ConversationStatus },
    unknown
  >(ADMIN_ENDPOINTS.conversationStatus(conversationId));

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function handleResolve() {
    await patchStatus({ status: "resolved" });
    onStatusChange();
  }

  async function handleArchive() {
    await patchStatus({ status: "archived" });
    onStatusChange();
  }

  const isResolved = conversationStatus === "resolved";
  const isArchived = conversationStatus === "archived";
  const isOpen = conversationStatus === "open";
  const canArchive = isOpen || isResolved;
  const statusBadge = STATUS_BADGE_MAP[conversationStatus];
  const isMessageDataMissing = messages === null || messages === undefined;
  const hasMessageData = isMessageDataMissing === false;
  const hasMessages = hasMessageData && messages.length > 0;
  const showLoadingState = loading && isMessageDataMissing;
  const showEmptyState =
    loading === false &&
    error === null &&
    hasMessageData &&
    messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-ink">
            {conversationSubject}
          </h3>
          <StatusBadge
            variant={statusBadge.variant}
            label={statusBadge.label}
            size="sm"
          />
        </div>

        <div className="flex gap-2">
          {isOpen ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResolve}
              disabled={patchLoading}
            >
              Resoudre
            </Button>
          ) : null}
          {canArchive ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleArchive}
              disabled={patchLoading}
            >
              Archiver
            </Button>
          ) : null}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {showLoadingState && (
          <p className="text-center text-sm text-ink-placeholder">
            Chargement des messages...
          </p>
        )}

        {error && (
          <p className="text-center text-sm text-danger-600">{error}</p>
        )}

        {showEmptyState && (
          <p className="text-center text-sm text-ink-placeholder">
            Aucun message dans cette conversation
          </p>
        )}

        {hasMessages
          ? messages.map((msg, idx) => {
              const admin = isAdminRole(msg.senderRole);
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const previousCreatedAt = prevMsg?.createdAt ?? null;
              const hasPreviousMessage = previousCreatedAt !== null;
              const isFirstMessage = hasPreviousMessage === false;
              const isNewDay =
                previousCreatedAt !== null &&
                formatDate(msg.createdAt) !== formatDate(previousCreatedAt);
              const showDate = isFirstMessage || isNewDay;
              const messageRowClassName = `mb-3 flex ${
                admin ? "justify-end" : "justify-start"
              }`;
              const bubbleClassName = `max-w-[75%] rounded-2xl px-4 py-2.5 ${
                admin
                  ? "bg-primary-100 text-primary-800"
                  : "bg-surface-sunken text-ink"
              }`;

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="my-3 text-center">
                      <span className="rounded-full bg-surface-sunken px-3 py-1 text-xs text-ink-tertiary">
                        {formatDate(msg.createdAt)}
                      </span>
                    </div>
                  )}

                  <div className={messageRowClassName}>
                    <div className={bubbleClassName}>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-xs font-medium">
                          {admin ? "admin" : msg.senderRole}
                        </span>
                        <span className="text-xs opacity-60">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">
                        {msg.content}
                      </p>
                      <div className="mt-1 flex justify-end">
                        {msg.isRead ? (
                          <CheckCheck className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 opacity-40" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          : null}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <MessageInput
        conversationId={conversationId}
        disabled={isResolved || isArchived}
        onSend={refetch}
      />
    </div>
  );
}

export type { Message, MessageThreadProps };
