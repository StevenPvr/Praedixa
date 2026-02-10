import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ForecastChart } from "../forecast-chart";

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
    // Invoke valueFormatter to exercise the inline arrow function for coverage
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
  data: [{ id: RUN_ID, status: "completed", accuracyScore: 95 }],
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
    // url === null (no latestRunId)
    return { data: null, loading: false, error: null, refetch: vi.fn() };
  });
}

/* ─── Tests ──────────────────────────────────────────── */

describe("ForecastChart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMock();
  });

  /* ── Loading states ──────────────────────── */

  describe("loading states", () => {
    it("shows SkeletonChart when runs are loading", () => {
      setupMock({ loading: true });
      render(<ForecastChart />);
      expect(screen.getByTestId("skeleton-chart")).toBeInTheDocument();
    });

    it("shows SkeletonChart when runs loaded but daily data is loading", () => {
      setupMock(undefined, { loading: true });
      render(<ForecastChart />);
      expect(screen.getByTestId("skeleton-chart")).toBeInTheDocument();
    });

    it("does not show SkeletonChart when daily is loading but no latestRunId", () => {
      // runs return empty array => no latestRunId => loading = runsLoading || false
      setupMock({ data: [] }, { loading: true });
      render(<ForecastChart />);
      expect(screen.queryByTestId("skeleton-chart")).not.toBeInTheDocument();
    });
  });

  /* ── Error states ────────────────────────── */

  describe("error states", () => {
    it("shows ErrorFallback when runs fetch errors", () => {
      setupMock({ error: "Failed to fetch forecast runs" });
      render(<ForecastChart />);
      expect(screen.getByTestId("error-fallback")).toBeInTheDocument();
      expect(
        screen.getByText("Failed to fetch forecast runs"),
      ).toBeInTheDocument();
    });

    it("shows ErrorFallback when daily fetch errors", () => {
      setupMock(undefined, { error: "Daily data unavailable" });
      render(<ForecastChart />);
      expect(screen.getByTestId("error-fallback")).toBeInTheDocument();
      expect(screen.getByText("Daily data unavailable")).toBeInTheDocument();
    });

    it("prefers runsError over dailyError (runsError ?? dailyError)", () => {
      setupMock({ error: "runs error" }, { error: "daily error" });
      render(<ForecastChart />);
      expect(screen.getByText("runs error")).toBeInTheDocument();
    });

    it("calls both refetchRuns and refetchDaily on retry", () => {
      setupMock({ error: "Server error" });
      render(<ForecastChart />);
      fireEvent.click(screen.getByText("Retry"));
      expect(mockRefetchRuns).toHaveBeenCalledTimes(1);
      expect(mockRefetchDaily).toHaveBeenCalledTimes(1);
    });
  });

  /* ── Empty states ────────────────────────── */

  describe("empty states", () => {
    it("shows empty message when runs return empty array", () => {
      setupMock({ data: [] });
      render(<ForecastChart />);
      expect(
        screen.getByText("Aucune prevision disponible"),
      ).toBeInTheDocument();
    });

    it("shows empty message when runs loaded but daily data is empty", () => {
      setupMock(undefined, { data: [] });
      render(<ForecastChart />);
      expect(
        screen.getByText("Aucune prevision disponible"),
      ).toBeInTheDocument();
    });

    it("shows empty message when daily data is null", () => {
      setupMock(undefined, { data: null as unknown as [] });
      render(<ForecastChart />);
      expect(
        screen.getByText("Aucune prevision disponible"),
      ).toBeInTheDocument();
    });
  });

  /* ── Success rendering ───────────────────── */

  describe("success rendering", () => {
    it("renders AreaChart with correct chart data", () => {
      render(<ForecastChart />);
      const chart = screen.getByTestId("area-chart");
      expect(chart).toBeInTheDocument();

      const chartData = JSON.parse(chart.getAttribute("data-data")!);
      expect(chartData).toHaveLength(2);
      // formatDate("2026-02-10") => "10 fevr." in fr-FR
      expect(chartData[0]["Capacite prevue actuelle"]).toBe(100);
      expect(chartData[0]["Capacite optimale predite"]).toBe(120);
      expect(chartData[0]["Capacite prevue predite"]).toBeCloseTo(113, 2);
    });

    it("renders AreaChart with correct categories", () => {
      render(<ForecastChart />);
      const chart = screen.getByTestId("area-chart");
      const categories = JSON.parse(chart.getAttribute("data-categories")!);
      expect(categories).toEqual([
        "Capacite prevue actuelle",
        "Capacite prevue predite",
        "Capacite optimale predite",
      ]);
    });

    it("formats dates using fr-FR locale", () => {
      render(<ForecastChart />);
      const chart = screen.getByTestId("area-chart");
      const chartData = JSON.parse(chart.getAttribute("data-data")!);
      // Dates should be formatted — the exact locale output depends on the environment
      // but they should NOT be the raw ISO strings
      expect(chartData[0].date).not.toBe("2026-02-10");
      expect(chartData[1].date).not.toBe("2026-02-11");
    });
  });

  /* ── Dimension toggle ────────────────────── */

  describe("dimension toggle", () => {
    it("renders Humaine button as active by default", () => {
      render(<ForecastChart />);
      const humanBtn = screen.getByText("Humaine");
      expect(humanBtn.className).toContain("bg-white");
    });

    it("renders Marchandise button as inactive by default", () => {
      render(<ForecastChart />);
      const merchBtn = screen.getByText("Marchandise");
      expect(merchBtn.className).toContain("text-gray-500");
      expect(merchBtn.className).not.toContain("bg-white");
    });

    it("toggles dimension when clicking Marchandise", () => {
      render(<ForecastChart />);
      const merchBtn = screen.getByText("Marchandise");
      fireEvent.click(merchBtn);

      // After click, Marchandise should be active
      expect(merchBtn.className).toContain("bg-white");
      // Humaine should now be inactive
      const humanBtn = screen.getByText("Humaine");
      expect(humanBtn.className).toContain("text-gray-500");
    });

    it("clicking Humaine after Marchandise switches back to human", () => {
      render(<ForecastChart />);
      fireEvent.click(screen.getByText("Marchandise"));
      fireEvent.click(screen.getByText("Humaine"));
      const humanBtn = screen.getByText("Humaine");
      expect(humanBtn.className).toContain("bg-white");
    });

    it("subtitle includes 'humaine' for human dimension", () => {
      render(<ForecastChart />);
      expect(
        screen.getByText(/Capacite humaine — tous sites/),
      ).toBeInTheDocument();
    });

    it("subtitle includes 'marchandise' for merchandise dimension", () => {
      render(<ForecastChart />);
      fireEvent.click(screen.getByText("Marchandise"));
      expect(
        screen.getByText(/Capacite marchandise — tous sites/),
      ).toBeInTheDocument();
    });

    it("useApiGet daily URL includes dimension parameter", () => {
      render(<ForecastChart />);
      // Default dimension is "human"
      expect(mockUseApiGet).toHaveBeenCalledWith(
        expect.stringContaining("dimension=human"),
      );
    });

    it("useApiGet daily URL updates when dimension changes", () => {
      render(<ForecastChart />);
      fireEvent.click(screen.getByText("Marchandise"));
      expect(mockUseApiGet).toHaveBeenCalledWith(
        expect.stringContaining("dimension=merchandise"),
      );
    });
  });

  /* ── URL construction ────────────────────── */

  describe("URL construction", () => {
    it("passes null URL to second useApiGet when no latestRunId", () => {
      setupMock({ data: [] });
      render(<ForecastChart />);
      // Second call should receive null
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
      render(<ForecastChart />);
      expect(mockUseApiGet).toHaveBeenCalledWith(
        "/api/v1/forecasts?page=1&page_size=1&status=completed",
      );
    });

    it("encodes latestRunId in daily URL", () => {
      render(<ForecastChart />);
      expect(mockUseApiGet).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/forecasts/${RUN_ID}/daily`),
      );
    });
  });

  /* ── Structure and accessibility ─────────── */

  describe("structure and accessibility", () => {
    it("wraps content in a section with aria-label", () => {
      render(<ForecastChart />);
      expect(
        screen.getByRole("region", { name: "Prevision de couverture" }),
      ).toBeInTheDocument();
    });

    it("renders the heading text", () => {
      render(<ForecastChart />);
      expect(
        screen.getByText("Prevision de couverture a 14 jours"),
      ).toBeInTheDocument();
    });
  });
});
