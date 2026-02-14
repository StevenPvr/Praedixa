import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConversationList } from "../conversation-list";

vi.mock("@praedixa/ui", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
  SkeletonCard: ({ className }: { className?: string }) => (
    <div
      data-testid="skeleton-card"
      className={className}
      role="status"
      aria-label="Chargement"
    />
  ),
  formatRelativeTime: (dateStr: string | null) => {
    if (!dateStr) return "";
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "A l'instant";
    if (diffMin < 60) return `Il y a ${diffMin}min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Il y a ${diffH}h`;
    return `Il y a ${Math.floor(diffH / 24)}j`;
  },
}));

vi.mock("lucide-react", () => ({
  Plus: () => <svg data-testid="icon-plus" />,
}));

const mockConversations = [
  {
    id: "c1",
    organizationId: "org1",
    subject: "Question previsions",
    status: "open" as const,
    initiatedBy: "client" as const,
    lastMessageAt: new Date().toISOString(),
    createdAt: "2026-02-08T10:00:00Z",
    updatedAt: "2026-02-08T10:00:00Z",
  },
  {
    id: "c2",
    organizationId: "org1",
    subject: "Probleme donnees",
    status: "resolved" as const,
    initiatedBy: "admin" as const,
    lastMessageAt: "2026-02-07T10:00:00Z",
    createdAt: "2026-02-07T10:00:00Z",
    updatedAt: "2026-02-07T10:00:00Z",
  },
  {
    id: "c3",
    organizationId: "org1",
    subject: "Config archivee",
    status: "archived" as const,
    initiatedBy: "client" as const,
    lastMessageAt: null,
    createdAt: "2026-02-06T10:00:00Z",
    updatedAt: "2026-02-06T10:00:00Z",
  },
];

describe("ConversationList", () => {
  const defaultProps = {
    conversations: mockConversations,
    selectedId: null as string | null,
    onSelect: vi.fn(),
    onNewConversation: vi.fn(),
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* --- Rendering --- */

  it("renders the conversations header", () => {
    render(<ConversationList {...defaultProps} />);
    expect(screen.getByText("Conversations")).toBeInTheDocument();
  });

  it("renders the new conversation button", () => {
    render(<ConversationList {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /nouvelle conversation/i }),
    ).toBeInTheDocument();
  });

  it("renders all conversations", () => {
    render(<ConversationList {...defaultProps} />);
    expect(screen.getByText("Question previsions")).toBeInTheDocument();
    expect(screen.getByText("Probleme donnees")).toBeInTheDocument();
    expect(screen.getByText("Config archivee")).toBeInTheDocument();
  });

  it("renders status badges", () => {
    render(<ConversationList {...defaultProps} />);
    expect(screen.getByText("Ouvert")).toBeInTheDocument();
    expect(screen.getByText("Resolu")).toBeInTheDocument();
    expect(screen.getByText("Archive")).toBeInTheDocument();
  });

  /* --- Selection --- */

  it("calls onSelect when a conversation is clicked", () => {
    render(<ConversationList {...defaultProps} />);
    fireEvent.click(screen.getByText("Question previsions"));
    expect(defaultProps.onSelect).toHaveBeenCalledWith("c1");
  });

  it("highlights the selected conversation", () => {
    render(<ConversationList {...defaultProps} selectedId="c1" />);
    const btn = screen.getByText("Question previsions").closest("button");
    expect(btn).toHaveAttribute("aria-current", "true");
  });

  it("does not highlight non-selected conversations", () => {
    render(<ConversationList {...defaultProps} selectedId="c1" />);
    const btn = screen.getByText("Probleme donnees").closest("button");
    expect(btn).not.toHaveAttribute("aria-current");
  });

  /* --- New conversation --- */

  it("calls onNewConversation when button is clicked", () => {
    render(<ConversationList {...defaultProps} />);
    fireEvent.click(
      screen.getByRole("button", { name: /nouvelle conversation/i }),
    );
    expect(defaultProps.onNewConversation).toHaveBeenCalledTimes(1);
  });

  /* --- Empty state --- */

  it("renders empty state when no conversations", () => {
    render(<ConversationList {...defaultProps} conversations={[]} />);
    expect(screen.getByText("Aucune conversation")).toBeInTheDocument();
    expect(screen.getByText("Démarrer une conversation")).toBeInTheDocument();
  });

  it("calls onNewConversation from empty state link", () => {
    render(<ConversationList {...defaultProps} conversations={[]} />);
    fireEvent.click(screen.getByText("Démarrer une conversation"));
    expect(defaultProps.onNewConversation).toHaveBeenCalledTimes(1);
  });

  /* --- Loading state --- */

  it("renders loading skeleton when loading", () => {
    render(<ConversationList {...defaultProps} loading={true} />);
    const skeletons = screen.getAllByTestId("skeleton-card");
    expect(skeletons).toHaveLength(3);
  });

  it("does not render conversations when loading", () => {
    render(<ConversationList {...defaultProps} loading={true} />);
    expect(screen.queryByText("Question previsions")).not.toBeInTheDocument();
  });

  /* --- Relative time --- */

  it("renders relative time for lastMessageAt", () => {
    render(<ConversationList {...defaultProps} />);
    // The first conversation has a recent timestamp, so it should show some relative text
    const timeTexts = screen.getAllByText(/Il y a|A l'instant/);
    expect(timeTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("does not render time for null lastMessageAt", () => {
    render(
      <ConversationList
        {...defaultProps}
        conversations={[mockConversations[2]]}
      />,
    );
    // The archived conversation has null lastMessageAt
    expect(screen.queryByText(/Il y a/)).not.toBeInTheDocument();
  });

  /* --- List structure --- */

  it("renders as a list element", () => {
    render(<ConversationList {...defaultProps} />);
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});
