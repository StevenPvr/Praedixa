import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScenarioComparisonChart } from "../scenario-comparison-chart";

/* ─── Mocks ──────────────────────────────────────────── */

const mockUseApiGet = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
}));

vi.mock("@tremor/react", () => ({
  AreaChart: (props: Record<string, unknown>) => {
    const formatter = props.valueFormatter as
      | ((v: number) => string)
      | undefined;
    const formattedSample = formatter ? formatter(1500) : "";
    return (
      <div
        data-testid="area-chart"
        data-categories={JSON.stringify(props.categories)}
        data-data={JSON.stringify(props.data)}
        data-formatted-sample={formattedSample}
      />
    );
  },
}));

vi.mock("@praedixa/ui", () => ({
  SkeletonChart: () => <div data-testid="skeleton-chart" />,
}));

vi.mock("@/components/error-fallback", () => ({
  ErrorFallback: ({
    message,
    onRetry,
  }: {
    message: string;
    onRetry?: () => void;
  }) => (
    <div data-testid="error-fallback">
      {message}
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
}));

vi.mock("@/components/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

vi.mock("lucide-react", () => ({
  Inbox: () => <svg data-testid="icon-inbox" />,
}));

/* ─── Mock data ──────────────────────────────────────── */

const mockProofPacks = [
  {
    id: "p1",
    siteId: "Lyon",
    month: "2026-01-01",
    coutBauEur: 5000,
    cout100Eur: 2000,
    coutReelEur: 3500,
    gainNetEur: 1500,
    alertesEmises: 10,
    alertesTraitees: 8,
  },
  {
    id: "p2",
    siteId: "Paris",
    month: "2026-01-01",
    coutBauEur: 3000,
    cout100Eur: 1000,
    coutReelEur: 2000,
    gainNetEur: 1000,
    alertesEmises: 5,
    alertesTraitees: 4,
  },
  {
    id: "p3",
    siteId: "Lyon",
    month: "2026-02-01",
    coutBauEur: 4000,
    cout100Eur: 1500,
    coutReelEur: 2800,
    gainNetEur: 1200,
    alertesEmises: 8,
    alertesTraitees: 7,
  },
];

/* ─── Tests ──────────────────────────────────────────── */

describe("ScenarioComparisonChart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ── Loading state ──────────────────────── */

  it("shows SkeletonChart when loading", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
    render(<ScenarioComparisonChart />);
    expect(screen.getByTestId("skeleton-chart")).toBeInTheDocument();
  });

  /* ── Error state ────────────────────────── */

  it("shows ErrorFallback on error", () => {
    const refetch = vi.fn();
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: "Server error",
      refetch,
    });
    render(<ScenarioComparisonChart />);
    expect(screen.getByTestId("error-fallback")).toBeInTheDocument();
    expect(screen.getByText("Server error")).toBeInTheDocument();
  });

  it("calls refetch on retry", () => {
    const refetch = vi.fn();
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: "Network error",
      refetch,
    });
    render(<ScenarioComparisonChart />);
    screen.getByText("Retry").click();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  /* ── Empty state ────────────────────────── */

  it("shows empty state when no proof packs", () => {
    mockUseApiGet.mockReturnValue({
      data: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<ScenarioComparisonChart />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText("Aucun bilan disponible")).toBeInTheDocument();
  });

  it("shows empty state when proof packs is null", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<ScenarioComparisonChart />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  /* ── Success rendering ─────────────────── */

  it("renders the data-testid wrapper", () => {
    mockUseApiGet.mockReturnValue({
      data: mockProofPacks,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<ScenarioComparisonChart />);
    expect(screen.getByTestId("scenario-comparison-chart")).toBeInTheDocument();
  });

  it("renders AreaChart with aggregated data by month", () => {
    mockUseApiGet.mockReturnValue({
      data: mockProofPacks,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<ScenarioComparisonChart />);
    const chart = screen.getByTestId("area-chart");
    const chartData = JSON.parse(chart.getAttribute("data-data")!);
    // 2 months: jan (5000+3000=8000 bau) and feb (4000 bau)
    expect(chartData).toHaveLength(2);
    expect(chartData[0]["Sans intervention"]).toBe(8000);
    expect(chartData[0]["Realite observee"]).toBe(5500);
    expect(chartData[0]["Praedixa 100%"]).toBe(3000);
    expect(chartData[1]["Sans intervention"]).toBe(4000);
    expect(chartData[1]["Realite observee"]).toBe(2800);
    expect(chartData[1]["Praedixa 100%"]).toBe(1500);
  });

  it("renders AreaChart with correct categories", () => {
    mockUseApiGet.mockReturnValue({
      data: mockProofPacks,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<ScenarioComparisonChart />);
    const chart = screen.getByTestId("area-chart");
    const categories = JSON.parse(chart.getAttribute("data-categories")!);
    expect(categories).toEqual([
      "Sans intervention",
      "Realite observee",
      "Praedixa 100%",
    ]);
  });

  it("sorts data chronologically", () => {
    const outOfOrderPacks = [
      mockProofPacks[2], // feb
      mockProofPacks[0], // jan
    ];
    mockUseApiGet.mockReturnValue({
      data: outOfOrderPacks,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<ScenarioComparisonChart />);
    const chart = screen.getByTestId("area-chart");
    const chartData = JSON.parse(chart.getAttribute("data-data")!);
    // Jan should come before Feb
    expect(chartData[0]["Sans intervention"]).toBe(5000);
    expect(chartData[1]["Sans intervention"]).toBe(4000);
  });

  it("exercises the value formatter", () => {
    mockUseApiGet.mockReturnValue({
      data: mockProofPacks,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<ScenarioComparisonChart />);
    const chart = screen.getByTestId("area-chart");
    // formatter(1500) should include "EUR"
    expect(chart.getAttribute("data-formatted-sample")).toContain("EUR");
  });

  /* ── API call ──────────────────────────── */

  it("calls useApiGet with /api/v1/proof", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<ScenarioComparisonChart />);
    expect(mockUseApiGet).toHaveBeenCalledWith("/api/v1/proof");
  });
});
