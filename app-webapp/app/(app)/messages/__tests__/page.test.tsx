import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MessagesPage from "../page";

/* ── Hoisted mocks ────────────────────────────── */

const { mockUseApiGet } = vi.hoisted(() => ({
  mockUseApiGet: vi.fn(),
}));
const { mockMutate } = vi.hoisted(() => ({
  mockMutate: vi.fn(),
}));
const { mockPostState } = vi.hoisted(() => ({
  mockPostState: {
    loading: false,
    error: null as string | null,
  },
}));
const { mockRefetchConvs, mockRefetchMessages } = vi.hoisted(() => ({
  mockRefetchConvs: vi.fn(),
  mockRefetchMessages: vi.fn(),
}));

/* ── Module mocks ─────────────────────────────── */

vi.mock("next/navigation", () => ({
  usePathname: () => "/messages",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
  useApiPost: () => ({
    mutate: mockMutate,
    loading: mockPostState.loading,
    error: mockPostState.error,
    data: null,
    reset: vi.fn(),
  }),
}));

vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  ),
}));

vi.mock("@/components/ui/detail-card", () => ({
  DetailCard: ({
    children,
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div data-testid="detail-card">{children}</div>,
}));

vi.mock("@/components/error-fallback", () => ({
  ErrorFallback: ({ message }: { message?: string }) => (
    <div data-testid="error-fallback">{message}</div>
  ),
}));

vi.mock("@/components/chat/conversation-list", () => ({
  ConversationList: ({
    conversations,
    selectedId,
    onSelect,
    onNewConversation,
    loading,
  }: {
    conversations: { id: string; subject: string }[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onNewConversation: () => void;
    loading: boolean;
  }) => (
    <div data-testid="conversation-list" data-loading={String(loading)}>
      {conversations.map((c) => (
        <button
          key={c.id}
          data-testid={`select-conv-${c.id}`}
          data-selected={String(c.id === selectedId)}
          onClick={() => onSelect(c.id)}
        >
          {c.subject}
        </button>
      ))}
      <button data-testid="new-conv-btn" onClick={onNewConversation}>
        New
      </button>
    </div>
  ),
}));

vi.mock("@/components/chat/message-thread", () => ({
  MessageThread: ({
    messages,
    currentUserId,
    loading,
  }: {
    messages: { id: string; content: string }[];
    currentUserId: string | null;
    loading: boolean;
  }) => (
    <div
      data-testid="message-thread"
      data-loading={String(loading)}
      data-user={currentUserId ?? "none"}
    >
      {messages.map((m) => (
        <p key={m.id}>{m.content}</p>
      ))}
    </div>
  ),
}));

vi.mock("@/components/chat/message-input", () => ({
  MessageInput: ({
    onSend,
    disabled,
    sending,
  }: {
    onSend: (content: string) => void;
    disabled: boolean;
    sending: boolean;
  }) => (
    <div
      data-testid="message-input"
      data-disabled={String(disabled)}
      data-sending={String(sending)}
    >
      <button data-testid="send-btn" onClick={() => onSend("Test message")}>
        Send
      </button>
    </div>
  ),
}));

vi.mock("@/lib/auth/client", () => ({
  useCurrentUser: () => ({
    id: "user-abc",
    email: "test@example.com",
    role: "org_admin",
  }),
}));

/* ── Mock data ────────────────────────────────── */

const mockConversations = [
  {
    id: "c1",
    organizationId: "org1",
    subject: "Question previsions",
    status: "open",
    initiatedBy: "client",
    lastMessageAt: "2026-02-08T10:00:00Z",
    createdAt: "2026-02-08T10:00:00Z",
    updatedAt: "2026-02-08T10:00:00Z",
  },
  {
    id: "c2",
    organizationId: "org1",
    subject: "Resolu",
    status: "resolved",
    initiatedBy: "admin",
    lastMessageAt: "2026-02-07T10:00:00Z",
    createdAt: "2026-02-07T10:00:00Z",
    updatedAt: "2026-02-07T10:00:00Z",
  },
];

const mockMessages = [
  {
    id: "m1",
    conversationId: "c1",
    senderUserId: "admin",
    senderRole: "super_admin",
    content: "Hello",
    isRead: true,
    createdAt: "2026-02-08T10:00:00Z",
    updatedAt: "2026-02-08T10:00:00Z",
  },
];

/* ── Helper ───────────────────────────────────── */

function setupMocks(overrides?: Partial<Record<string, unknown>>) {
  mockUseApiGet.mockImplementation((url: string | null) => {
    if (url === "/api/v1/conversations") {
      return {
        data:
          overrides?.conversations !== undefined
            ? overrides.conversations
            : mockConversations,
        loading: overrides?.convsLoading ?? false,
        error: overrides?.convsError ?? null,
        refetch: mockRefetchConvs,
      };
    }
    if (url?.includes("/messages")) {
      return {
        data:
          overrides?.messages !== undefined ? overrides.messages : mockMessages,
        loading: overrides?.msgsLoading ?? false,
        error: overrides?.msgsError ?? null,
        refetch: mockRefetchMessages,
      };
    }
    // url === null (no conversation selected)
    return { data: null, loading: false, error: null, refetch: vi.fn() };
  });
}

/* ── Tests ────────────────────────────────────── */

describe("MessagesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPostState.loading = false;
    mockPostState.error = null;
    setupMocks();
    mockMutate.mockResolvedValue({ id: "new-id", subject: "Test" });
  });

  it("renders the page header", () => {
    render(<MessagesPage />);
    expect(
      screen.getByRole("heading", { name: "Messagerie support" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Un sujet par conversation. Posez votre question et suivez la reponse ici.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the conversation list", () => {
    render(<MessagesPage />);
    expect(screen.getByTestId("conversation-list")).toBeInTheDocument();
  });

  it("renders the message thread", () => {
    render(<MessagesPage />);
    expect(screen.getByTestId("message-thread")).toBeInTheDocument();
  });

  it("does not render message input when no conversation is selected", () => {
    render(<MessagesPage />);
    expect(screen.queryByTestId("message-input")).not.toBeInTheDocument();
  });

  /* --- Conversation selection --- */

  it("shows message input when a conversation is selected", () => {
    render(<MessagesPage />);
    fireEvent.click(screen.getByTestId("select-conv-c1"));
    expect(screen.getByTestId("message-input")).toBeInTheDocument();
  });

  it("fetches messages when conversation is selected", () => {
    render(<MessagesPage />);
    fireEvent.click(screen.getByTestId("select-conv-c1"));
    const calls = mockUseApiGet.mock.calls.map((c: unknown[]) => c[0]);
    expect(calls).toContain("/api/v1/conversations/c1/messages");
  });

  it("shows conversation header when selected", () => {
    render(<MessagesPage />);
    fireEvent.click(screen.getByTestId("select-conv-c1"));
    // Subject appears in both conversation list and header
    const subjects = screen.getAllByText("Question previsions");
    expect(subjects.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Ouvert")).toBeInTheDocument();
  });

  it("disables input for resolved conversations", () => {
    render(<MessagesPage />);
    fireEvent.click(screen.getByTestId("select-conv-c2"));
    const input = screen.getByTestId("message-input");
    expect(input.dataset.disabled).toBe("true");
  });

  /* --- New conversation --- */

  it("shows subject input when new conversation button is clicked", () => {
    render(<MessagesPage />);
    fireEvent.click(screen.getByTestId("new-conv-btn"));
    expect(screen.getByLabelText("Sujet")).toBeInTheDocument();
  });

  it("creates conversation on submit", async () => {
    render(<MessagesPage />);
    fireEvent.click(screen.getByTestId("new-conv-btn"));
    const input = screen.getByLabelText("Sujet");
    fireEvent.change(input, { target: { value: "Nouveau sujet" } });
    fireEvent.click(screen.getByText("Creer le sujet"));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({ subject: "Nouveau sujet" });
    });
  });

  it("creates conversation on Enter key", async () => {
    render(<MessagesPage />);
    fireEvent.click(screen.getByTestId("new-conv-btn"));
    const input = screen.getByLabelText("Sujet");
    fireEvent.change(input, { target: { value: "Enter sujet" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({ subject: "Enter sujet" });
    });
  });

  it("refetches conversations after creating", async () => {
    render(<MessagesPage />);
    fireEvent.click(screen.getByTestId("new-conv-btn"));
    const input = screen.getByLabelText("Sujet");
    fireEvent.change(input, { target: { value: "Test" } });
    fireEvent.click(screen.getByText("Creer le sujet"));

    await waitFor(() => {
      expect(mockRefetchConvs).toHaveBeenCalled();
    });
  });

  /* --- Send message --- */

  it("sends message and refetches", async () => {
    render(<MessagesPage />);
    fireEvent.click(screen.getByTestId("select-conv-c1"));
    fireEvent.click(screen.getByTestId("send-btn"));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({ content: "Test message" });
    });
  });

  /* --- Error states --- */

  it("shows error fallback on conversations error", () => {
    setupMocks({ convsError: "Network error" });
    render(<MessagesPage />);
    expect(screen.getByTestId("error-fallback")).toHaveTextContent(
      "Network error",
    );
  });

  it("shows error fallback on messages error", () => {
    setupMocks({ msgsError: "Messages error" });
    render(<MessagesPage />);
    fireEvent.click(screen.getByTestId("select-conv-c1"));
    expect(screen.getByTestId("error-fallback")).toHaveTextContent(
      "Messages error",
    );
  });

  /* --- Loading states --- */

  it("passes loading to conversation list", () => {
    setupMocks({ convsLoading: true, conversations: null });
    render(<MessagesPage />);
    const list = screen.getByTestId("conversation-list");
    expect(list.dataset.loading).toBe("true");
  });

  it("passes loading to message thread", () => {
    setupMocks({ msgsLoading: true });
    render(<MessagesPage />);
    fireEvent.click(screen.getByTestId("select-conv-c1"));
    const thread = screen.getByTestId("message-thread");
    expect(thread.dataset.loading).toBe("true");
  });

  /* --- API endpoints --- */

  it("calls useApiGet with conversations endpoint", () => {
    render(<MessagesPage />);
    const calls = mockUseApiGet.mock.calls.map((c: unknown[]) => c[0]);
    expect(calls).toContain("/api/v1/conversations");
  });

  it("passes null to useApiGet when no conversation selected", () => {
    render(<MessagesPage />);
    const calls = mockUseApiGet.mock.calls.map((c: unknown[]) => c[0]);
    expect(calls).toContain(null);
  });

  /* --- Create button disabled state --- */

  it("disables create button when subject is empty", () => {
    render(<MessagesPage />);
    fireEvent.click(screen.getByTestId("new-conv-btn"));
    const createBtn = screen.getByText("Creer le sujet");
    expect(createBtn).toBeDisabled();
  });
});
