import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ForecastTimelineChart } from "../forecast-timeline-chart";

/* ─── Mocks ──────────────────────────────────────────── */

const mockRefetchRuns = vi.fn();
const mockRefetchDaily = vi.fn();
const mockUseApiGet = vi.fn();
const RUN_ID = "40000000-0000-0000-0000-000000000001";

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
}));

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

const defaultRunsResponse = {
  data: [{ id: RUN_ID, status: "completed" }],
  loading: false,
  error: null,
  refetch: mockRefetchRuns,
};

const defaultDailyResponse = {
  data: [
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
  ],
  loading: false,
  error: null,
  refetch: mockRefetchDaily,
};

function setupMock(
  runsOverride?: Partial<typeof defaultRunsResponse>,
  dailyOverride?: Partial<typeof defaultDailyResponse>,
) {
  const runsResult = { ...defaultRunsResponse, ...runsOverride };
  const dailyResult = { ...defaultDailyResponse, ...dailyOverride };

  mockUseApiGet.mockImplementation((url: string | null) => {
    if (url !== null && url.includes("/api/v1/forecasts?page=")) {
      return runsResult;
    }
    if (url !== null && url.includes("/daily")) {
      return dailyResult;
    }
    return { data: null, loading: false, error: null, refetch: vi.fn() };
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
    it("shows SkeletonChart when runs are loading", () => {
      setupMock({ loading: true });
      render(<ForecastTimelineChart />);
      expect(screen.getByTestId("skeleton-chart")).toBeInTheDocument();
    });

    it("shows SkeletonChart when daily data is loading", () => {
      setupMock(undefined, { loading: true });
      render(<ForecastTimelineChart />);
      expect(screen.getByTestId("skeleton-chart")).toBeInTheDocument();
    });

    it("does not show SkeletonChart when daily is loading but no latestRunId", () => {
      setupMock({ data: [] }, { loading: true });
      render(<ForecastTimelineChart />);
      expect(screen.queryByTestId("skeleton-chart")).not.toBeInTheDocument();
    });
  });

  /* ── Error states ────────────────────────── */

  describe("error states", () => {
    it("shows ErrorFallback when runs fetch errors", () => {
      setupMock({ error: "Failed to fetch forecast runs" });
      render(<ForecastTimelineChart />);
      expect(screen.getByTestId("error-fallback")).toBeInTheDocument();
      expect(
        screen.getByText("Failed to fetch forecast runs"),
      ).toBeInTheDocument();
    });

    it("shows ErrorFallback when daily fetch errors", () => {
      setupMock(undefined, { error: "Daily data unavailable" });
      render(<ForecastTimelineChart />);
      expect(screen.getByText("Daily data unavailable")).toBeInTheDocument();
    });

    it("prefers runsError over dailyError", () => {
      setupMock({ error: "runs error" }, { error: "daily error" });
      render(<ForecastTimelineChart />);
      expect(screen.getByText("runs error")).toBeInTheDocument();
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
    it("shows empty message when runs return empty array", () => {
      setupMock({ data: [] });
      render(<ForecastTimelineChart />);
      expect(
        screen.getByText("Aucune prevision disponible"),
      ).toBeInTheDocument();
    });

    it("shows empty message when daily data is empty", () => {
      setupMock(undefined, { data: [] });
      render(<ForecastTimelineChart />);
      expect(
        screen.getByText("Aucune prevision disponible"),
      ).toBeInTheDocument();
    });

    it("shows empty message when daily data is null", () => {
      setupMock(undefined, { data: null as unknown as [] });
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
        screen.getByText(/Capacite humaine — tous sites/),
      ).toBeInTheDocument();
    });

    it("subtitle includes 'marchandise' for merchandise dimension", () => {
      render(<ForecastTimelineChart />);
      fireEvent.click(screen.getByText("Marchandise"));
      expect(
        screen.getByText(/Capacite marchandise — tous sites/),
      ).toBeInTheDocument();
    });

    it("useApiGet daily URL includes dimension parameter", () => {
      render(<ForecastTimelineChart />);
      expect(mockUseApiGet).toHaveBeenCalledWith(
        expect.stringContaining("dimension=human"),
      );
    });

    it("useApiGet daily URL updates when dimension changes", () => {
      render(<ForecastTimelineChart />);
      fireEvent.click(screen.getByText("Marchandise"));
      expect(mockUseApiGet).toHaveBeenCalledWith(
        expect.stringContaining("dimension=merchandise"),
      );
    });
  });

  /* ── URL construction ────────────────────── */

  describe("URL construction", () => {
    it("passes null URL when no latestRunId", () => {
      setupMock({ data: [] });
      render(<ForecastTimelineChart />);
      const calls = mockUseApiGet.mock.calls;
      const secondCalls = calls.filter(
        (c: [string | null]) =>
          c[0] === null ||
          (typeof c[0] === "string" && c[0].includes("/daily")),
      );
      expect(secondCalls.some((c: [string | null]) => c[0] === null)).toBe(
        true,
      );
    });

    it("passes forecast run URL with correct query params", () => {
      render(<ForecastTimelineChart />);
      expect(mockUseApiGet).toHaveBeenCalledWith(
        "/api/v1/forecasts?page=1&page_size=1&status=completed",
      );
    });

    it("encodes latestRunId in daily URL", () => {
      render(<ForecastTimelineChart />);
      expect(mockUseApiGet).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/forecasts/${RUN_ID}/daily`),
      );
    });
  });
});
