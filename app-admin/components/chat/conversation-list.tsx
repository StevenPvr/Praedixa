"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquare, User, Headphones } from "lucide-react";
import { formatRelativeTime } from "@praedixa/ui";
import {
  StatusBadge,
  type StatusBadgeProps,
} from "@/components/ui/status-badge";

type ConversationStatus = "open" | "resolved" | "archived";

interface Conversation {
  id: string;
  organizationId: string;
  subject: string;
  status: ConversationStatus;
  initiatedBy: "client" | "admin";
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type ConversationListProps = Readonly<{
  conversations: readonly Conversation[] | null | undefined;
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}>;

const STATUS_BADGE_MAP: Record<
  ConversationStatus,
  { variant: StatusBadgeProps["variant"]; label: string }
> = {
  open: { variant: "warning", label: "Ouverte" },
  resolved: { variant: "success", label: "Resolue" },
  archived: { variant: "neutral", label: "Archivee" },
};

type FilterTab = "all" | "open" | "resolved";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "open", label: "Ouvertes" },
  { key: "resolved", label: "Resolues" },
];

const VALID_FILTERS = new Set<FilterTab>(["all", "open", "resolved"]);

function parseFilter(value: string | null): FilterTab {
  if (value && VALID_FILTERS.has(value as FilterTab)) return value as FilterTab;
  return "all";
}

export function ConversationList({
  conversations,
  loading,
  error,
  selectedId,
  onSelect,
}: ConversationListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = parseFilter(searchParams.get("filter"));

  const setFilter = useCallback(
    (f: FilterTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (f === "all") params.delete("filter");
      else params.set("filter", f);
      const qs = params.toString();
      const nextHref = qs ? `?` + qs : "?";
      router.replace(nextHref, { scroll: false });
    },
    [router, searchParams],
  );

  const filtered = useMemo(() => {
    if (conversations === null || conversations === undefined) return [];
    if (filter === "all") return conversations;
    return conversations.filter((c) => c.status === filter);
  }, [conversations, filter]);
  const isConversationDataMissing =
    conversations === null || conversations === undefined;
  const hasConversationData = isConversationDataMissing === false;
  const showLoadingState = loading && isConversationDataMissing;
  const showEmptyState =
    loading === false &&
    error === null &&
    hasConversationData &&
    filtered.length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-border-subtle px-3 pb-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === tab.key
                ? "bg-primary-100 text-primary-700"
                : "text-ink-tertiary hover:bg-surface-sunken hover:text-ink-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {showLoadingState && (
          <p className="px-3 py-4 text-sm text-ink-placeholder">
            Chargement...
          </p>
        )}

        {error && <p className="px-3 py-4 text-sm text-danger-600">{error}</p>}

        {showEmptyState && (
          <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
            <MessageSquare className="h-8 w-8 text-ink-placeholder" />
            <p className="text-sm text-ink-placeholder">Aucune conversation</p>
          </div>
        )}

        {filtered.map((conv) => {
          const badge = STATUS_BADGE_MAP[conv.status];
          const isSelected = selectedId === conv.id;
          const rowClassName = `w-full border-b border-border-subtle px-3 py-3 text-left transition-colors ${
            isSelected
              ? "border-l-2 border-l-primary-400 bg-primary-50/60"
              : "hover:bg-surface-sunken"
          }`;
          const subjectClassName = `text-sm font-medium ${
            isSelected ? "text-primary-800" : "text-ink"
          }`;
          const initiatedByIcon =
            conv.initiatedBy === "client" ? (
              <User className="h-3 w-3" />
            ) : (
              <Headphones className="h-3 w-3" />
            );
          const initiatedByLabel =
            conv.initiatedBy === "client" ? "client" : "admin";

          return (
            <button
              key={conv.id}
              type="button"
              onClick={() => onSelect(conv.id)}
              className={rowClassName}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={subjectClassName}>{conv.subject}</span>
                <StatusBadge
                  variant={badge.variant}
                  label={badge.label}
                  size="sm"
                />
              </div>

              <div className="mt-1 flex items-center gap-2 text-xs text-ink-placeholder">
                {initiatedByIcon}
                <span>{initiatedByLabel}</span>
                {conv.lastMessageAt && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{formatRelativeTime(conv.lastMessageAt)}</span>
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type { Conversation, ConversationStatus, FilterTab };
