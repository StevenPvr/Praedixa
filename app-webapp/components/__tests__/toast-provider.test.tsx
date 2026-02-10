import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useContext } from "react";
import { ToastProvider, ToastContext } from "../toast-provider";

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

function TestConsumer() {
  const context = useContext(ToastContext);
  return (
    <div>
      <button
        onClick={() =>
          context?.toast({ variant: "success", title: "Toast ajoute!" })
        }
        data-testid="add-toast"
      >
        Add
      </button>
      <button
        onClick={() =>
          context?.toast({
            variant: "error",
            title: "Erreur",
            description: "Details de l'erreur",
          })
        }
        data-testid="add-error-toast"
      >
        Add Error
      </button>
      <button
        onClick={() =>
          context?.toast({
            variant: "info",
            title: "Info",
            duration: 2000,
          })
        }
        data-testid="add-custom-duration"
      >
        Add Custom
      </button>
    </div>
  );
}

describe("ToastProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("provides toast and dismiss via context", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    expect(screen.getByTestId("add-toast")).toBeInTheDocument();
  });

  it("shows a toast when toast() is called", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );

    act(() => {
      screen.getByTestId("add-toast").click();
    });
    expect(screen.getByText("Toast ajoute!")).toBeInTheDocument();
  });

  it("shows toast with description", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );

    act(() => {
      screen.getByTestId("add-error-toast").click();
    });
    expect(screen.getByText("Erreur")).toBeInTheDocument();
    expect(screen.getByText("Details de l'erreur")).toBeInTheDocument();
  });

  it("limits toasts to max 3 visible", () => {
    function ManyToastsConsumer() {
      const context = useContext(ToastContext);
      return (
        <button
          onClick={() => {
            context?.toast({ variant: "info", title: "Toast 1" });
            context?.toast({ variant: "info", title: "Toast 2" });
            context?.toast({ variant: "info", title: "Toast 3" });
            context?.toast({ variant: "info", title: "Toast 4" });
          }}
          data-testid="add-many"
        >
          Add Many
        </button>
      );
    }

    render(
      <ToastProvider>
        <ManyToastsConsumer />
      </ToastProvider>,
    );

    act(() => {
      screen.getByTestId("add-many").click();
    });

    // Only last 3 should be visible
    expect(screen.queryByText("Toast 1")).not.toBeInTheDocument();
    expect(screen.getByText("Toast 2")).toBeInTheDocument();
    expect(screen.getByText("Toast 3")).toBeInTheDocument();
    expect(screen.getByText("Toast 4")).toBeInTheDocument();
  });

  it("removes a toast when dismiss is called", () => {
    function DismissConsumer() {
      const context = useContext(ToastContext);
      const idRef = { current: "" };
      return (
        <div>
          <button
            onClick={() => {
              idRef.current = context!.toast({
                variant: "success",
                title: "A retirer",
              });
            }}
            data-testid="add"
          >
            Add
          </button>
          <button
            onClick={() => context!.dismiss(idRef.current)}
            data-testid="dismiss"
          >
            Dismiss
          </button>
        </div>
      );
    }

    render(
      <ToastProvider>
        <DismissConsumer />
      </ToastProvider>,
    );

    act(() => {
      screen.getByTestId("add").click();
    });
    expect(screen.getByText("A retirer")).toBeInTheDocument();

    act(() => {
      screen.getByTestId("dismiss").click();
    });
    expect(screen.queryByText("A retirer")).not.toBeInTheDocument();
  });

  it("toast() returns the generated id", () => {
    let returnedId = "";

    function IdConsumer() {
      const context = useContext(ToastContext);
      return (
        <button
          onClick={() => {
            returnedId = context!.toast({
              variant: "info",
              title: "ID test",
            });
          }}
          data-testid="get-id"
        >
          Get ID
        </button>
      );
    }

    render(
      <ToastProvider>
        <IdConsumer />
      </ToastProvider>,
    );

    act(() => {
      screen.getByTestId("get-id").click();
    });

    expect(returnedId).toMatch(/^toast-\d+$/);
  });

  it("renders children", () => {
    render(
      <ToastProvider>
        <p>App content</p>
      </ToastProvider>,
    );
    expect(screen.getByText("App content")).toBeInTheDocument();
  });

  it("supports custom duration via options", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );

    act(() => {
      screen.getByTestId("add-custom-duration").click();
    });
    expect(screen.getByText("Info")).toBeInTheDocument();
  });
});
