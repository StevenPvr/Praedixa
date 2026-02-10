import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

/* ────────────────────────────────────────────── */
/*  Mocks                                         */
/* ────────────────────────────────────────────── */

const mockUseApiGet = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@praedixa/ui", () => ({
  Card: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/status-badge", () => ({
  StatusBadge: ({ variant, label }: { variant: string; label: string }) => (
    <span data-testid="status-badge" data-variant={variant}>
      {label}
    </span>
  ),
}));

vi.mock("lucide-react", () => ({
  MessageSquare: ({ className }: { className?: string }) => (
    <span data-testid="icon-message-square" className={className} />
  ),
  User: ({ className }: { className?: string }) => (
    <span data-testid="icon-user" className={className} />
  ),
  Headphones: ({ className }: { className?: string }) => (
    <span data-testid="icon-headphones" className={className} />
  ),
}));

import { ConversationList, formatRelativeTime } from "../conversation-list";

/* ────────────────────────────────────────────── */
/*  Fixtures                                      */
/* ────────────────────────────────────────────── */

const MOCK_CONVERSATIONS = [
  {
    id: "conv-1",
    organizationId: "org-1",
    subject: "Probleme import",
    status: "open" as const,
    initiatedBy: "client" as const,
    lastMessageAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    createdAt: "2026-02-08T10:00:00Z",
    updatedAt: "2026-02-08T12:00:00Z",
  },
  {
    id: "conv-2",
    organizationId: "org-1",
    subject: "Question config",
    status: "resolved" as const,
    initiatedBy: "admin" as const,
    lastMessageAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    createdAt: "2026-02-07T08:00:00Z",
    updatedAt: "2026-02-07T10:00:00Z",
  },
  {
    id: "conv-3",
    organizationId: "org-1",
    subject: "Demande API",
    status: "archived" as const,
    initiatedBy: "client" as const,
    lastMessageAt: null,
    createdAt: "2026-02-06T08:00:00Z",
    updatedAt: "2026-02-06T08:00:00Z",
  },
];

function setupMock(
  overrides: {
    data?: unknown;
    loading?: boolean;
    error?: string | null;
  } = {},
) {
  mockUseApiGet.mockReturnValue({
    data: MOCK_CONVERSATIONS,
    loading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  });
}

/* ────────────────────────────────────────────── */
/*  Tests                                         */
/* ────────────────────────────────────────────── */

