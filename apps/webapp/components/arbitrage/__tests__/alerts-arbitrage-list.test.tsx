import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AlertsArbitrageList } from "../alerts-arbitrage-list";

/* ─── Mocks ──────────────────────────────────────── */

const mockUseApiGet = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
}));

vi.mock("@praedixa/ui", () => ({
  StatusBadge: ({ variant, label }: { variant: string; label: string }) => (
    <span data-testid="status-badge" data-variant={variant}>
      {label}
    </span>
  ),
  SkeletonCard: () => <div data-testid="skeleton-card" />,
}));

vi.mock("@/components/error-fallback", () => ({
  ErrorFallback: ({
    message,
    variant,
  }: {
    message?: string;
    variant?: string;
  }) => (
    <div data-testid="error-fallback" data-variant={variant}>
      {message}
    </div>
  ),
}));

/* ─── Helpers ────────────────────────────────────── */

function makeAlert(
  overrides: Partial<{
    id: string;
    type: string;
    severity: "info" | "warning" | "error" | "critical";
    title: string;
    message: string;
    dismissedAt: string | null;
  }> = {},
) {
  return {
    id: overrides.id ?? "alert-1",
    organizationId: "org-1",
    type: overrides.type ?? "risk",
    severity: overrides.severity ?? "warning",
    title: overrides.title ?? "Sous-couverture Lyon",
    message: overrides.message ?? "Deficit de 15%",
    createdAt: "2026-02-06T10:00:00Z",
    dismissedAt: overrides.dismissedAt ?? null,
  };
}

/* ─── Tests ──────────────────────────────────────── */

describe("AlertsArbitrageList", () => {
  beforeEach(() => {
    mockUseApiGet.mockReset();
  });

  it("shows 3 skeleton cards when loading", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<AlertsArbitrageList />);
    expect(screen.getAllByTestId("skeleton-card")).toHaveLength(3);
  });

  it("shows ErrorFallback on error", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: "Network error",
      refetch: vi.fn(),
    });

    render(<AlertsArbitrageList />);
    expect(screen.getByTestId("error-fallback")).toHaveTextContent(
      "Network error",
    );
  });

  it("shows empty state when no risk alerts", () => {
    mockUseApiGet.mockReturnValue({
      data: [makeAlert({ type: "decision" })],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<AlertsArbitrageList />);
    const fallback = screen.getByTestId("error-fallback");
    expect(fallback).toHaveAttribute("data-variant", "empty");
  });

  it("renders risk alerts with title and message", () => {
    mockUseApiGet.mockReturnValue({
      data: [makeAlert({ title: "Risque Lyon", message: "Deficit 20%" })],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<AlertsArbitrageList />);
    expect(screen.getByText("Risque Lyon")).toBeInTheDocument();
    expect(screen.getByText("Deficit 20%")).toBeInTheDocument();
  });

  it("renders Arbitrer link with correct href", () => {
    mockUseApiGet.mockReturnValue({
      data: [makeAlert({ id: "alert-42" })],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<AlertsArbitrageList />);
    const link = screen.getByText("Arbitrer");
    expect(link).toHaveAttribute("href", "/arbitrage/alert-42");
  });

  it("filters out dismissed alerts", () => {
    mockUseApiGet.mockReturnValue({
      data: [
        makeAlert({ id: "a1", title: "Active" }),
        makeAlert({
          id: "a2",
          title: "Dismissed",
          dismissedAt: "2026-02-06T10:00:00Z",
        }),
      ],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<AlertsArbitrageList />);
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.queryByText("Dismissed")).not.toBeInTheDocument();
  });

  it("filters out non-risk alerts", () => {
    mockUseApiGet.mockReturnValue({
      data: [
        makeAlert({ id: "a1", type: "risk", title: "Risk Alert" }),
        makeAlert({ id: "a2", type: "forecast", title: "Forecast Alert" }),
      ],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<AlertsArbitrageList />);
    expect(screen.getByText("Risk Alert")).toBeInTheDocument();
    expect(screen.queryByText("Forecast Alert")).not.toBeInTheDocument();
  });

  it("renders severity badge", () => {
    mockUseApiGet.mockReturnValue({
      data: [makeAlert({ severity: "error" })],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<AlertsArbitrageList />);
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-variant", "danger");
    expect(badge).toHaveTextContent("Erreur");
  });

  it("calls useApiGet with /api/v1/alerts", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<AlertsArbitrageList />);
    expect(mockUseApiGet).toHaveBeenCalledWith("/api/v1/alerts");
  });
});
