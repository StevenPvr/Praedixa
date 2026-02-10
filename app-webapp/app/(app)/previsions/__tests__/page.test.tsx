import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PrevisionsPage from "../page";

/* ─── Hoisted Mocks ──────────────────────────────── */

const { mockUseApiGet } = vi.hoisted(() => ({
  mockUseApiGet: vi.fn(),
}));

const { mockDecomposeForecast, mockExtractFeatureImportance } = vi.hoisted(
  () => ({
    mockDecomposeForecast: vi.fn(() => ({
      trend: [],
      seasonality: [],
      residuals: [],
      confidence: [],
    })),
    mockExtractFeatureImportance: vi.fn(() => []),
  }),
);

/* ─── Module Mocks ───────────────────────────────── */

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
}));

vi.mock("@/lib/forecast-decomposition", () => ({
  decomposeForecast: (...args: unknown[]) => mockDecomposeForecast(...args),
  extractFeatureImportance: (...args: unknown[]) =>
    mockExtractFeatureImportance(...args),
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

vi.mock("@tremor/react", () => ({
  AreaChart: (props: Record<string, unknown>) => {
    const formatter = props.valueFormatter as
      | ((v: number) => string)
      | undefined;
    const formatted = formatter ? formatter(42) : "";
    return (
      <div
        data-testid="area-chart"
        data-categories={JSON.stringify(props.categories)}
        data-formatted={formatted}
      />
    );
  },
  LineChart: (props: Record<string, unknown>) => {
    const formatter = props.valueFormatter as
      | ((v: number) => string)
      | undefined;
    const formatted = formatter ? formatter(42) : "";
    return (
      <div
        data-testid="area-chart"
        data-categories={JSON.stringify(props.categories)}
        data-formatted={formatted}
      />
    );
  },
}));

vi.mock("@praedixa/ui", () => ({
  SkeletonChart: () => <div data-testid="skeleton-chart" />,
  SkeletonCard: () => <div data-testid="skeleton-card" />,
}));

vi.mock("@/components/ui/detail-card", () => ({
  DetailCard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="detail-card">{children}</div>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
}));

vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  ),
}));

vi.mock("@/components/animated-section", () => ({
  AnimatedSection: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="animated-section">{children}</div>
  ),
}));

