import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DecisionStatsPage from "../page";

const mockUseApiGet = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
}));

vi.mock("@praedixa/ui", () => ({
  MetricCard: ({ label, value }: { label: string; value: string | number }) => (
    <div data-testid={`metric-${label}`}>{value}</div>
  ),
  DataTable: ({ data }: { data: unknown[] }) => (
    <div data-testid="data-table">{data.length} rows</div>
  ),
  SkeletonCard: () => <div data-testid="skeleton-card" />,
  SkeletonTable: () => <div data-testid="skeleton-table" />,
}));

vi.mock("@/components/error-fallback", () => ({
  ErrorFallback: ({ message }: { message?: string }) => (
    <div data-testid="error-fallback">{message}</div>
  ),
}));

describe("DecisionStatsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the heading", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
    render(<DecisionStatsPage />);
    expect(
      screen.getByRole("heading", { name: "Statistiques des decisions" }),
    ).toBeInTheDocument();
  });

  it("shows loading skeletons", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
    render(<DecisionStatsPage />);
    expect(screen.getAllByTestId("skeleton-card").length).toBeGreaterThan(0);
  });

  it("shows error on error", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: "Error",
      refetch: vi.fn(),
    });
    render(<DecisionStatsPage />);
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("renders stats when loaded", () => {
    mockUseApiGet.mockReturnValue({
      data: {
        totalDecisions: 100,
        overrideCount: 15,
        overridePct: 15.0,
        topOverrideReasons: [{ reason: "Contexte local", count: 8 }],
        avgCostDelta: 250,
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<DecisionStatsPage />);
    expect(screen.getByLabelText("Indicateurs override")).toBeInTheDocument();
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });
});
