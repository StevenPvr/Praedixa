"use client";

import { useCallback, useState } from "react";
import { MessageSquare } from "lucide-react";
import { useApiGet } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ErrorFallback } from "@/components/error-fallback";
import {
  ADMIN_WORKSPACE_FEATURE_GATES,
  featureUnavailableMessage,
} from "@/lib/runtime/admin-workspace-feature-gates";
import { useClientContext } from "../client-context";
import { ConversationList } from "@/components/chat/conversation-list";
import { MessageThread } from "@/components/chat/message-thread";
import type { Conversation } from "@/components/chat/conversation-list";

export default function MessagesPage() {
  const { orgId } = useClientContext();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const messagingEnabled = ADMIN_WORKSPACE_FEATURE_GATES.messagesWorkspace;

  const { data: conversations, refetch } = useApiGet<Conversation[]>(
    messagingEnabled ? ADMIN_ENDPOINTS.orgConversations(orgId) : null,
  );

  const handleStatusChange = useCallback(() => {
    refetch();
  }, [refetch]);

  const selectedConv =
    conversations?.find((conversation) => conversation.id === selectedConvId) ??
    null;

  if (!messagingEnabled) {
    return (
      <ErrorFallback
        message={featureUnavailableMessage("La messagerie client")}
      />
    );
  }

  return (
    <div className="flex h-[calc(100vh-220px)] gap-0 overflow-hidden rounded-2xl border border-border-subtle bg-card shadow-soft">
      {/* Left panel — conversation list */}
      <div className="w-1/3 min-w-[240px] border-r border-border-subtle pt-3">
        <div className="px-3 pb-2">
          <h2 className="font-serif text-base font-semibold text-ink">
            Conversations
          </h2>
        </div>
        <ConversationList
          orgId={orgId}
          selectedId={selectedConvId}
          onSelect={setSelectedConvId}
        />
      </div>

      {/* Right panel — thread or empty state */}
      <div className="flex-1">
        {selectedConv ? (
          <MessageThread
            conversationId={selectedConv.id}
            conversationSubject={selectedConv.subject}
            conversationStatus={selectedConv.status}
            onStatusChange={handleStatusChange}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-ink-placeholder">
            <MessageSquare className="h-12 w-12" />
            <p className="text-sm">
              Selectionnez une conversation pour afficher les messages
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
