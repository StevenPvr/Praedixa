import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ForecastTimelineChart } from "../forecast-timeline-chart";

/* ─── Mocks ──────────────────────────────────────────── */

const mockRefetchRuns = vi.fn();
const mockRefetchDaily = vi.fn();
const mockUseLatestForecasts = vi.fn();

vi.mock("@tremor/react", () => ({
  AreaChart: (props: Record<string, unknown>) => {
    const formatter = props.valueFormatter as
      | ((v: number) => string)
      | undefined;
    const formattedSample = formatter ? formatter(42) : "";
    return (
      <div
        data-testid="area-chart"
        data-categories={JSON.stringify(props.categories)}
        data-data={JSON.stringify(props.data)}
        data-formatted-sample={formattedSample}
      />
    );
  },
  LineChart: (props: Record<string, unknown>) => {
    const formatter = props.valueFormatter as
      | ((v: number) => string)
      | undefined;
    const formattedSample = formatter ? formatter(42) : "";
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

vi.mock("@/hooks/use-latest-forecasts", () => ({
  useLatestForecasts: (...args: unknown[]) => mockUseLatestForecasts(...args),
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

/* ─── Helpers ────────────────────────────────────────── */

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

/* ─── Tests ──────────────────────────────────────────── */

describe("ForecastTimelineChart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMock();
  });

  /* ── Loading states ──────────────────────── */

  describe("loading states", () => {
    it("shows SkeletonChart when loading", () => {
      setupMock({ loading: true });
      render(<ForecastTimelineChart />);
      expect(screen.getByTestId("skeleton-chart")).toBeInTheDocument();
    });

    it("does not show SkeletonChart when not loading", () => {
      setupMock({ loading: false });
      render(<ForecastTimelineChart />);
      expect(screen.queryByTestId("skeleton-chart")).not.toBeInTheDocument();
    });
  });

  /* ── Error states ────────────────────────── */

  describe("error states", () => {
    it("shows ErrorFallback when forecast errors", () => {
      setupMock({ error: "Failed to fetch forecast runs" });
      render(<ForecastTimelineChart />);
      expect(screen.getByTestId("error-fallback")).toBeInTheDocument();
      expect(
        screen.getByText("Failed to fetch forecast runs"),
      ).toBeInTheDocument();
    });

    it("calls both refetchRuns and refetchDaily on retry", () => {
      setupMock({ error: "Server error" });
      render(<ForecastTimelineChart />);
      fireEvent.click(screen.getByText("Retry"));
      expect(mockRefetchRuns).toHaveBeenCalledTimes(1);
      expect(mockRefetchDaily).toHaveBeenCalledTimes(1);
    });
  });

  /* ── Empty states ────────────────────────── */

  describe("empty states", () => {
    it("shows empty message when daily data is empty", () => {
      setupMock({ dailyData: [] });
      render(<ForecastTimelineChart />);
      expect(
        screen.getByText("Aucune prevision disponible"),
      ).toBeInTheDocument();
    });

    it("shows empty message when daily data is null", () => {
      setupMock({ dailyData: null });
      render(<ForecastTimelineChart />);
      expect(
        screen.getByText("Aucune prevision disponible"),
      ).toBeInTheDocument();
    });
  });

  /* ── Success rendering ───────────────────── */

  describe("success rendering", () => {
    it("renders the data-testid wrapper", () => {
      render(<ForecastTimelineChart />);
      expect(screen.getByTestId("forecast-timeline-chart")).toBeInTheDocument();
    });

    it("renders AreaChart with correct chart data", () => {
      render(<ForecastTimelineChart />);
      const chart = screen.getByTestId("area-chart");
      const chartData = JSON.parse(chart.getAttribute("data-data")!);
      expect(chartData).toHaveLength(2);
      expect(chartData[0]["Capacite prevue actuelle"]).toBe(100);
      expect(chartData[0]["Capacite optimale predite"]).toBe(120);
      expect(chartData[0]["Capacite prevue predite"]).toBeCloseTo(113, 2);
    });

    it("renders AreaChart with correct categories", () => {
      render(<ForecastTimelineChart />);
      const chart = screen.getByTestId("area-chart");
      const categories = JSON.parse(chart.getAttribute("data-categories")!);
      expect(categories).toEqual([
        "Capacite prevue actuelle",
        "Capacite prevue predite",
        "Capacite optimale predite",
      ]);
    });

    it("formats dates using fr-FR locale", () => {
      render(<ForecastTimelineChart />);
      const chart = screen.getByTestId("area-chart");
      const chartData = JSON.parse(chart.getAttribute("data-data")!);
      expect(chartData[0].date).not.toBe("2026-02-10");
      expect(chartData[1].date).not.toBe("2026-02-11");
    });

    it("exercises the value formatter", () => {
      render(<ForecastTimelineChart />);
      const chart = screen.getByTestId("area-chart");
      expect(chart.getAttribute("data-formatted-sample")).toBe("42");
    });
  });

  /* ── Dimension toggle ────────────────────── */

  describe("dimension toggle", () => {
    it("renders Humaine button as active by default", () => {
      render(<ForecastTimelineChart />);
      const humanBtn = screen.getByText("Humaine");
      expect(humanBtn.className).toContain("bg-white");
    });

    it("renders Marchandise button as inactive by default", () => {
      render(<ForecastTimelineChart />);
      const merchBtn = screen.getByText("Marchandise");
      expect(merchBtn.className).toContain("text-gray-500");
    });

    it("toggles dimension when clicking Marchandise", () => {
      render(<ForecastTimelineChart />);
      fireEvent.click(screen.getByText("Marchandise"));
      expect(screen.getByText("Marchandise").className).toContain("bg-white");
      expect(screen.getByText("Humaine").className).toContain("text-gray-500");
    });

    it("switches back when clicking Humaine again", () => {
      render(<ForecastTimelineChart />);
      fireEvent.click(screen.getByText("Marchandise"));
      fireEvent.click(screen.getByText("Humaine"));
      expect(screen.getByText("Humaine").className).toContain("bg-white");
    });

    it("subtitle includes 'humaine' for human dimension", () => {
      render(<ForecastTimelineChart />);
      expect(
        screen.getByText(/Capacite humaine — vue lisible sur 7 jours/),
      ).toBeInTheDocument();
    });

    it("subtitle includes 'marchandise' for merchandise dimension", () => {
      render(<ForecastTimelineChart />);
      fireEvent.click(screen.getByText("Marchandise"));
      expect(
        screen.getByText(/Capacite marchandise — vue lisible sur 7 jours/),
      ).toBeInTheDocument();
    });

    it("useLatestForecasts receives human dimension by default", () => {
      render(<ForecastTimelineChart />);
      expect(mockUseLatestForecasts).toHaveBeenCalledWith("human");
    });

    it("useLatestForecasts receives merchandise after toggle", () => {
      render(<ForecastTimelineChart />);
      fireEvent.click(screen.getByText("Marchandise"));
      expect(mockUseLatestForecasts).toHaveBeenCalledWith("merchandise");
    });
  });

  /* ── Hook calls ─────────────────────────── */

  describe("hook calls", () => {
    it("calls useLatestForecasts with current dimension", () => {
      render(<ForecastTimelineChart />);
      expect(mockUseLatestForecasts).toHaveBeenCalledWith("human");
    });
  });
});
