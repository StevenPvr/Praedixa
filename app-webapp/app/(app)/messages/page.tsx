"use client";

import { useMessagesPageModel } from "./use-messages-page-model";
import {
  MessagesHero,
  MessagesWorkspace,
  NewConversationSection,
} from "./page-sections";

export default function MessagesPage() {
  const model = useMessagesPageModel();

  if (!model.messagingAvailable) {
    return (
      <div className="rounded-xl border border-warning-light bg-warning-light/20 px-4 py-3 text-sm text-warning-text">
        {model.combinedError ?? "Messagerie indisponible"}
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-6">
      <MessagesHero combinedError={model.combinedError} />
      <NewConversationSection
        showCreateForm={model.showCreateForm}
        newConversationSubject={model.newConversationSubject}
        trimmedSubject={model.trimmedSubject}
        creatingConversation={model.creatingConversation}
        setNewConversationSubject={model.setNewConversationSubject}
        onCreateConversation={() => {
          model.handleCreateConversation().catch(() => undefined);
        }}
      />
      <MessagesWorkspace
        conversations={model.conversations}
        selectedConversationId={model.selectedConversationId}
        conversationsLoading={model.conversationsLoading}
        selectConversation={model.selectConversation}
        openCreateForm={model.openCreateForm}
        selectedConversation={model.selectedConversation}
        currentUserId={model.currentUserId}
        orderedMessages={model.orderedMessages}
        messagesLoading={model.messagesLoading}
        canSend={model.canSend}
        sendingMessage={model.sendingMessage}
        onSendMessage={(content) => {
          model.handleSendMessage(content).catch(() => undefined);
        }}
      />
    </div>
  );
}
