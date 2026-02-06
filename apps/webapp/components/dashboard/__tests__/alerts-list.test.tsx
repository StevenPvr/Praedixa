import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AlertsList } from "../alerts-list";

/* ─── Mocks ──────────────────────────────────────────── */

const mockApiPatch = vi.fn();

vi.mock("@/lib/api/client", () => {
  class MockApiError extends Error {
    status: number;
    constructor(msg: string, status: number) {
      super(msg);
      this.name = "ApiError";
      this.status = status;
    }
  }
  return {
    apiPatch: (...args: unknown[]) => mockApiPatch(...args),
    ApiError: MockApiError,
  };
});

vi.mock("@/lib/auth/client", () => ({
  getValidAccessToken: () => Promise.resolve("test-token"),
}));

vi.mock("@praedixa/ui", () => ({
  StatusBadge: ({ variant, label }: { variant: string; label: string }) => (
    <span data-testid="status-badge" data-variant={variant}>
      {label}
    </span>
  ),
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

vi.mock("lucide-react", () => ({
  X: () => <svg data-testid="x-icon" aria-hidden="true" />,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

/* ─── Helpers ────────────────────────────────────────── */

function makeAlert(
  overrides: Partial<{
    id: string;
    type: string;
    severity: "info" | "warning" | "error" | "critical";
    title: string;
    message: string;
    createdAt: string;
    dismissedAt: string | null;
  }> = {},
) {
  return {
    id: overrides.id ?? "alert-1",
    type: overrides.type ?? "capacity",
    severity: overrides.severity ?? "warning",
    title: overrides.title ?? "Capacite insuffisante",
    message: overrides.message ?? "Site Lyon: -15% sous seuil",
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    dismissedAt: overrides.dismissedAt ?? null,
  };
}

const defaultProps = {
  alerts: [makeAlert()],
  loading: false,
  onDismissed: vi.fn(),
};

/* ─── Tests ──────────────────────────────────────────── */

describe("AlertsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiPatch.mockResolvedValue(undefined);
  });

  /* ── Loading state ───────────────────────── */

  describe("loading state", () => {
    it("shows skeleton elements when loading", () => {
      render(<AlertsList alerts={null} loading={true} onDismissed={vi.fn()} />);
      const skeletons = screen.getAllByTestId("skeleton");
      // 1 title skeleton + 3 row skeletons
      expect(skeletons.length).toBe(4);
    });

    it("wraps loading skeleton in section with correct aria-label", () => {
      render(<AlertsList alerts={null} loading={true} onDismissed={vi.fn()} />);
      expect(
        screen.getByRole("region", { name: "Alertes recentes" }),
      ).toBeInTheDocument();
    });
  });

  /* ── Empty states ────────────────────────── */

  describe("empty states", () => {
    it("shows empty message when alerts is null", () => {
      render(
        <AlertsList alerts={null} loading={false} onDismissed={vi.fn()} />,
      );
      expect(screen.getByText("Aucune alerte active")).toBeInTheDocument();
    });

    it("shows empty message when alerts is empty array", () => {
      render(<AlertsList alerts={[]} loading={false} onDismissed={vi.fn()} />);
      expect(screen.getByText("Aucune alerte active")).toBeInTheDocument();
    });
  });

  /* ── Filtering dismissed alerts ──────────── */

  describe("filtering", () => {
    it("filters out dismissed alerts", () => {
      const alerts = [
        makeAlert({ id: "a1", title: "Active Alert", dismissedAt: null }),
        makeAlert({
          id: "a2",
          title: "Dismissed Alert",
          dismissedAt: "2026-02-06T10:00:00Z",
        }),
      ];
      render(
        <AlertsList alerts={alerts} loading={false} onDismissed={vi.fn()} />,
      );
      expect(screen.getByText("Active Alert")).toBeInTheDocument();
      expect(screen.queryByText("Dismissed Alert")).not.toBeInTheDocument();
    });

    it("shows empty message when all alerts are dismissed", () => {
      const alerts = [makeAlert({ dismissedAt: "2026-02-06T10:00:00Z" })];
      render(
        <AlertsList alerts={alerts} loading={false} onDismissed={vi.fn()} />,
      );
      expect(screen.getByText("Aucune alerte active")).toBeInTheDocument();
    });
  });

  /* ── Alert rendering ─────────────────────── */

  describe("alert rendering", () => {
    it("renders alert title and message", () => {
      render(<AlertsList {...defaultProps} />);
      expect(screen.getByText("Capacite insuffisante")).toBeInTheDocument();
      expect(
        screen.getByText("Site Lyon: -15% sous seuil"),
      ).toBeInTheDocument();
    });

    it("renders section heading", () => {
      render(<AlertsList {...defaultProps} />);
      expect(screen.getByText("Alertes recentes")).toBeInTheDocument();
    });
  });

  /* ── Severity mapping ────────────────────── */

  describe("severity mapping", () => {
    it("maps info severity to neutral variant with Info label", () => {
      render(
        <AlertsList
          alerts={[makeAlert({ severity: "info" })]}
          loading={false}
          onDismissed={vi.fn()}
        />,
      );
      const badge = screen.getByTestId("status-badge");
      expect(badge).toHaveAttribute("data-variant", "neutral");
      expect(badge).toHaveTextContent("Info");
    });

    it("maps warning severity to warning variant with Attention label", () => {
      render(
        <AlertsList
          alerts={[makeAlert({ severity: "warning" })]}
          loading={false}
          onDismissed={vi.fn()}
        />,
      );
      const badge = screen.getByTestId("status-badge");
      expect(badge).toHaveAttribute("data-variant", "warning");
      expect(badge).toHaveTextContent("Attention");
    });

    it("maps error severity to danger variant with Erreur label", () => {
      render(
        <AlertsList
          alerts={[makeAlert({ severity: "error" })]}
          loading={false}
          onDismissed={vi.fn()}
        />,
      );
      const badge = screen.getByTestId("status-badge");
      expect(badge).toHaveAttribute("data-variant", "danger");
      expect(badge).toHaveTextContent("Erreur");
    });

    it("maps critical severity to danger variant with Critique label", () => {
      render(
        <AlertsList
          alerts={[makeAlert({ severity: "critical" })]}
          loading={false}
          onDismissed={vi.fn()}
        />,
      );
      const badge = screen.getByTestId("status-badge");
      expect(badge).toHaveAttribute("data-variant", "danger");
      expect(badge).toHaveTextContent("Critique");
    });
  });

  /* ── timeAgo ─────────────────────────────── */

  describe("timeAgo display", () => {
    it("shows 'A l'instant' for just now", () => {
      const now = new Date().toISOString();
      render(
        <AlertsList
          alerts={[makeAlert({ createdAt: now })]}
          loading={false}
          onDismissed={vi.fn()}
        />,
      );
      expect(screen.getByText("A l'instant")).toBeInTheDocument();
    });

    it("shows minutes ago for time within the hour", () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
      render(
        <AlertsList
          alerts={[makeAlert({ createdAt: fiveMinAgo })]}
          loading={false}
          onDismissed={vi.fn()}
        />,
      );
      expect(screen.getByText("Il y a 5min")).toBeInTheDocument();
    });

    it("shows hours ago for time within the day", () => {
      const threeHoursAgo = new Date(
        Date.now() - 3 * 60 * 60_000,
      ).toISOString();
      render(
        <AlertsList
          alerts={[makeAlert({ createdAt: threeHoursAgo })]}
          loading={false}
          onDismissed={vi.fn()}
        />,
      );
      expect(screen.getByText("Il y a 3h")).toBeInTheDocument();
    });

    it("shows days ago for time beyond 24 hours", () => {
      const twoDaysAgo = new Date(
        Date.now() - 2 * 24 * 60 * 60_000,
      ).toISOString();
      render(
        <AlertsList
          alerts={[makeAlert({ createdAt: twoDaysAgo })]}
          loading={false}
          onDismissed={vi.fn()}
        />,
      );
      expect(screen.getByText("Il y a 2j")).toBeInTheDocument();
    });
  });

  /* ── Dismiss functionality ───────────────── */

  describe("dismiss", () => {
    it("dismiss button has correct aria-label", () => {
      render(<AlertsList {...defaultProps} />);
      expect(
        screen.getByRole("button", {
          name: "Ignorer l'alerte: Capacite insuffisante",
        }),
      ).toBeInTheDocument();
    });

    it("calls apiPatch with correct URL on dismiss", async () => {
      const onDismissed = vi.fn();
      render(
        <AlertsList
          alerts={[makeAlert({ id: "alert-42" })]}
          loading={false}
          onDismissed={onDismissed}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Ignorer/ }));

      await waitFor(() => {
        expect(mockApiPatch).toHaveBeenCalledWith(
          "/api/v1/alerts/alert-42/dismiss",
          {},
          expect.any(Function),
        );
      });
    });

    it("calls onDismissed callback after successful dismiss", async () => {
      const onDismissed = vi.fn();
      render(
        <AlertsList
          alerts={[makeAlert()]}
          loading={false}
          onDismissed={onDismissed}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Ignorer/ }));

      await waitFor(() => {
        expect(onDismissed).toHaveBeenCalledTimes(1);
      });
    });

    it("logs error on failed dismiss with ApiError", async () => {
      // Import the mocked ApiError class dynamically
      const { ApiError } = await import("@/lib/api/client");
      mockApiPatch.mockRejectedValueOnce(new ApiError("Forbidden", 403));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const onDismissed = vi.fn();
      render(
        <AlertsList
          alerts={[makeAlert()]}
          loading={false}
          onDismissed={onDismissed}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Ignorer/ }));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Failed to dismiss alert:",
          "Forbidden",
        );
      });

      // onDismissed should NOT be called on failure
      expect(onDismissed).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("disables dismiss button during pending dismiss", async () => {
      // Create a promise we can control
      let resolveApiPatch!: () => void;
      mockApiPatch.mockReturnValueOnce(
        new Promise<void>((resolve) => {
          resolveApiPatch = resolve;
        }),
      );

      render(<AlertsList {...defaultProps} />);
      const btn = screen.getByRole("button", { name: /Ignorer/ });

      fireEvent.click(btn);

      // Button should be disabled while dismiss is pending
      await waitFor(() => {
        expect(btn).toBeDisabled();
      });

      // Resolve and verify button re-enables
      resolveApiPatch();
      await waitFor(() => {
        expect(btn).not.toBeDisabled();
      });
    });

    it("does not call onDismissed when a non-ApiError is thrown", async () => {
      mockApiPatch.mockRejectedValueOnce(new TypeError("Network failure"));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const onDismissed = vi.fn();
      render(
        <AlertsList
          alerts={[makeAlert()]}
          loading={false}
          onDismissed={onDismissed}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Ignorer/ }));

      // Wait for the async handler to complete
      await waitFor(() => {
        expect(mockApiPatch).toHaveBeenCalled();
      });

      // onDismissed should not be called
      expect(onDismissed).not.toHaveBeenCalled();
      // console.error should NOT be called (only ApiError triggers it)
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  /* ── Multiple alerts ─────────────────────── */

  describe("multiple alerts", () => {
    it("renders multiple active alerts", () => {
      const alerts = [
        makeAlert({ id: "a1", title: "Alert One", severity: "info" }),
        makeAlert({ id: "a2", title: "Alert Two", severity: "critical" }),
      ];
      render(
        <AlertsList alerts={alerts} loading={false} onDismissed={vi.fn()} />,
      );
      expect(screen.getByText("Alert One")).toBeInTheDocument();
      expect(screen.getByText("Alert Two")).toBeInTheDocument();
      const badges = screen.getAllByTestId("status-badge");
      expect(badges).toHaveLength(2);
    });
  });

  /* ── Arbitrer link ──────────────────────── */

  describe("Arbitrer link", () => {
    it("shows Arbitrer link for risk-type alerts", () => {
      render(
        <AlertsList
          alerts={[makeAlert({ id: "risk-1", type: "risk" })]}
          loading={false}
          onDismissed={vi.fn()}
        />,
      );
      const link = screen.getByText("Arbitrer");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/arbitrage/risk-1");
    });

    it("does not show Arbitrer link for non-risk alerts", () => {
      render(
        <AlertsList
          alerts={[makeAlert({ type: "forecast" })]}
          loading={false}
          onDismissed={vi.fn()}
        />,
      );
      expect(screen.queryByText("Arbitrer")).not.toBeInTheDocument();
    });

    it("encodes alertId in the href", () => {
      render(
        <AlertsList
          alerts={[makeAlert({ id: "a/b c", type: "risk" })]}
          loading={false}
          onDismissed={vi.fn()}
        />,
      );
      const link = screen.getByText("Arbitrer");
      expect(link).toHaveAttribute("href", "/arbitrage/a%2Fb%20c");
    });
  });

  /* ── Accessibility ───────────────────────── */

  describe("accessibility", () => {
    it("wraps content in section with aria-label 'Alertes recentes'", () => {
      render(<AlertsList {...defaultProps} />);
      expect(
        screen.getByRole("region", { name: "Alertes recentes" }),
      ).toBeInTheDocument();
    });
  });
});
