import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/* ────────────────────────────────────────────── */
/*  Mocks                                         */
/* ────────────────────────────────────────────── */

const mockUseApiGet = vi.fn();
const mockMutate = vi.fn();
const mockUseApiPatch = vi.fn(() => ({
  mutate: mockMutate,
  loading: false,
  error: null,
  data: null,
  reset: vi.fn(),
}));

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
  useApiPatch: (...args: unknown[]) => mockUseApiPatch(...args),
  useApiPost: vi.fn(() => ({
    mutate: vi.fn().mockResolvedValue(null),
    loading: false,
    error: null,
    data: null,
    reset: vi.fn(),
  })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@praedixa/ui", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    _size,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    _size?: string;
    "aria-label"?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      aria-label={rest["aria-label"]}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/status-badge", () => ({
  StatusBadge: ({ label, variant }: { label: string; variant: string }) => (
    <span data-testid="status-badge" data-variant={variant}>
      {label}
    </span>
  ),
}));

vi.mock("lucide-react", () => ({
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

import { MessageThread } from "../message-thread";

/* ────────────────────────────────────────────── */
/*  Fixtures                                      */
/* ────────────────────────────────────────────── */

const MOCK_MESSAGES = [
  {
    id: "msg-1",
    conversationId: "conv-1",
    senderUserId: "user-1",
    senderRole: "org_admin",
    content: "Bonjour, nous avons un probleme d'import.",
    isRead: true,
    createdAt: "2026-02-08T09:12:00Z",
    updatedAt: "2026-02-08T09:12:00Z",
  },
  {
    id: "msg-2",
    conversationId: "conv-1",
    senderUserId: "admin-1",
    senderRole: "super_admin",
    content: "Nous allons regarder cela immediatement.",
    isRead: false,
    createdAt: "2026-02-08T09:15:00Z",
    updatedAt: "2026-02-08T09:15:00Z",
  },
  {
    id: "msg-3",
    conversationId: "conv-1",
    senderUserId: "user-1",
    senderRole: "org_admin",
    content: "Merci pour votre reactivite.",
    isRead: true,
    createdAt: "2026-02-09T10:00:00Z",
    updatedAt: "2026-02-09T10:00:00Z",
  },
];

const mockRefetch = vi.fn();

function setupMock(
  overrides: {
    data?: unknown;
    loading?: boolean;
    error?: string | null;
  } = {},
) {
  mockUseApiGet.mockReturnValue({
    data: MOCK_MESSAGES,
    loading: false,
    error: null,
    refetch: mockRefetch,
    ...overrides,
  });
}

/* ────────────────────────────────────────────── */
/*  Tests                                         */
/* ────────────────────────────────────────────── */

describe("MessageThread", () => {
  const onStatusChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("shows loading state", () => {
    setupMock({ loading: true, data: null });
    render(
      <MessageThread
        conversationId="conv-1"
        conversationSubject="Probleme import"
        conversationStatus="open"
        onStatusChange={onStatusChange}
      />,
    );
    expect(screen.getByText("Chargement des messages...")).toBeInTheDocument();
  });

  it("shows error state", () => {
    setupMock({ error: "Erreur reseau", data: null });
    render(
      <MessageThread
        conversationId="conv-1"
        conversationSubject="Probleme import"
        conversationStatus="open"
        onStatusChange={onStatusChange}
      />,
    );
    expect(screen.getByText("Erreur reseau")).toBeInTheDocument();
  });

  it("shows empty state when no messages", () => {
    setupMock({ data: [] });
    render(
      <MessageThread
        conversationId="conv-1"
        conversationSubject="Probleme import"
        conversationStatus="open"
        onStatusChange={onStatusChange}
      />,
    );
    expect(
      screen.getByText("Aucun message dans cette conversation"),
    ).toBeInTheDocument();
  });

  it("renders conversation subject in header", () => {
    setupMock();
    render(
      <MessageThread
        conversationId="conv-1"
        conversationSubject="Probleme import"
        conversationStatus="open"
        onStatusChange={onStatusChange}
      />,
    );
    expect(screen.getByText("Probleme import")).toBeInTheDocument();
  });

  it("renders status badge in header", () => {
    setupMock();
    render(
      <MessageThread
        conversationId="conv-1"
        conversationSubject="Probleme import"
        conversationStatus="open"
        onStatusChange={onStatusChange}
      />,
    );
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveTextContent("Ouverte");
    expect(badge).toHaveAttribute("data-variant", "warning");
  });

  it("renders resolved status badge correctly", () => {
    setupMock();
    render(
      <MessageThread
        conversationId="conv-1"
        conversationSubject="Sujet"
        conversationStatus="resolved"
        onStatusChange={onStatusChange}
      />,
    );
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveTextContent("Resolue");
    expect(badge).toHaveAttribute("data-variant", "success");
  });

  it("renders archived status badge correctly", () => {
    setupMock();
    render(
      <MessageThread
        conversationId="conv-1"
        conversationSubject="Sujet"
        conversationStatus="archived"
        onStatusChange={onStatusChange}
      />,
    );
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveTextContent("Archivee");
  });

  it("renders messages with content", () => {
    setupMock();
    render(
      <MessageThread
        conversationId="conv-1"
        conversationSubject="Probleme import"
        conversationStatus="open"
        onStatusChange={onStatusChange}
      />,
    );
    expect(
      screen.getByText("Bonjour, nous avons un probleme d'import."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Nous allons regarder cela immediatement."),
    ).toBeInTheDocument();
  });

  it("shows admin label for admin messages", () => {
    setupMock();
    render(
      <MessageThread
        conversationId="conv-1"
        conversationSubject="Probleme import"
        conversationStatus="open"
        onStatusChange={onStatusChange}
      />,
    );
    const adminLabels = screen.getAllByText("admin");
    expect(adminLabels.length).toBeGreaterThanOrEqual(1);
  });

  it("shows sender role for client messages", () => {
    setupMock();
    render(
      <MessageThread
        conversationId="conv-1"
        conversationSubject="Probleme import"
        conversationStatus="open"
        onStatusChange={onStatusChange}
      />,
    );
    const roleLabels = screen.getAllByText("org_admin");
    expect(roleLabels.length).toBeGreaterThanOrEqual(1);
  });

  it("shows read indicators (check-check for read, clock for unread)", () => {
    setupMock();
    render(
      <MessageThread
        conversationId="conv-1"
        conversationSubject="Probleme import"
        conversationStatus="open"
        onStatusChange={onStatusChange}
      />,
    );
    // msg-1 and msg-3 are read, msg-2 is not
    expect(screen.getAllByTestId("icon-check-check")).toHaveLength(2);
    expect(screen.getAllByTestId("icon-clock")).toHaveLength(1);
  });

  it("renders date separators between different days", () => {
    setupMock();
    render(
      <MessageThread
        conversationId="conv-1"
        conversationSubject="Probleme import"
        conversationStatus="open"
        onStatusChange={onStatusChange}
      />,
    );
    // msg-1 and msg-2 are on Feb 8, msg-3 is on Feb 9
    // So we should see 2 date separators
    const dateSeparators = screen
      .getAllByText(/fev|Feb|feb|2026/)
      .filter((el) => el.closest("span")?.className?.includes("rounded-full"));
    expect(dateSeparators.length).toBeGreaterThanOrEqual(2);
  });

  it("shows Resoudre button when status is open", () => {
    setupMock();
    render(
      <MessageThread
        conversationId="conv-1"
        conversationSubject="Probleme import"
        conversationStatus="open"
        onStatusChange={onStatusChange}
      />,
    );
    expect(screen.getByText("Resoudre")).toBeInTheDocument();
  });

  it("shows Archiver button when status is open", () => {
    setupMock();
    render(
      <MessageThread
        conversationId="conv-1"
        conversationSubject="Probleme import"
        conversationStatus="open"
        onStatusChange={onStatusChange}
      />,
    );
    expect(screen.getByText("Archiver")).toBeInTheDocument();
  });

  it("hides Resoudre button when status is resolved", () => {
    setupMock();
    render(
      <MessageThread
        conversationId="conv-1"
        conversationSubject="Sujet"
        conversationStatus="resolved"
        onStatusChange={onStatusChange}
      />,
    );
    expect(screen.queryByText("Resoudre")).not.toBeInTheDocument();
  });

  it("hides Archiver button when status is archived", () => {
    setupMock();
    render(
      <MessageThread
        conversationId="conv-1"
        conversationSubject="Sujet"
        conversationStatus="archived"
        onStatusChange={onStatusChange}
      />,
    );
    expect(screen.queryByText("Archiver")).not.toBeInTheDocument();
  });

  it("calls patchStatus with resolved on Resoudre click", async () => {
    setupMock();
    mockMutate.mockResolvedValue({});
    render(
      <MessageThread
        conversationId="conv-1"
        conversationSubject="Probleme import"
        conversationStatus="open"
        onStatusChange={onStatusChange}
      />,
    );
    fireEvent.click(screen.getByText("Resoudre"));
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({ status: "resolved" });
    });
    expect(onStatusChange).toHaveBeenCalled();
  });

  it("calls patchStatus with archived on Archiver click", async () => {
    setupMock();
    mockMutate.mockResolvedValue({});
    render(
      <MessageThread
        conversationId="conv-1"
        conversationSubject="Probleme import"
        conversationStatus="open"
        onStatusChange={onStatusChange}
      />,
    );
    fireEvent.click(screen.getByText("Archiver"));
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({ status: "archived" });
    });
    expect(onStatusChange).toHaveBeenCalled();
  });

  it("passes conversationId to useApiGet", () => {
    setupMock();
    render(
      <MessageThread
        conversationId="conv-1"
        conversationSubject="Sujet"
        conversationStatus="open"
        onStatusChange={onStatusChange}
      />,
    );
    expect(mockUseApiGet).toHaveBeenCalledWith(
      expect.stringContaining("/conversations/conv-1/messages"),
      expect.objectContaining({ pollInterval: 5000 }),
    );
  });

  it("disables message input when conversation is resolved", () => {
    setupMock();
    render(
      <MessageThread
        conversationId="conv-1"
        conversationSubject="Sujet"
        conversationStatus="resolved"
        onStatusChange={onStatusChange}
      />,
    );
    expect(screen.getByText(/conversation est fermee/)).toBeInTheDocument();
  });

  it("disables message input when conversation is archived", () => {
    setupMock();
    render(
      <MessageThread
        conversationId="conv-1"
        conversationSubject="Sujet"
        conversationStatus="archived"
        onStatusChange={onStatusChange}
      />,
    );
    expect(screen.getByText(/conversation est fermee/)).toBeInTheDocument();
  });

  it("auto-scrolls to bottom on mount", () => {
    setupMock();
    render(
      <MessageThread
        conversationId="conv-1"
        conversationSubject="Sujet"
        conversationStatus="open"
        onStatusChange={onStatusChange}
      />,
    );
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
