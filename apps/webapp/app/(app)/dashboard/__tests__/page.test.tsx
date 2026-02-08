import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "../page";

const { mockUseApiGet } = vi.hoisted(() => ({
  mockUseApiGet: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
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
}));

vi.mock("@praedixa/ui", () => ({
  StatCard: ({ label, value }: { label: string; value: string }) => (
    <div data-testid={`stat-${label}`}>{value}</div>
  ),
  HeatmapGrid: ({ cells }: { cells: unknown[] }) => (
    <div data-testid="heatmap-grid">{cells.length} cells</div>
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

vi.mock("lucide-react", () => ({
  AlertTriangle: () => <svg data-testid="icon-alert" />,
  BarChart3: () => <svg data-testid="icon-bar" />,
  ShieldCheck: () => <svg data-testid="icon-shield" />,
  TrendingUp: () => <svg data-testid="icon-trend" />,
}));

function setupMocks(overrides?: Partial<Record<string, unknown>>) {
  mockUseApiGet.mockImplementation((url: string | null) => {
    if (url?.includes("coverage-alerts")) {
      return {
        data: overrides?.alerts ?? [],
        loading: overrides?.alertsLoading ?? false,
        error: overrides?.alertsError ?? null,
        refetch: vi.fn(),
      };
    }
    if (url?.includes("canonical/quality")) {
      return {
        data: overrides?.quality ?? {
          totalRecords: 500,
          coveragePct: "87.50",
          sites: 2,
          dateRange: ["2026-01-01", "2026-02-07"],
          missingShiftsPct: "1.20",
          avgAbsPct: "3.40",
        },
        loading: overrides?.qualityLoading ?? false,
        error: overrides?.qualityError ?? null,
        refetch: vi.fn(),
      };
    }
    return { data: null, loading: false, error: null, refetch: vi.fn() };
  });
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it("renders the Dashboard heading", () => {
    render(<DashboardPage />);
    expect(
      screen.getByRole("heading", { name: "Dashboard" }),
    ).toBeInTheDocument();
  });

  it("renders the page description", () => {
    render(<DashboardPage />);
    expect(
      screen.getByText(/Vue d.*ensemble de la couverture operationnelle/),
    ).toBeInTheDocument();
  });

  it("renders KPI stat cards section", () => {
    render(<DashboardPage />);
    expect(screen.getByLabelText("Indicateurs cles")).toBeInTheDocument();
  });

  it("renders the heatmap section", () => {
    render(<DashboardPage />);
    expect(screen.getByLabelText("Heatmap de couverture")).toBeInTheDocument();
  });

  it("renders the top alerts section", () => {
    render(<DashboardPage />);
    expect(screen.getByLabelText("Top alertes")).toBeInTheDocument();
  });

  it("shows loading skeletons when data is loading", () => {
    setupMocks({ alertsLoading: true, qualityLoading: true });
    render(<DashboardPage />);
    expect(screen.getAllByTestId("skeleton-card").length).toBeGreaterThan(0);
  });

  it("shows error fallback on alerts error", () => {
    setupMocks({ alertsError: "Server error" });
    render(<DashboardPage />);
    expect(screen.getByText("Server error")).toBeInTheDocument();
  });

  it("renders the cost trend section", () => {
    render(<DashboardPage />);
    expect(screen.getByLabelText("Tendance des couts")).toBeInTheDocument();
  });
});
