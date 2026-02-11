import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

/* ────────────────────────────────────────────── */
/*  Mocks                                         */
/* ────────────────────────────────────────────── */

const mockUseApiGet = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
  useApiPost: vi.fn(() => ({
    mutate: vi.fn().mockResolvedValue(null),
    loading: false,
    error: null,
    data: null,
    reset: vi.fn(),
  })),
  useApiPatch: vi.fn(() => ({
    mutate: vi.fn().mockResolvedValue(null),
    loading: false,
    error: null,
    data: null,
    reset: vi.fn(),
  })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockUseClientContext = vi.fn(() => ({
  orgId: "org-1",
  orgName: "Acme Logistics",
  selectedSiteId: null,
  setSelectedSiteId: vi.fn(),
  hierarchy: [],
}));

vi.mock("../../client-context", () => ({
  useClientContext: () => mockUseClientContext(),
}));

vi.mock("@praedixa/ui", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    size?: string;
    "aria-label"?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={rest["aria-label"]}
    >
      {children}
    </button>
  ),
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

vi.mock("@/components/ui/status-badge", () => ({
  StatusBadge: ({ label, variant }: { label: string; variant: string }) => (
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
  CheckCheck: ({ className }: { className?: string }) => (
    <span data-testid="icon-check-check" className={className} />
  ),
  Clock: ({ className }: { className?: string }) => (
    <span data-testid="icon-clock" className={className} />
  ),
  Send: ({ className }: { className?: string }) => (
    <span data-testid="icon-send" className={className} />
  ),
}));

import MessagesPage from "../page";

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
    lastMessageAt: "2026-02-08T12:00:00Z",
    createdAt: "2026-02-08T10:00:00Z",
    updatedAt: "2026-02-08T12:00:00Z",
  },
  {
    id: "conv-2",
    organizationId: "org-1",
    subject: "Question configuration",
    status: "resolved" as const,
    initiatedBy: "admin" as const,
    lastMessageAt: "2026-02-07T10:00:00Z",
    createdAt: "2026-02-07T08:00:00Z",
    updatedAt: "2026-02-07T10:00:00Z",
  },
];

const MOCK_MESSAGES = [
  {
    id: "msg-1",
    conversationId: "conv-1",
    senderUserId: "user-1",
    senderRole: "org_admin",
    content: "Bonjour, probleme d'import",
    isRead: true,
    createdAt: "2026-02-08T09:00:00Z",
    updatedAt: "2026-02-08T09:00:00Z",
  },
];

function setupMockApiGet(
  overrides: Record<
    string,
    {
      data?: unknown;
      loading?: boolean;
      error?: string | null;
    }
  > = {},
) {
  mockUseApiGet.mockImplementation((url: string) => {
    const base = {
      data: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    };

    if (url?.includes("/conversations/conv-") && url.includes("/messages")) {
      return { ...base, data: MOCK_MESSAGES, ...overrides["messages"] };
    }
    if (url?.includes("/conversations")) {
      return {
        ...base,
        data: MOCK_CONVERSATIONS,
        ...overrides["conversations"],
      };
    }
    return base;
  });
}

/* ────────────────────────────────────────────── */
/*  Tests                                         */
/* ────────────────────────────────────────────── */

describe("MessagesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("renders Conversations heading", () => {
    setupMockApiGet();
    render(<MessagesPage />);
    expect(screen.getByText("Conversations")).toBeInTheDocument();
  });

  it("renders empty state when no conversation is selected", () => {
    setupMockApiGet();
    render(<MessagesPage />);
    expect(
      screen.getByText(
        "Selectionnez une conversation pour afficher les messages",
      ),
    ).toBeInTheDocument();
  });

  it("renders conversation list from API data", () => {
    setupMockApiGet();
    render(<MessagesPage />);
    expect(screen.getByText("Probleme import")).toBeInTheDocument();
    expect(screen.getByText("Question configuration")).toBeInTheDocument();
  });

  it("shows message thread when conversation is selected", () => {
    setupMockApiGet();
    render(<MessagesPage />);

    fireEvent.click(screen.getByText("Probleme import"));

    // Thread should now show — subject appears in header too
    expect(screen.getByText("Bonjour, probleme d'import")).toBeInTheDocument();
  });

  it("passes orgId to conversation list endpoint", () => {
    setupMockApiGet();
    render(<MessagesPage />);
    expect(mockUseApiGet).toHaveBeenCalledWith(
      expect.stringContaining("/organizations/org-1/conversations"),
    );
  });

  it("uses useClientContext to get orgId", () => {
    setupMockApiGet();
    render(<MessagesPage />);
    expect(mockUseClientContext).toHaveBeenCalled();
  });

  it("renders the split layout with proper structure", () => {
    setupMockApiGet();
    const { container } = render(<MessagesPage />);
    const mainContainer = container.firstElementChild;
    expect(mainContainer?.className).toContain("flex");
    expect(mainContainer?.className).toContain("rounded-2xl");
    expect(mainContainer?.className).toContain("shadow-soft");
  });

  it("shows message thread empty icon when no conversation selected", () => {
    setupMockApiGet();
    render(<MessagesPage />);
    expect(
      screen.getAllByTestId("icon-message-square").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("hides empty state when conversation is selected", () => {
    setupMockApiGet();
    render(<MessagesPage />);

    fireEvent.click(screen.getByText("Probleme import"));

    expect(
      screen.queryByText(
        "Selectionnez une conversation pour afficher les messages",
      ),
    ).not.toBeInTheDocument();
  });
});