vi.mock("@/components/error-fallback", () => ({
  ErrorFallback: ({
    message,
    onRetry,
  }: {
    message?: string;
    onRetry?: () => void;
  }) => (
    <div data-testid="error-fallback">
      {message}
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
}));

vi.mock("@/components/previsions/decomposition-panel", () => ({
  DecompositionPanel: ({
    loading,
    data,
  }: {
    loading: boolean;
    data: unknown;
  }) => (
    <div
      data-testid="decomposition-panel"
      data-loading={String(loading)}
      data-has-data={String(data !== null)}
    />
  ),
}));

vi.mock("@/components/previsions/feature-importance-bar", () => ({
  FeatureImportanceBar: ({
    features,
    loading,
  }: {
    features: unknown[];
    loading: boolean;
  }) => (
    <div
      data-testid="feature-importance-bar"
      data-loading={String(loading)}
      data-count={String(features.length)}
    />
  ),
}));

vi.mock("@/lib/formatters", () => ({
  formatSeverity: (s: string) => s,
}));

/* ─── Helpers ────────────────────────────────────── */

const RUN_ID = "40000000-0000-0000-0000-000000000001";
const mockRefetchRuns = vi.fn();
const mockRefetchDaily = vi.fn();

const SAMPLE_ALERT = {
  id: "a0000000-0000-0000-0000-000000000001",
  organizationId: "org1",
  siteId: "site-paris",
  alertDate: "2026-02-10",
  shift: "matin",
  horizon: "j3" as const,
  pRupture: 0.75,
  gapH: 12,
  severity: "high" as const,
  status: "open" as const,
  driversJson: ["absences_prevues", "pic_activite"],
  createdAt: "2026-02-08T12:00:00Z",
  updatedAt: "2026-02-08T12:00:00Z",
};

const SAMPLE_DAILY = {
  forecastDate: "2026-02-10",
  predictedDemand: 120,
  predictedCapacity: 100,
  capacityPlannedCurrent: 100,
  capacityPlannedPredicted: 113,
  capacityOptimalPredicted: 120,
  gap: -20,
  riskScore: 0.8,
  confidenceLower: 90,
  confidenceUpper: 130,
};

function setupMock(
  overrides: {
    runs?: Partial<{
      data: unknown;
      loading: boolean;
      error: string | null;
      refetch: () => void;
    }>;
    daily?: Partial<{
      data: unknown;
      loading: boolean;
      error: string | null;
      refetch: () => void;
    }>;
    alerts?: Partial<{
      data: unknown;
      loading: boolean;
      error: string | null;
      refetch: () => void;
    }>;
  } = {},
) {
  const runsResult = {
    data: [{ id: RUN_ID, status: "completed" }],
    loading: false,
    error: null,
    refetch: mockRefetchRuns,
    ...overrides.runs,
  };

  const dailyResult = {
    data: [SAMPLE_DAILY],
    loading: false,
    error: null,
    refetch: mockRefetchDaily,
    ...overrides.daily,
  };

  const alertsResult = {
    data: [SAMPLE_ALERT],
    loading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides.alerts,
  };

  mockUseApiGet.mockImplementation((url: string | null) => {
    if (url !== null && url.includes("/api/v1/forecasts?page=")) {
      return runsResult;
    }
    if (url !== null && url.includes("/daily")) {
      return dailyResult;
    }
    if (url !== null && url.includes("/coverage-alerts")) {
      return alertsResult;
    }
    // null URL (no latestRunId)
    return { data: null, loading: false, error: null, refetch: vi.fn() };
  });
}

/* ─── Tests ──────────────────────────────────────── */

describe("PrevisionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMock();
  });

  /* ── Structure ────────────────────────── */

  describe("structure", () => {
    it("renders the page title", () => {
      render(<PrevisionsPage />);
      expect(
        screen.getByRole("heading", { name: "Previsions" }),
      ).toBeInTheDocument();
    });

    it("renders the subtitle", () => {
      render(<PrevisionsPage />);
      expect(
        screen.getByText("Comprenez pourquoi et anticipez les besoins"),
      ).toBeInTheDocument();
    });

    it("renders decomposition section heading", () => {
      render(<PrevisionsPage />);
      expect(
        screen.getByRole("heading", { name: "Decomposition du signal" }),
      ).toBeInTheDocument();
    });

    it("renders feature importance section heading", () => {
      render(<PrevisionsPage />);
      expect(
        screen.getByRole("heading", { name: "Pourquoi cette prevision ?" }),
      ).toBeInTheDocument();
    });

    it("renders alerts section heading", () => {
      render(<PrevisionsPage />);
      expect(
        screen.getByRole("heading", { name: "Alertes prioritaires" }),
      ).toBeInTheDocument();
    });

    it("renders animated sections", () => {
      render(<PrevisionsPage />);
      const sections = screen.getAllByTestId("animated-section");
      expect(sections.length).toBeGreaterThanOrEqual(4);
    });
  });

  /* ── Loading states ───────────────────── */

  describe("loading states", () => {
    it("shows skeleton chart when runs are loading", () => {
      setupMock({ runs: { loading: true } });
      render(<PrevisionsPage />);
      expect(screen.getByTestId("skeleton-chart")).toBeInTheDocument();
    });

    it("shows skeleton chart when daily data is loading", () => {
      setupMock({ daily: { loading: true } });
      render(<PrevisionsPage />);
      expect(screen.getByTestId("skeleton-chart")).toBeInTheDocument();
    });

    it("passes loading=true to decomposition panel when forecast loading", () => {
      setupMock({ runs: { loading: true } });
      render(<PrevisionsPage />);
      const panel = screen.getByTestId("decomposition-panel");
      expect(panel.getAttribute("data-loading")).toBe("true");
    });

    it("shows skeleton cards when alerts are loading", () => {
      setupMock({ alerts: { loading: true } });
      render(<PrevisionsPage />);
      const skeletons = screen.getAllByTestId("skeleton-card");
      expect(skeletons).toHaveLength(3);
    });

    it("passes loading to feature importance bar", () => {
      setupMock({ alerts: { loading: true } });
      render(<PrevisionsPage />);
      const bar = screen.getByTestId("feature-importance-bar");
      expect(bar.getAttribute("data-loading")).toBe("true");
    });
  });

  /* ── Error states ─────────────────────── */

  describe("error states", () => {
    it("shows error fallback on runs error", () => {
      setupMock({ runs: { error: "Runs failed" } });
      render(<PrevisionsPage />);
      expect(screen.getByText("Runs failed")).toBeInTheDocument();
    });

    it("shows error fallback on daily error", () => {
      setupMock({ daily: { error: "Daily failed" } });
      render(<PrevisionsPage />);
      expect(screen.getByText("Daily failed")).toBeInTheDocument();
    });

    it("shows error fallback on alerts error", () => {
      setupMock({ alerts: { error: "Alerts failed" } });
      render(<PrevisionsPage />);
      expect(screen.getByText("Alerts failed")).toBeInTheDocument();
    });

    it("calls refetch on retry", () => {
      setupMock({ runs: { error: "Server error" } });
      render(<PrevisionsPage />);
      fireEvent.click(screen.getByText("Retry"));
      expect(mockRefetchRuns).toHaveBeenCalledTimes(1);
      expect(mockRefetchDaily).toHaveBeenCalledTimes(1);
    });

    it("prefers runsError over dailyError", () => {
      setupMock({
        runs: { error: "runs error" },
        daily: { error: "daily error" },
      });
      render(<PrevisionsPage />);
      expect(screen.getByText("runs error")).toBeInTheDocument();
    });
  });

  /* ── Empty states ─────────────────────── */

  describe("empty states", () => {
    it("shows empty message when no forecasts", () => {
      setupMock({ runs: { data: [] } });
      render(<PrevisionsPage />);
      expect(
        screen.getByText("Aucune prevision disponible"),
      ).toBeInTheDocument();
    });

    it("shows empty message when daily data is empty", () => {
      setupMock({ daily: { data: [] } });
      render(<PrevisionsPage />);
      expect(
        screen.getByText("Aucune prevision disponible"),
      ).toBeInTheDocument();
    });

    it("shows empty alerts message when no alerts", () => {
      setupMock({ alerts: { data: [] } });
      render(<PrevisionsPage />);
      expect(screen.getByText(/Aucune alerte active/)).toBeInTheDocument();
    });
  });

  /* ── Chart rendering ──────────────────── */

  describe("chart rendering", () => {
    it("renders area chart with data", () => {
      render(<PrevisionsPage />);
      const chart = screen.getByTestId("area-chart");
      expect(chart).toBeInTheDocument();
    });

    it("renders chart with correct categories", () => {
      render(<PrevisionsPage />);
      const chart = screen.getByTestId("area-chart");
      const cats = JSON.parse(chart.getAttribute("data-categories")!);
      expect(cats).toEqual([
        "Capacite prevue actuelle",
        "Capacite prevue predite",
        "Capacite optimale predite",
      ]);
    });

    it("exercises value formatter", () => {
      render(<PrevisionsPage />);
      const chart = screen.getByTestId("area-chart");
      expect(chart.getAttribute("data-formatted")).toBe("42");
    });
  });

  /* ── Dimension toggle ─────────────────── */

  describe("dimension toggle", () => {
    it("defaults to human dimension", () => {
      render(<PrevisionsPage />);
      expect(
        screen.getByText(/Capacite humaine — tous sites/),
      ).toBeInTheDocument();
    });

    it("shows Humaine button as active by default", () => {
      render(<PrevisionsPage />);
      const btn = screen.getByText("Humaine");
      expect(btn.className).toContain("bg-white");
    });

    it("toggles to merchandise on click", () => {
      render(<PrevisionsPage />);
      fireEvent.click(screen.getByText("Marchandise"));
      expect(
        screen.getByText(/Capacite marchandise — tous sites/),
      ).toBeInTheDocument();
      expect(screen.getByText("Marchandise").className).toContain("bg-white");
    });

    it("toggles back to human", () => {
      render(<PrevisionsPage />);
      fireEvent.click(screen.getByText("Marchandise"));
      fireEvent.click(screen.getByText("Humaine"));
      expect(
        screen.getByText(/Capacite humaine — tous sites/),
      ).toBeInTheDocument();
    });

    it("passes dimension in daily URL", () => {
      render(<PrevisionsPage />);
      expect(mockUseApiGet).toHaveBeenCalledWith(
        expect.stringContaining("dimension=human"),
      );
    });

    it("updates URL on dimension change", () => {
      render(<PrevisionsPage />);
      fireEvent.click(screen.getByText("Marchandise"));
      expect(mockUseApiGet).toHaveBeenCalledWith(
        expect.stringContaining("dimension=merchandise"),
      );
    });
  });

  /* ── Decomposition ────────────────────── */

  describe("decomposition", () => {
    it("calls decomposeForecast with daily data", () => {
      render(<PrevisionsPage />);
      expect(mockDecomposeForecast).toHaveBeenCalledWith([SAMPLE_DAILY]);
    });

    it("passes null to decomposition panel when no daily data", () => {
      setupMock({ runs: { data: [] } });
      render(<PrevisionsPage />);
      const panel = screen.getByTestId("decomposition-panel");
      expect(panel.getAttribute("data-has-data")).toBe("false");
    });
  });

  /* ── Feature importance ───────────────── */

  describe("feature importance", () => {
    it("calls extractFeatureImportance with alerts", () => {
      render(<PrevisionsPage />);
      expect(mockExtractFeatureImportance).toHaveBeenCalledWith([SAMPLE_ALERT]);
    });

    it("renders feature importance bar component", () => {
      render(<PrevisionsPage />);
      expect(screen.getByTestId("feature-importance-bar")).toBeInTheDocument();
    });

    it("returns empty features when alerts data is null", () => {
      setupMock({ alerts: { data: null } });
      render(<PrevisionsPage />);
      const bar = screen.getByTestId("feature-importance-bar");
      expect(bar.getAttribute("data-count")).toBe("0");
      expect(mockExtractFeatureImportance).not.toHaveBeenCalled();
    });
  });

  /* ── Alerts cards ─────────────────────── */

  describe("alerts cards", () => {
    it("renders alert site ID", () => {
      render(<PrevisionsPage />);
      expect(screen.getByText("site-paris")).toBeInTheDocument();
    });

    it("renders alert date and shift", () => {
      render(<PrevisionsPage />);
      expect(screen.getByText(/2026-02-10 — matin/)).toBeInTheDocument();
    });

    it("renders risk percentage", () => {
      render(<PrevisionsPage />);
      expect(screen.getByText(/Risque : 75%/)).toBeInTheDocument();
    });

    it("renders gap hours", () => {
      render(<PrevisionsPage />);
      expect(screen.getByText(/Ecart : 12h/)).toBeInTheDocument();
    });

    it("renders severity badge", () => {
      render(<PrevisionsPage />);
      expect(screen.getByTestId("badge")).toBeInTheDocument();
    });

    it("renders driver tags", () => {
      render(<PrevisionsPage />);
      expect(screen.getByText("absences_prevues")).toBeInTheDocument();
      expect(screen.getByText("pic_activite")).toBeInTheDocument();
    });

    it("renders 'Voir les solutions' link to /actions", () => {
      render(<PrevisionsPage />);
      const link = screen.getByText("Voir les solutions");
      expect(link.closest("a")).toHaveAttribute("href", "/actions");
    });

    it("limits to top 3 alerts", () => {
      const fourAlerts = Array.from({ length: 4 }, (_, i) => ({
        ...SAMPLE_ALERT,
        id: `a0000000-0000-0000-0000-00000000000${i}`,
        siteId: `site-${i}`,
      }));
      setupMock({ alerts: { data: fourAlerts } });
      render(<PrevisionsPage />);

      expect(screen.getByText("site-0")).toBeInTheDocument();
      expect(screen.getByText("site-2")).toBeInTheDocument();
      expect(screen.queryByText("site-3")).not.toBeInTheDocument();
    });

    it("does not render drivers section when driversJson is empty", () => {
      const alertNoDrivers = { ...SAMPLE_ALERT, driversJson: [] };
      setupMock({ alerts: { data: [alertNoDrivers] } });
      render(<PrevisionsPage />);

      // The drivers wrapper should not be present — check no rounded-full bg-gray-100 spans
      expect(screen.queryByText("absences_prevues")).not.toBeInTheDocument();
    });

    it("renders medium severity badge with default variant", () => {
      const mediumAlert = { ...SAMPLE_ALERT, severity: "medium" as const };
      setupMock({ alerts: { data: [mediumAlert] } });
      render(<PrevisionsPage />);
      expect(screen.getByTestId("badge")).toBeInTheDocument();
      expect(screen.getByText("medium")).toBeInTheDocument();
    });

    it("renders low severity badge with secondary variant", () => {
      const lowAlert = { ...SAMPLE_ALERT, severity: "low" as const };
      setupMock({ alerts: { data: [lowAlert] } });
      render(<PrevisionsPage />);
      expect(screen.getByTestId("badge")).toBeInTheDocument();
      expect(screen.getByText("low")).toBeInTheDocument();
    });

    it("renders critical severity badge with destructive variant", () => {
      const criticalAlert = { ...SAMPLE_ALERT, severity: "critical" as const };
      setupMock({ alerts: { data: [criticalAlert] } });
      render(<PrevisionsPage />);
      expect(screen.getByTestId("badge")).toBeInTheDocument();
      expect(screen.getByText("critical")).toBeInTheDocument();
    });
  });

  /* ── URL construction ─────────────────── */

  describe("URL construction", () => {
    it("fetches forecast runs with correct URL", () => {
      render(<PrevisionsPage />);
      expect(mockUseApiGet).toHaveBeenCalledWith(
        "/api/v1/forecasts?page=1&page_size=1&status=completed",
      );
    });

    it("fetches daily forecasts with run ID in URL", () => {
      render(<PrevisionsPage />);
      expect(mockUseApiGet).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/forecasts/${RUN_ID}/daily`),
      );
    });

    it("passes null URL when no run ID", () => {
      setupMock({ runs: { data: [] } });
      render(<PrevisionsPage />);
      expect(mockUseApiGet).toHaveBeenCalledWith(null);
    });

    it("fetches coverage alerts with status=open", () => {
      render(<PrevisionsPage />);
      expect(mockUseApiGet).toHaveBeenCalledWith(
        "/api/v1/coverage-alerts?status=open",
      );
    });

    it("passes null URL when run ID is not a valid UUID", () => {
      setupMock({
        runs: { data: [{ id: "not-a-uuid", status: "completed" }] },
      });
      render(<PrevisionsPage />);
      expect(mockUseApiGet).toHaveBeenCalledWith(null);
    });
  });

  /* ── No daily loading when no run ID ──── */

  describe("loading edge cases", () => {
    it("does not show forecast loading when no run ID but daily is loading", () => {
      setupMock({ runs: { data: [] }, daily: { loading: true } });
      render(<PrevisionsPage />);
      // forecastLoading = runsLoading || (dailyRunId !== null && dailyLoading)
      // runsLoading=false, dailyRunId=null → forecastLoading=false
      expect(screen.queryByTestId("skeleton-chart")).not.toBeInTheDocument();
    });
  });
});
