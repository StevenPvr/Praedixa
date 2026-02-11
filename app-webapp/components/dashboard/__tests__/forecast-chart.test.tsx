import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ForecastChart } from "../forecast-chart";

const mockRefetchRuns = vi.fn();
const mockRefetchDaily = vi.fn();
const mockUseLatestForecasts = vi.fn();

vi.mock("@/hooks/use-latest-forecasts", () => ({
  useLatestForecasts: (...args: unknown[]) => mockUseLatestForecasts(...args),
}));

vi.mock("@tremor/react", () => ({
  LineChart: (props: Record<string, unknown>) => {
    const formatter = props.valueFormatter as
      | ((v: number) => string)
      | undefined;
    const formattedSample = formatter ? formatter(42) : "";
    return (
      <div
        data-testid="line-chart"
        data-categories={JSON.stringify(props.categories)}
        data-data={JSON.stringify(props.data)}
        data-formatted-sample={formattedSample}
      />
    );
  },
}));

vi.mock("@praedixa/ui", () => ({
  SkeletonChart: () => <div data-testid="skeleton-chart">Loading chart...</div>,
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

const defaultDailyData = [
  {
    forecastDate: "2026-02-10",
    dimension: "human",
    predictedDemand: 120,
    predictedCapacity: 100,
    capacityPlannedCurrent: 100,
    capacityPlannedPredicted: 113,
    capacityOptimalPredicted: 120,
    gap: -20,
    riskScore: 0.8,
    confidenceLower: 90,
    confidenceUpper: 130,
  },
  {
    forecastDate: "2026-02-11",
    dimension: "human",
    predictedDemand: 110,
    predictedCapacity: 105,
    capacityPlannedCurrent: 105,
    capacityPlannedPredicted: 108,
    capacityOptimalPredicted: 110,
    gap: -5,
    riskScore: 0.3,
    confidenceLower: 95,
    confidenceUpper: 120,
  },
];

function setupMock(
  overrides?: Partial<{
    dailyData: unknown;
    loading: boolean;
    error: string | null;
  }>,
) {
  mockUseLatestForecasts.mockReturnValue({
    dailyData:
      overrides?.dailyData !== undefined
        ? overrides.dailyData
        : defaultDailyData,
    loading: overrides?.loading ?? false,
    error: overrides?.error ?? null,
    refetchRuns: mockRefetchRuns,
    refetchDaily: mockRefetchDaily,
  });
}

describe("ForecastChart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMock();
  });

  it("shows SkeletonChart while loading", () => {
    setupMock({ loading: true });
    render(<ForecastChart />);
    expect(screen.getByTestId("skeleton-chart")).toBeInTheDocument();
  });

  it("shows ErrorFallback on error", () => {
    setupMock({ error: "Daily data unavailable" });
    render(<ForecastChart />);
    expect(screen.getByTestId("error-fallback")).toBeInTheDocument();
    expect(screen.getByText("Daily data unavailable")).toBeInTheDocument();
  });

  it("calls both refetch aliases on retry", () => {
    setupMock({ error: "Server error" });
    render(<ForecastChart />);
    fireEvent.click(screen.getByText("Retry"));
    expect(mockRefetchRuns).toHaveBeenCalledTimes(1);
    expect(mockRefetchDaily).toHaveBeenCalledTimes(1);
  });

  it("shows empty state when daily data is empty", () => {
    setupMock({ dailyData: [] });
    render(<ForecastChart />);
    expect(screen.getByText("Aucune prevision disponible")).toBeInTheDocument();
  });

  it("shows empty state when daily data is null", () => {
    setupMock({ dailyData: null });
    render(<ForecastChart />);
    expect(screen.getByText("Aucune prevision disponible")).toBeInTheDocument();
  });

  it("renders LineChart with expected categories and data", () => {
    render(<ForecastChart />);
    const chart = screen.getByTestId("line-chart");
    const categories = JSON.parse(
      chart.getAttribute("data-categories") ?? "[]",
    );
    const chartData = JSON.parse(chart.getAttribute("data-data") ?? "[]");

    expect(categories).toEqual([
      "Capacite prevue actuelle",
      "Capacite prevue predite",
      "Capacite optimale predite",
    ]);
    expect(chartData).toHaveLength(2);
    expect(chartData[0]["Capacite prevue actuelle"]).toBe(100);
    expect(chart.getAttribute("data-formatted-sample")).toBe("42");
  });

  it("uses human dimension by default", () => {
    render(<ForecastChart />);
    expect(mockUseLatestForecasts).toHaveBeenCalledWith("human");
    expect(
      screen.getByText(/Capacite humaine — tous sites/),
    ).toBeInTheDocument();
  });

  it("switches to merchandise dimension when toggled", () => {
    render(<ForecastChart />);
    fireEvent.click(screen.getByText("Marchandise"));
    expect(mockUseLatestForecasts).toHaveBeenCalledWith("merchandise");
    expect(
      screen.getByText(/Capacite marchandise — tous sites/),
    ).toBeInTheDocument();
  });
});
