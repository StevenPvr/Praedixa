import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/* ────────────────────────────────────────────── */
/*  Mocks                                         */
/* ────────────────────────────────────────────── */

const mockMutate = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useApiPost: () => ({
    mutate: mockMutate,
    loading: false,
    error: null,
    data: null,
    reset: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
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
}));

vi.mock("lucide-react", () => ({
  Send: ({ className }: { className?: string }) => (
    <span data-testid="icon-send" className={className} />
  ),
}));

import { MessageInput, MAX_CHARS } from "../message-input";

/* ────────────────────────────────────────────── */
/*  Tests                                         */
/* ────────────────────────────────────────────── */

describe("MessageInput", () => {
  const onSend = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockMutate.mockResolvedValue({ id: "msg-new" });
  });

  it("renders textarea and send button", () => {
    render(<MessageInput conversationId="conv-1" onSend={onSend} />);
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
    expect(screen.getByLabelText("Envoyer")).toBeInTheDocument();
  });

  it("shows disabled message when disabled", () => {
    render(
      <MessageInput conversationId="conv-1" disabled={true} onSend={onSend} />,
    );
    expect(screen.getByText(/conversation est fermee/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Message")).not.toBeInTheDocument();
  });

  it("sends message on button click", async () => {
    render(<MessageInput conversationId="conv-1" onSend={onSend} />);

    const textarea = screen.getByLabelText("Message");
    fireEvent.change(textarea, { target: { value: "Bonjour!" } });
    fireEvent.click(screen.getByLabelText("Envoyer"));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({ content: "Bonjour!" });
    });
    expect(onSend).toHaveBeenCalled();
  });

  it("sends message on Enter key (not Shift+Enter)", async () => {
    render(<MessageInput conversationId="conv-1" onSend={onSend} />);

    const textarea = screen.getByLabelText("Message");
    fireEvent.change(textarea, { target: { value: "Hello" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({ content: "Hello" });
    });
  });

  it("does not send on Shift+Enter", () => {
    render(<MessageInput conversationId="conv-1" onSend={onSend} />);

    const textarea = screen.getByLabelText("Message");
    fireEvent.change(textarea, { target: { value: "Hello" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("disables send button when textarea is empty", () => {
    render(<MessageInput conversationId="conv-1" onSend={onSend} />);
    const sendBtn = screen.getByLabelText("Envoyer");
    expect(sendBtn).toBeDisabled();
  });

  it("disables send button when content exceeds max chars", () => {
    render(<MessageInput conversationId="conv-1" onSend={onSend} />);

    const textarea = screen.getByLabelText("Message");
    fireEvent.change(textarea, {
      target: { value: "a".repeat(MAX_CHARS + 1) },
    });

    const sendBtn = screen.getByLabelText("Envoyer");
    expect(sendBtn).toBeDisabled();
  });

  it("shows character counter", () => {
    render(<MessageInput conversationId="conv-1" onSend={onSend} />);

    const textarea = screen.getByLabelText("Message");
    fireEvent.change(textarea, { target: { value: "Hello" } });

    expect(screen.getByText(`5/${MAX_CHARS}`)).toBeInTheDocument();
  });

  it("shows Shift+Enter hint", () => {
    render(<MessageInput conversationId="conv-1" onSend={onSend} />);
    expect(
      screen.getByText("Maj+Entree pour un retour a la ligne"),
    ).toBeInTheDocument();
  });

  it("clears textarea after successful send", async () => {
    render(<MessageInput conversationId="conv-1" onSend={onSend} />);

    const textarea = screen.getByLabelText("Message") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Test message" } });
    fireEvent.click(screen.getByLabelText("Envoyer"));

    await waitFor(() => {
      expect(textarea.value).toBe("");
    });
  });

  it("does not clear textarea on failed send", async () => {
    mockMutate.mockResolvedValue(null);
    render(<MessageInput conversationId="conv-1" onSend={onSend} />);

    const textarea = screen.getByLabelText("Message") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Test message" } });
    fireEvent.click(screen.getByLabelText("Envoyer"));

    await waitFor(() => {
      expect(textarea.value).toBe("Test message");
    });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("does not send whitespace-only messages", () => {
    render(<MessageInput conversationId="conv-1" onSend={onSend} />);

    const textarea = screen.getByLabelText("Message");
    fireEvent.change(textarea, { target: { value: "   " } });
    fireEvent.click(screen.getByLabelText("Envoyer"));

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("trims message content before sending", async () => {
    render(<MessageInput conversationId="conv-1" onSend={onSend} />);

    const textarea = screen.getByLabelText("Message");
    fireEvent.change(textarea, { target: { value: "  Hello world  " } });
    fireEvent.click(screen.getByLabelText("Envoyer"));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({ content: "Hello world" });
    });
  });
});
