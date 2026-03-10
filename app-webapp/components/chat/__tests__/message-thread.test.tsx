import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageThread } from "../message-thread";

vi.mock("@praedixa/ui", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

const mockMessages = [
  {
    id: "m1",
    conversationId: "c1",
    senderUserId: "user-admin",
    senderRole: "super_admin",
    content: "Bonjour, comment puis-je vous aider ?",
    isRead: true,
    createdAt: "2026-02-08T10:00:00Z",
    updatedAt: "2026-02-08T10:00:00Z",
  },
  {
    id: "m2",
    conversationId: "c1",
    senderUserId: "current-user",
    senderRole: "org_admin",
    content: "J'ai une question sur les previsions.",
    isRead: true,
    createdAt: "2026-02-08T10:01:00Z",
    updatedAt: "2026-02-08T10:01:00Z",
  },
  {
    id: "m3",
    conversationId: "c1",
    senderUserId: "current-user",
    senderRole: "org_admin",
    content: "Encore une question.",
    isRead: false,
    createdAt: "2026-02-08T10:02:00Z",
    updatedAt: "2026-02-08T10:02:00Z",
  },
];

describe("MessageThread", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  /* --- Rendering messages --- */

  it("renders all messages", () => {
    render(
      <MessageThread
        messages={mockMessages}
        currentUserId="current-user"
        loading={false}
      />,
    );
    expect(
      screen.getByText("Bonjour, comment puis-je vous aider ?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("J'ai une question sur les previsions."),
    ).toBeInTheDocument();
    expect(screen.getByText("Encore une question.")).toBeInTheDocument();
  });

  it("renders role label for non-own messages", () => {
    render(
      <MessageThread
        messages={mockMessages}
        currentUserId="current-user"
        loading={false}
      />,
    );
    expect(screen.getByText("Support Praedixa")).toBeInTheDocument();
  });

  it("does not render role label for own messages", () => {
    render(
      <MessageThread
        messages={[mockMessages[1]]}
        currentUserId="current-user"
        loading={false}
      />,
    );
    expect(screen.queryByText("Administrateur")).not.toBeInTheDocument();
  });

  it("shows read indicator for own read messages", () => {
    render(
      <MessageThread
        messages={[mockMessages[1]]}
        currentUserId="current-user"
        loading={false}
      />,
    );
    expect(screen.getByTitle("Lu")).toBeInTheDocument();
  });

  it("does not show read indicator for own unread messages", () => {
    render(
      <MessageThread
        messages={[mockMessages[2]]}
        currentUserId="current-user"
        loading={false}
      />,
    );
    expect(screen.queryByTitle("Lu")).not.toBeInTheDocument();
  });

  /* --- Empty states --- */

  it("shows empty state when no messages and conversation selected", () => {
    render(
      <MessageThread
        messages={[]}
        currentUserId="current-user"
        loading={false}
      />,
    );
    expect(screen.getByText("Aucun message")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Envoyez le premier message pour demarrer la conversation",
      ),
    ).toBeInTheDocument();
  });

  it("shows select conversation state when no user id", () => {
    render(
      <MessageThread messages={[]} currentUserId={null} loading={false} />,
    );
    expect(
      screen.getByText("Selectionnez une conversation"),
    ).toBeInTheDocument();
  });

  /* --- Loading state --- */

  it("renders loading skeletons when loading", () => {
    const { container } = render(
      <MessageThread
        messages={[]}
        currentUserId="current-user"
        loading={true}
      />,
    );
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(3);
  });

  /* --- Conversation status --- */

  it("shows resolved banner for resolved conversations", () => {
    render(
      <MessageThread
        messages={mockMessages}
        currentUserId="current-user"
        loading={false}
        conversationStatus="resolved"
      />,
    );
    expect(screen.getByText(/résolue/)).toBeInTheDocument();
  });

  it("shows archived banner for archived conversations", () => {
    render(
      <MessageThread
        messages={mockMessages}
        currentUserId="current-user"
        loading={false}
        conversationStatus="archived"
      />,
    );
    expect(screen.getByText(/archivée/)).toBeInTheDocument();
  });

  it("does not show banner for open conversations", () => {
    render(
      <MessageThread
        messages={mockMessages}
        currentUserId="current-user"
        loading={false}
        conversationStatus="open"
      />,
    );
    expect(screen.queryByText(/resolue|archivee/)).not.toBeInTheDocument();
  });

  /* --- Accessibility --- */

  it("renders messages in a log role", () => {
    render(
      <MessageThread
        messages={mockMessages}
        currentUserId="current-user"
        loading={false}
      />,
    );
    expect(screen.getByRole("log")).toBeInTheDocument();
  });

  /* --- Auto-scroll --- */

  it("scrolls to bottom when messages change", () => {
    render(
      <MessageThread
        messages={mockMessages}
        currentUserId="current-user"
        loading={false}
      />,
    );
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  /* --- Timestamps --- */

  it("renders message timestamps", () => {
    render(
      <MessageThread
        messages={mockMessages}
        currentUserId="current-user"
        loading={false}
      />,
    );
    // Should render formatted dates
    const timeElements = screen.getAllByText(/\d{2}\/\d{2}/);
    expect(timeElements.length).toBeGreaterThanOrEqual(1);
  });
});
