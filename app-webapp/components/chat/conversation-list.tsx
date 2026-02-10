"use client";

import { Plus } from "lucide-react";
import { cn } from "@praedixa/ui";
import type { Conversation } from "@/lib/api/endpoints";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewConversation: () => void;
  loading: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  resolved: "bg-gray-100 text-gray-500",
  archived: "bg-gray-100 text-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Ouvert",
  resolved: "Resolu",
  archived: "Archive",
};

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "A l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `Il y a ${diffD}j`;
}

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
          <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with new conversation button */}
      <div className="flex items-center justify-between border-b border-neutral-200/80 px-4 py-3">
        <h2 className="font-serif text-lg font-semibold text-charcoal">
          Conversations
        </h2>
        <button
          onClick={onNewConversation}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white transition-colors hover:bg-amber-400"
          aria-label="Nouvelle conversation"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <p className="text-sm text-gray-500">Aucune conversation</p>
            <button
              onClick={onNewConversation}
              className="mt-2 text-sm font-medium text-amber-600 hover:text-amber-500"
            >
              Demarrer une conversation
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100" role="list">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <button
                  onClick={() => onSelect(conv.id)}
                  className={cn(
                    "w-full px-4 py-3 text-left transition-colors hover:bg-amber-50/50",
                    selectedId === conv.id &&
                      "border-l-2 border-amber-400 bg-amber-50/60",
                  )}
                  aria-current={selectedId === conv.id ? "true" : undefined}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium text-charcoal">
                      {conv.subject}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                        STATUS_COLORS[conv.status] ?? STATUS_COLORS.open,
                      )}
                    >
                      {STATUS_LABELS[conv.status] ?? conv.status}
                    </span>
                  </div>
                  {conv.lastMessageAt && (
                    <p className="mt-1 text-xs text-gray-400">
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
