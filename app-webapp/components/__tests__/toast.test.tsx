import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ToastContainer, type ToastData } from "../toast";

vi.mock("@praedixa/ui", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      layout: _layout,
      variants: _v,
      initial: _i,
      animate: _a,
      exit: _e,
      ...rest
    }: Record<string, unknown>) => <div {...rest} />,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("lucide-react", () => ({
  CheckCircle2: (props: Record<string, unknown>) => (
    <span data-testid="icon-success" {...props} />
  ),
  AlertTriangle: (props: Record<string, unknown>) => (
    <span data-testid="icon-warning" {...props} />
  ),
  Info: (props: Record<string, unknown>) => (
    <span data-testid="icon-info" {...props} />
  ),
  XCircle: (props: Record<string, unknown>) => (
    <span data-testid="icon-error" {...props} />
  ),
  X: (props: Record<string, unknown>) => (
    <span data-testid="icon-close" {...props} />
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

  /* --- Empty state --- */

  it("renders the container even when toasts array is empty (AnimatePresence needs mount)", () => {
    const { container } = render(
      <ToastContainer toasts={[]} onDismiss={mockDismiss} />,
    );
    expect(container.querySelector("[aria-live]")).toBeInTheDocument();
  });

  /* --- Variant rendering --- */

  it("renders a success toast with correct icon and role=status", () => {
    const toasts: ToastData[] = [
      { id: "1", variant: "success", title: "Sauvegarde reussie" },
    ];
    render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);
    expect(screen.getByText("Sauvegarde reussie")).toBeInTheDocument();
    expect(screen.getByTestId("icon-success")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders an error toast with correct icon and role=alert", () => {
    const toasts: ToastData[] = [
      { id: "1", variant: "error", title: "Erreur serveur" },
    ];
    render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);
    expect(screen.getByText("Erreur serveur")).toBeInTheDocument();
    expect(screen.getByTestId("icon-error")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders a warning toast with correct icon and role=status", () => {
    const toasts: ToastData[] = [
      { id: "1", variant: "warning", title: "Attention requise" },
    ];
    render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);
    expect(screen.getByText("Attention requise")).toBeInTheDocument();
    expect(screen.getByTestId("icon-warning")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders an info toast with correct icon and role=status", () => {
    const toasts: ToastData[] = [
      { id: "1", variant: "info", title: "Information" },
    ];
    render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);
    expect(screen.getByText("Information")).toBeInTheDocument();
    expect(screen.getByTestId("icon-info")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  /* --- Description --- */

  it("renders optional description when provided", () => {
    const toasts: ToastData[] = [
      {
        id: "1",
        variant: "success",
        title: "Titre",
        description: "Details supplementaires",
      },
    ];
    render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);
    expect(screen.getByText("Details supplementaires")).toBeInTheDocument();
  });

  it("does not render description element when not provided", () => {
    const toasts: ToastData[] = [
      { id: "1", variant: "success", title: "Titre seul" },
    ];
    const { container } = render(
      <ToastContainer toasts={toasts} onDismiss={mockDismiss} />,
    );
    const descriptions = container.querySelectorAll(".text-xs");
    expect(descriptions).toHaveLength(0);
  });

  /* --- Multiple toasts --- */

  it("renders multiple stacked toasts", () => {
    const toasts: ToastData[] = [
      { id: "1", variant: "success", title: "Premier" },
      { id: "2", variant: "error", title: "Deuxieme" },
    ];
    render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);
    expect(screen.getByText("Premier")).toBeInTheDocument();
    expect(screen.getByText("Deuxieme")).toBeInTheDocument();
  });

  /* --- Auto dismiss --- */

  it("auto-dismisses after default duration (5s)", () => {
    const toasts: ToastData[] = [
      { id: "1", variant: "success", title: "Auto dismiss" },
    ];
    render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(mockDismiss).toHaveBeenCalledWith("1");
  });

  it("auto-dismisses after custom duration", () => {
    const toasts: ToastData[] = [
      { id: "1", variant: "success", title: "Custom", duration: 2000 },
    ];
    render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(mockDismiss).toHaveBeenCalledWith("1");
  });

  /* --- Manual dismiss --- */

  it("dismiss button has accessible label", () => {
    const toasts: ToastData[] = [{ id: "1", variant: "info", title: "Test" }];
    render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);
    const button = screen.getByLabelText("Fermer la notification");
    expect(button).toBeInTheDocument();
  });

  it("clicking dismiss button triggers onDismiss", () => {
    const toasts: ToastData[] = [
      { id: "1", variant: "info", title: "Dismiss me" },
    ];
    render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);

    act(() => {
      screen.getByLabelText("Fermer la notification").click();
    });
    expect(mockDismiss).toHaveBeenCalledWith("1");
  });

  /* --- Accessibility --- */

  it("has aria-live=polite on the container", () => {
    const toasts: ToastData[] = [{ id: "1", variant: "info", title: "Test" }];
    const { container } = render(
      <ToastContainer toasts={toasts} onDismiss={mockDismiss} />,
    );
    const liveRegion = container.querySelector("[aria-live]");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
  });

  it("has aria-label=Notifications on the container", () => {
    const toasts: ToastData[] = [{ id: "1", variant: "info", title: "Test" }];
    const { container } = render(
      <ToastContainer toasts={toasts} onDismiss={mockDismiss} />,
    );
    const region = container.querySelector("[aria-label]");
    expect(region).toHaveAttribute("aria-label", "Notifications");
  });

  it("icons have aria-hidden=true", () => {
    const toasts: ToastData[] = [
      { id: "1", variant: "success", title: "Test" },
    ];
    const { container } = render(
      <ToastContainer toasts={toasts} onDismiss={mockDismiss} />,
    );
    const icon = container.querySelector("[aria-hidden]");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  /* --- Variant-specific classes --- */

  it("applies success accent color", () => {
    const toasts: ToastData[] = [{ id: "1", variant: "success", title: "OK" }];
    const { container } = render(
      <ToastContainer toasts={toasts} onDismiss={mockDismiss} />,
    );
    const accent = container.querySelector(".bg-success");
    expect(accent).toBeInTheDocument();
  });

  it("applies error accent color", () => {
    const toasts: ToastData[] = [{ id: "1", variant: "error", title: "Err" }];
    const { container } = render(
      <ToastContainer toasts={toasts} onDismiss={mockDismiss} />,
    );
    const accent = container.querySelector(".bg-danger");
    expect(accent).toBeInTheDocument();
  });

  it("applies warning accent color", () => {
    const toasts: ToastData[] = [
      { id: "1", variant: "warning", title: "Warn" },
    ];
    const { container } = render(
      <ToastContainer toasts={toasts} onDismiss={mockDismiss} />,
    );
    const accent = container.querySelector(".bg-warning");
    expect(accent).toBeInTheDocument();
  });

  it("applies info accent color", () => {
    const toasts: ToastData[] = [{ id: "1", variant: "info", title: "Info" }];
    const { container } = render(
      <ToastContainer toasts={toasts} onDismiss={mockDismiss} />,
    );
    const accent = container.querySelector(".bg-info");
    expect(accent).toBeInTheDocument();
  });

  /* --- Reduced motion --- */

  it("renders correctly with prefers-reduced-motion enabled", () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: () => false,
      }),
    });

    const toasts: ToastData[] = [
      { id: "1", variant: "success", title: "Reduced motion" },
    ];
    render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);
    expect(screen.getByText("Reduced motion")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();

    // Restore
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: originalMatchMedia,
    });
  });
});
