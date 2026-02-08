import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useContext } from "react";
import { ToastProvider, ToastContext } from "../toast-provider";
import { ToastContainer, type ToastData } from "../toast";

vi.mock("@praedixa/ui", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  CheckCircle2: ({ className }: { className?: string }) => (
    <span data-testid="icon-success" className={className} />
  ),
  AlertTriangle: ({ className }: { className?: string }) => (
    <span data-testid="icon-warning" className={className} />
  ),
  Info: ({ className }: { className?: string }) => (
    <span data-testid="icon-info" className={className} />
  ),
  XCircle: ({ className }: { className?: string }) => (
    <span data-testid="icon-error" className={className} />
  ),
  X: ({ className }: { className?: string }) => (
    <span data-testid="icon-close" className={className} />
  ),
}));

describe("ToastContainer", () => {
  const mockDismiss = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    mockDismiss.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when toasts array is empty", () => {
    const { container } = render(
      <ToastContainer toasts={[]} onDismiss={mockDismiss} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders a success toast with correct icon", () => {
    const toasts: ToastData[] = [
      { id: "1", variant: "success", message: "Operation reussie" },
    ];
    render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);
    expect(screen.getByText("Operation reussie")).toBeInTheDocument();
    expect(screen.getByTestId("icon-success")).toBeInTheDocument();
  });

  it("renders an error toast with correct icon", () => {
    const toasts: ToastData[] = [
      { id: "1", variant: "error", message: "Erreur survenue" },
    ];
    render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);
    expect(screen.getByText("Erreur survenue")).toBeInTheDocument();
    expect(screen.getByTestId("icon-error")).toBeInTheDocument();
  });

  it("renders a warning toast with correct icon", () => {
    const toasts: ToastData[] = [
      { id: "1", variant: "warning", message: "Attention requise" },
    ];
    render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);
    expect(screen.getByText("Attention requise")).toBeInTheDocument();
    expect(screen.getByTestId("icon-warning")).toBeInTheDocument();
  });

  it("renders an info toast with correct icon", () => {
    const toasts: ToastData[] = [
      { id: "1", variant: "info", message: "Information" },
    ];
    render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);
    expect(screen.getByText("Information")).toBeInTheDocument();
    expect(screen.getByTestId("icon-info")).toBeInTheDocument();
  });

  it("renders multiple stacked toasts", () => {
    const toasts: ToastData[] = [
      { id: "1", variant: "success", message: "Premier" },
      { id: "2", variant: "error", message: "Deuxieme" },
    ];
    render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);
    expect(screen.getByText("Premier")).toBeInTheDocument();
    expect(screen.getByText("Deuxieme")).toBeInTheDocument();
  });

  it("has role=alert on each toast", () => {
    const toasts: ToastData[] = [
      { id: "1", variant: "info", message: "Test" },
    ];
    render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("has aria-live=polite on the container", () => {
    const toasts: ToastData[] = [
      { id: "1", variant: "info", message: "Test" },
    ];
    const { container } = render(
      <ToastContainer toasts={toasts} onDismiss={mockDismiss} />,
    );
    const liveRegion = container.querySelector("[aria-live]");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
  });

  it("auto-dismisses after default duration", () => {
    const toasts: ToastData[] = [
      { id: "1", variant: "success", message: "Auto dismiss" },
    ];
    render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);

    // Default duration is 4000ms + 200ms exit animation
    act(() => {
      vi.advanceTimersByTime(4200);
    });
    expect(mockDismiss).toHaveBeenCalledWith("1");
  });

  it("auto-dismisses after custom duration", () => {
    const toasts: ToastData[] = [
      { id: "1", variant: "success", message: "Custom", duration: 2000 },
    ];
    render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);

    act(() => {
      vi.advanceTimersByTime(2200);
    });
    expect(mockDismiss).toHaveBeenCalledWith("1");
  });

  it("dismiss button has accessible label", () => {
    const toasts: ToastData[] = [
      { id: "1", variant: "info", message: "Test" },
    ];
    render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);
    const button = screen.getByLabelText("Fermer la notification");
    expect(button).toBeInTheDocument();
  });

  it("clicking dismiss button triggers onDismiss with animation delay", () => {
    const toasts: ToastData[] = [
      { id: "1", variant: "info", message: "Dismiss me" },
    ];
    render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);

    act(() => {
      screen.getByLabelText("Fermer la notification").click();
    });

    // Wait for the 200ms exit animation
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(mockDismiss).toHaveBeenCalledWith("1");
  });
});

describe("ToastProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function TestConsumer() {
    const context = useContext(ToastContext);
    return (
      <div>
        <button onClick={() => context?.addToast("success", "Added!")} data-testid="add-toast">
          Add
        </button>
      </div>
    );
  }

  it("provides addToast and removeToast via context", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    expect(screen.getByTestId("add-toast")).toBeInTheDocument();
  });

  it("shows a toast when addToast is called", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );

    act(() => {
      screen.getByTestId("add-toast").click();
    });
    expect(screen.getByText("Added!")).toBeInTheDocument();
  });
});
