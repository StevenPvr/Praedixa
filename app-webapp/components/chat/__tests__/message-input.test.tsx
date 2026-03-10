import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageInput } from "../message-input";

vi.mock("@praedixa/ui", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

describe("MessageInput", () => {
  const defaultProps = {
    onSend: vi.fn(),
    disabled: false,
    sending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* --- Rendering --- */

  it("renders the textarea", () => {
    render(<MessageInput {...defaultProps} />);
    expect(
      screen.getByRole("textbox", { name: /saisir un message/i }),
    ).toBeInTheDocument();
  });

  it("renders the send button", () => {
    render(<MessageInput {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /envoyer/i }),
    ).toBeInTheDocument();
  });

  it("shows placeholder text when enabled", () => {
    render(<MessageInput {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("Ecrivez votre message..."),
    ).toBeInTheDocument();
  });

  it("shows disabled placeholder when disabled", () => {
    render(<MessageInput {...defaultProps} disabled={true} />);
    expect(
      screen.getByPlaceholderText("Conversation fermee"),
    ).toBeInTheDocument();
  });

  /* --- Sending --- */

  it("calls onSend when send button is clicked with text", async () => {
    const user = userEvent.setup();
    render(<MessageInput {...defaultProps} />);
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Hello world");
    await user.click(screen.getByRole("button", { name: /envoyer/i }));
    expect(defaultProps.onSend).toHaveBeenCalledWith("Hello world");
  });

  it("clears input after sending", async () => {
    const user = userEvent.setup();
    render(<MessageInput {...defaultProps} />);
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Test message");
    await user.click(screen.getByRole("button", { name: /envoyer/i }));
    expect(textarea).toHaveValue("");
  });

  it("does not send empty message", async () => {
    const user = userEvent.setup();
    render(<MessageInput {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /envoyer/i }));
    expect(defaultProps.onSend).not.toHaveBeenCalled();
  });

  it("does not send whitespace-only message", async () => {
    const user = userEvent.setup();
    render(<MessageInput {...defaultProps} />);
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "   ");
    await user.click(screen.getByRole("button", { name: /envoyer/i }));
    expect(defaultProps.onSend).not.toHaveBeenCalled();
  });

  /* --- Keyboard --- */

  it("sends on Enter key", async () => {
    const user = userEvent.setup();
    render(<MessageInput {...defaultProps} />);
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Enter test");
    await user.keyboard("{Enter}");
    expect(defaultProps.onSend).toHaveBeenCalledWith("Enter test");
  });

  it("does not send on Shift+Enter", async () => {
    const user = userEvent.setup();
    render(<MessageInput {...defaultProps} />);
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Line 1");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(defaultProps.onSend).not.toHaveBeenCalled();
  });

  /* --- Disabled state --- */

  it("disables textarea when disabled", () => {
    render(<MessageInput {...defaultProps} disabled={true} />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("does not call onSend when disabled", async () => {
    render(<MessageInput {...defaultProps} disabled={true} />);
    // Can't type into disabled textarea, but button click should not work
    fireEvent.click(screen.getByRole("button", { name: /envoyer/i }));
    expect(defaultProps.onSend).not.toHaveBeenCalled();
  });

  /* --- Sending state --- */

  it("does not call onSend while sending", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<MessageInput {...defaultProps} />);
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Test");
    rerender(<MessageInput {...defaultProps} sending={true} />);
    await user.click(screen.getByRole("button", { name: /envoyer/i }));
    expect(defaultProps.onSend).not.toHaveBeenCalled();
  });

  /* --- Character limit --- */

  it("shows error when exceeding max characters", () => {
    render(<MessageInput {...defaultProps} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, {
      target: { value: "a".repeat(5001) },
    });
    expect(screen.getByText(/5001 \/ 5000/)).toBeInTheDocument();
  });

  it("does not show error within limit", () => {
    render(<MessageInput {...defaultProps} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, {
      target: { value: "Hello" },
    });
    expect(screen.queryByText(/caracteres maximum/)).not.toBeInTheDocument();
  });
});
