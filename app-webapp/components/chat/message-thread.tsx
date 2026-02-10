"use client";

import { useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";
import { cn } from "@praedixa/ui";
import type { ConversationMessage } from "@/lib/api/endpoints";

interface MessageThreadProps {
  messages: ConversationMessage[];
  currentUserId: string | null;
  loading: boolean;
  conversationStatus?: "open" | "resolved" | "archived";
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Support Praedixa",
  org_admin: "Administrateur",
  hr_manager: "RH",
  manager: "Manager",
  employee: "Employe",
  viewer: "Lecteur",
};

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageThread({
  messages,
  currentUserId,
  loading,
  conversationStatus,
}: MessageThreadProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Empty state
  if (!loading && messages.length === 0 && currentUserId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <MessageSquare className="h-6 w-6 text-gray-400" />
        </div>
        <p className="mt-4 text-sm font-medium text-gray-500">Aucun message</p>
        <p className="mt-1 text-xs text-gray-400">
          Envoyez le premier message pour demarrer la conversation
        </p>
      </div>
    );
  }

  // No conversation selected
  if (!currentUserId && messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <MessageSquare className="h-6 w-6 text-gray-400" />
        </div>
        <p className="mt-4 text-sm font-medium text-gray-500">
          Selectionnez une conversation
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Choisissez une conversation dans la liste ou creez-en une nouvelle
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-16 w-2/3 animate-pulse rounded-2xl bg-gray-100",
              i % 2 === 0 && "ml-auto",
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex flex-1 flex-col overflow-y-auto p-4"
      role="log"
      aria-label="Messages"
    >
      {conversationStatus && conversationStatus !== "open" && (
        <div className="mb-4 rounded-lg bg-gray-50 px-4 py-2 text-center text-sm text-gray-500">
          Cette conversation est{" "}
          {conversationStatus === "resolved" ? "resolue" : "archivee"}
        </div>
      )}

      <div className="space-y-3">
        {messages.map((msg) => {
          const isOwn = msg.senderUserId === currentUserId;
          return (
            <div
              key={msg.id}
              className={cn("flex", isOwn ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2.5",
                  isOwn
                    ? "bg-amber-100 text-charcoal"
                    : "bg-gray-100 text-charcoal",
                )}
              >
                {!isOwn && (
                  <p className="mb-1 text-xs font-medium text-gray-500">
                    {ROLE_LABELS[msg.senderRole] ?? msg.senderRole}
                  </p>
                )}
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                <div
                  className={cn(
                    "mt-1 flex items-center gap-1.5 text-xs",
                    isOwn ? "justify-end text-amber-600/60" : "text-gray-400",
                  )}
                >
                  <span>{formatTime(msg.createdAt)}</span>
                  {isOwn && msg.isRead && (
                    <span aria-label="Lu" title="Lu">
                      ✓✓
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div ref={endRef} />
    </div>
  );
}
