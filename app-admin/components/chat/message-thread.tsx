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

interface MessageThreadProps {
  conversationId: string;
  conversationSubject: string;
  conversationStatus: ConversationStatus;
  onStatusChange: () => void;
}

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

  const isDisabled =
    conversationStatus === "resolved" || conversationStatus === "archived";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-ink">
            {conversationSubject}
          </h3>
          <StatusBadge
            variant={
              conversationStatus === "open"
                ? "warning"
                : conversationStatus === "resolved"
                  ? "success"
                  : "neutral"
            }
            label={
              conversationStatus === "open"
                ? "Ouverte"
                : conversationStatus === "resolved"
                  ? "Resolue"
                  : "Archivee"
            }
            size="sm"
          />
        </div>

        <div className="flex gap-2">
          {conversationStatus === "open" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResolve}
              disabled={patchLoading}
            >
              Resoudre
            </Button>
          )}
          {conversationStatus !== "archived" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleArchive}
              disabled={patchLoading}
            >
              Archiver
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading && !messages && (
          <p className="text-center text-sm text-ink-placeholder">
            Chargement des messages...
          </p>
        )}

        {error && (
          <p className="text-center text-sm text-danger-600">{error}</p>
        )}

        {!loading && !error && messages?.length === 0 && (
          <p className="text-center text-sm text-ink-placeholder">
            Aucun message dans cette conversation
          </p>
        )}

        {messages?.map((msg, idx) => {
          const admin = isAdminRole(msg.senderRole);
          const prevMsg = idx > 0 ? messages[idx - 1] : null;
          const showDate =
            !prevMsg ||
            formatDate(msg.createdAt) !== formatDate(prevMsg.createdAt);

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="my-3 text-center">
                  <span className="rounded-full bg-surface-sunken px-3 py-1 text-xs text-ink-tertiary">
                    {formatDate(msg.createdAt)}
                  </span>
                </div>
              )}

              <div
                className={`mb-3 flex ${admin ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    admin
                      ? "bg-primary-100 text-primary-800"
                      : "bg-surface-sunken text-ink"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-medium">
                      {admin ? "admin" : msg.senderRole}
                    </span>
                    <span className="text-xs opacity-60">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
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
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <MessageInput
        conversationId={conversationId}
        disabled={isDisabled}
        onSend={refetch}
      />
    </div>
  );
}

export type { Message, MessageThreadProps };
