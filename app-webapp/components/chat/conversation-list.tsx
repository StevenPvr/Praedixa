"use client";

import { Plus } from "@phosphor-icons/react";
import { cn, formatRelativeTime, SkeletonCard } from "@praedixa/ui";
import type { Conversation } from "@/lib/api/endpoints";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewConversation: () => void;
  loading: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-success-light text-success-text",
  resolved: "bg-border text-ink-secondary",
  archived: "bg-border text-ink-secondary",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Ouvert",
  resolved: "Resolu",
  archived: "Archive",
};

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onNewConversation,
  loading,
}: ConversationListProps) {
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} className="h-16 !p-4" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with new conversation button */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-heading-sm text-ink">Conversations</h2>
        <button
          onClick={onNewConversation}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-raised transition-all duration-fast hover:bg-primary-600 hover:shadow-floating focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="Nouvelle conversation"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <p className="text-body-sm text-ink-secondary">
              Aucune conversation
            </p>
            <button
              onClick={onNewConversation}
              className="mt-2 text-title-sm text-primary transition-colors duration-fast hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Démarrer une conversation
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-border" role="list">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <button
                  onClick={() => onSelect(conv.id)}
                  className={cn(
                    "w-full px-4 py-3 text-left transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                    selectedId === conv.id &&
                      "border-l-2 border-primary bg-primary/[0.04]",
                    (!selectedId || selectedId !== conv.id) &&
                      "hover:bg-[var(--glass-bg)] hover:backdrop-blur-[var(--glass-blur,24px)]",
                  )}
                  aria-current={selectedId === conv.id ? "true" : undefined}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-body-sm font-medium text-ink">
                      {conv.subject}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-caption font-medium",
                        STATUS_COLORS[conv.status] ?? STATUS_COLORS.open,
                      )}
                    >
                      {STATUS_LABELS[conv.status] ?? conv.status}
                    </span>
                  </div>
                  {conv.lastMessageAt && (
                    <p className="mt-1 text-caption text-ink-secondary">
                      {formatRelativeTime(conv.lastMessageAt)}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