describe("ConversationList", () => {
  const onSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state", () => {
    setupMock({ loading: true, data: null });
    render(
      <ConversationList orgId="org-1" selectedId={null} onSelect={onSelect} />,
    );
    expect(screen.getByText("Chargement...")).toBeInTheDocument();
  });

  it("shows error state", () => {
    setupMock({ error: "Network error", data: null });
    render(
      <ConversationList orgId="org-1" selectedId={null} onSelect={onSelect} />,
    );
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("shows empty state when no conversations", () => {
    setupMock({ data: [] });
    render(
      <ConversationList orgId="org-1" selectedId={null} onSelect={onSelect} />,
    );
    expect(screen.getByText("Aucune conversation")).toBeInTheDocument();
  });

  it("renders all conversations by default", () => {
    setupMock();
    render(
      <ConversationList orgId="org-1" selectedId={null} onSelect={onSelect} />,
    );
    expect(screen.getByText("Probleme import")).toBeInTheDocument();
    expect(screen.getByText("Question config")).toBeInTheDocument();
    expect(screen.getByText("Demande API")).toBeInTheDocument();
  });

  it("renders status badges", () => {
    setupMock();
    render(
      <ConversationList orgId="org-1" selectedId={null} onSelect={onSelect} />,
    );
    const badges = screen.getAllByTestId("status-badge");
    expect(badges).toHaveLength(3);
    expect(badges[0]).toHaveTextContent("Ouverte");
    expect(badges[1]).toHaveTextContent("Resolue");
    expect(badges[2]).toHaveTextContent("Archivee");
  });

  it("shows client icon for client-initiated conversations", () => {
    setupMock();
    render(
      <ConversationList orgId="org-1" selectedId={null} onSelect={onSelect} />,
    );
    expect(screen.getAllByTestId("icon-user")).toHaveLength(2);
  });

  it("shows admin icon for admin-initiated conversations", () => {
    setupMock();
    render(
      <ConversationList orgId="org-1" selectedId={null} onSelect={onSelect} />,
    );
    expect(screen.getByTestId("icon-headphones")).toBeInTheDocument();
  });

  it("calls onSelect when clicking a conversation", () => {
    setupMock();
    render(
      <ConversationList orgId="org-1" selectedId={null} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByText("Probleme import"));
    expect(onSelect).toHaveBeenCalledWith("conv-1");
  });

  it("highlights selected conversation", () => {
    setupMock();
    const { container } = render(
      <ConversationList
        orgId="org-1"
        selectedId="conv-1"
        onSelect={onSelect}
      />,
    );
    const buttons = container.querySelectorAll("button[type='button']");
    // First 3 are filter tabs, next 3 are conversations
    const convButton = buttons[3];
    expect(convButton.className).toContain("amber-50");
  });

  it("filters by open status", () => {
    setupMock();
    render(
      <ConversationList orgId="org-1" selectedId={null} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByText("Ouvertes"));
    expect(screen.getByText("Probleme import")).toBeInTheDocument();
    expect(screen.queryByText("Question config")).not.toBeInTheDocument();
    expect(screen.queryByText("Demande API")).not.toBeInTheDocument();
  });

  it("filters by resolved status", () => {
    setupMock();
    render(
      <ConversationList orgId="org-1" selectedId={null} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByText("Resolues"));
    expect(screen.queryByText("Probleme import")).not.toBeInTheDocument();
    expect(screen.getByText("Question config")).toBeInTheDocument();
  });

  it("resets filter to all", () => {
    setupMock();
    render(
      <ConversationList orgId="org-1" selectedId={null} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByText("Ouvertes"));
    expect(screen.queryByText("Question config")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Toutes"));
    expect(screen.getByText("Question config")).toBeInTheDocument();
  });

  it("renders 3 filter tabs", () => {
    setupMock();
    render(
      <ConversationList orgId="org-1" selectedId={null} onSelect={onSelect} />,
    );
    expect(screen.getByText("Toutes")).toBeInTheDocument();
    expect(screen.getByText("Ouvertes")).toBeInTheDocument();
    expect(screen.getByText("Resolues")).toBeInTheDocument();
  });

  it("shows empty state when filter yields no results", () => {
    setupMock({ data: [MOCK_CONVERSATIONS[0]] }); // only "open"
    render(
      <ConversationList orgId="org-1" selectedId={null} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByText("Resolues"));
    expect(screen.getByText("Aucune conversation")).toBeInTheDocument();
  });

  it("passes orgId to useApiGet", () => {
    setupMock();
    render(
      <ConversationList orgId="org-1" selectedId={null} onSelect={onSelect} />,
    );
    expect(mockUseApiGet).toHaveBeenCalledWith(
      expect.stringContaining("/organizations/org-1/conversations"),
      expect.objectContaining({ pollInterval: 15000 }),
    );
  });
});

describe("formatRelativeTime", () => {
  it("returns 'a l'instant' for recent times", () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe("a l'instant");
  });

  it("returns minutes for <1h", () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(formatRelativeTime(tenMinAgo)).toBe("il y a 10min");
  });

  it("returns hours for <24h", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    expect(formatRelativeTime(twoHoursAgo)).toBe("il y a 2h");
  });

  it("returns days for >=24h", () => {
    const threeDaysAgo = new Date(
      Date.now() - 3 * 24 * 3600 * 1000,
    ).toISOString();
    expect(formatRelativeTime(threeDaysAgo)).toBe("il y a 3j");
  });
});
