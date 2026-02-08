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
  HeatmapGrid: ({
    cells,
    rows,
    columns,
  }: {
    cells: unknown[];
    rows: string[];
    columns: string[];
  }) => (
    <div data-testid="heatmap-grid">
      {cells.length} cells, {rows.length} rows, {columns.length} cols
    </div>
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

vi.mock("@/components/status-banner", () => ({
  StatusBanner: ({
    variant,
    children,
  }: {
    variant: string;
    children: React.ReactNode;
  }) => (
    <div data-testid="status-banner" data-variant={variant}>
      {children}
    </div>
  ),
}));

vi.mock("@/lib/formatters", () => ({
  formatSeverity: (s: string) => {
    const m: Record<string, string> = {
      critical: "Critique",
      high: "Elevee",
      medium: "Moderee",
      low: "Faible",
    };
    return m[s] ?? s;
  },
}));

vi.mock("lucide-react", () => ({
  AlertTriangle: () => <svg data-testid="icon-alert" />,
  BarChart3: () => <svg data-testid="icon-bar" />,
  ShieldCheck: () => <svg data-testid="icon-shield" />,
  TrendingUp: () => <svg data-testid="icon-trend" />,
}));

/* -- Mock data ---------------------------------------- */

const mockAlerts = [
  {
    id: "a1",
    siteId: "Lyon",
    alertDate: "2026-02-02", // Monday
    shift: "AM",
    severity: "high",
    gapH: 4,
    pRupture: 0.3,
    status: "open",
  },
  {
    id: "a2",
    siteId: "Paris",
    alertDate: "2026-02-03", // Tuesday
    shift: "PM",
    severity: "medium",
    gapH: 2,
    pRupture: 0.15,
    status: "open",
  },
];

const mockQuality = {
  totalRecords: 500,
  coveragePct: "87.50",
  sites: 2,
  dateRange: ["2026-01-01", "2026-02-07"],
  missingShiftsPct: "1.20",
  avgAbsPct: "3.40",
};

const mockSummary = {
  coverageHuman: 85.5,
  coverageMerchandise: 90.2,
  activeAlertsCount: 3,
  forecastAccuracy: 92.1,
  lastForecastDate: "2026-02-07",
};

const mockOverrideStats = {
  totalDecisions: 20,
  overrideCount: 4,
  overridePct: 20.0,
  topOverrideReasons: [{ reason: "Experience terrain", count: 3 }],
  avgCostDelta: 150,
};

const mockProofSummary = {
  totalGainNetEur: 15000,
  avgAdoptionPct: 0.85,
  totalAlertesEmises: 42,
  totalAlertesTraitees: 38,
  records: [],
};

/* -- Helper ------------------------------------------- */

function has(o: Partial<Record<string, unknown>> | undefined, k: string) {
  return o != null && k in o;
}

function setupMocks(overrides?: Partial<Record<string, unknown>>) {
  mockUseApiGet.mockImplementation((url: string | null) => {
    if (url?.includes("coverage-alerts")) {
      return {
        data: has(overrides, "alerts") ? overrides!.alerts : mockAlerts,
        loading: overrides?.alertsLoading ?? false,
        error: overrides?.alertsError ?? null,
        refetch: vi.fn(),
      };
    }
    if (url?.includes("canonical/quality")) {
      return {
        data: has(overrides, "quality") ? overrides!.quality : mockQuality,
        loading: overrides?.qualityLoading ?? false,
        error: overrides?.qualityError ?? null,
        refetch: vi.fn(),
      };
    }
    if (url?.includes("dashboard/summary")) {
      return {
        data: has(overrides, "summary") ? overrides!.summary : mockSummary,
        loading: overrides?.summaryLoading ?? false,
        error: null,
        refetch: vi.fn(),
      };
    }
    if (url?.includes("override-stats")) {
      return {
        data: has(overrides, "overrideStats")
          ? overrides!.overrideStats
          : mockOverrideStats,
        loading: overrides?.overrideLoading ?? false,
        error: null,
        refetch: vi.fn(),
      };
    }
    if (url?.includes("proof/summary")) {
      return {
        data: has(overrides, "proofSummary")
          ? overrides!.proofSummary
          : mockProofSummary,
        loading: overrides?.proofLoading ?? false,
        error: null,
        refetch: vi.fn(),
      };
    }
    return { data: null, loading: false, error: null, refetch: vi.fn() };
  });
}

/* -- Tests -------------------------------------------- */

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it("renders the Tableau de bord heading", () => {
    render(<DashboardPage />);
    expect(
      screen.getByRole("heading", { name: "Tableau de bord" }),
    ).toBeInTheDocument();
  });

  it("renders the page description", () => {
    render(<DashboardPage />);
    expect(
      screen.getByText(/Vos sites sont-ils prets pour les prochains jours/),
    ).toBeInTheDocument();
  });

  it("renders KPI stat cards section", () => {
    render(<DashboardPage />);
    expect(screen.getByLabelText("Indicateurs cles")).toBeInTheDocument();
  });

  it("renders the heatmap section", () => {
    render(<DashboardPage />);
    expect(
      screen.getByLabelText("Couverture par site et par jour"),
    ).toBeInTheDocument();
  });

  it("renders the top alerts section", () => {
    render(<DashboardPage />);
    expect(screen.getByLabelText("Alertes en cours")).toBeInTheDocument();
  });

  it("renders the performance section", () => {
    render(<DashboardPage />);
    expect(screen.getByLabelText("Performance globale")).toBeInTheDocument();
  });

  /* -- Status Banner ---------------------------------- */

  it("shows warning status banner when alerts exist but none critical", () => {
    render(<DashboardPage />);
    const banner = screen.getByTestId("status-banner");
    expect(banner).toHaveAttribute("data-variant", "warning");
    expect(banner).toHaveTextContent("2 site(s) presentent un risque");
  });

  it("shows danger status banner when critical alerts exist", () => {
    const criticalAlerts = [
      { ...mockAlerts[0], severity: "critical" },
      mockAlerts[1],
    ];
    setupMocks({ alerts: criticalAlerts });
    render(<DashboardPage />);
    const banner = screen.getByTestId("status-banner");
    expect(banner).toHaveAttribute("data-variant", "danger");
    expect(banner).toHaveTextContent("1 alerte(s) critique(s)");
  });

  it("shows success status banner when no alerts", () => {
    setupMocks({ alerts: [] });
    render(<DashboardPage />);
    const banner = screen.getByTestId("status-banner");
    expect(banner).toHaveAttribute("data-variant", "success");
    expect(banner).toHaveTextContent("Tous vos sites sont couverts");
  });

  it("hides banner while loading", () => {
    setupMocks({ alertsLoading: true });
    render(<DashboardPage />);
    expect(screen.queryByTestId("status-banner")).not.toBeInTheDocument();
  });

  it("hides banner when alerts is null", () => {
    setupMocks({ alerts: null });
    render(<DashboardPage />);
    expect(screen.queryByTestId("status-banner")).not.toBeInTheDocument();
  });

  /* -- Loading states --------------------------------- */

  it("shows loading skeletons when alerts are loading", () => {
    setupMocks({ alertsLoading: true });
    render(<DashboardPage />);
    expect(screen.getAllByTestId("skeleton-card").length).toBeGreaterThan(0);
  });

  it("shows loading skeletons when quality is loading", () => {
    setupMocks({ qualityLoading: true });
    render(<DashboardPage />);
    expect(screen.getAllByTestId("skeleton-card").length).toBeGreaterThan(0);
  });

  it("shows loading skeletons when summary is loading", () => {
    setupMocks({ summaryLoading: true });
    render(<DashboardPage />);
    expect(screen.getAllByTestId("skeleton-card").length).toBeGreaterThan(0);
  });

  it("shows loading skeletons when override stats are loading", () => {
    setupMocks({ overrideLoading: true });
    render(<DashboardPage />);
    expect(screen.getAllByTestId("skeleton-card").length).toBeGreaterThan(0);
  });

  it("shows skeleton card when proof summary is loading", () => {
    setupMocks({ proofLoading: true });
    render(<DashboardPage />);
    const section = screen.getByLabelText("Performance globale");
    expect(section.querySelector("[data-testid=skeleton-card]")).toBeTruthy();
  });

  /* -- Error states ----------------------------------- */

  it("shows error fallback on alerts error", () => {
    setupMocks({ alertsError: "Server error" });
    render(<DashboardPage />);
    expect(screen.getByText("Server error")).toBeInTheDocument();
  });

  /* -- StatCard values -------------------------------- */

  it("displays coverage percent from quality data", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("stat-Couverture equipes")).toHaveTextContent(
      "87.5%",
    );
  });

  it("displays active alerts count from summary", () => {
    render(<DashboardPage />);
    // summary.activeAlertsCount = 3 takes priority over alerts.length = 2
    expect(screen.getByTestId("stat-Sites en alerte")).toHaveTextContent("3");
  });

  it("falls back to alerts.length when no summary", () => {
    setupMocks({ summary: null });
    render(<DashboardPage />);
    expect(screen.getByTestId("stat-Sites en alerte")).toHaveTextContent("2");
  });

  it("shows computed cost estimate from alerts", () => {
    // gapH: 4*40=160, 2*40=80 -> total 240
    render(<DashboardPage />);
    expect(screen.getByTestId("stat-Cout prevu a 7 jours")).toHaveTextContent(
      "240 EUR",
    );
  });

  it('shows "--" for cost when no alerts', () => {
    setupMocks({ alerts: [] });
    render(<DashboardPage />);
    expect(screen.getByTestId("stat-Cout prevu a 7 jours")).toHaveTextContent(
      "--",
    );
  });

  it("shows adoption rate derived from override stats", () => {
    // 100 - 20 = 80%
    render(<DashboardPage />);
    expect(
      screen.getByTestId("stat-Suivi des recommandations"),
    ).toHaveTextContent("80%");
  });

  it('shows "--" for adoption when no override stats', () => {
    setupMocks({ overrideStats: null });
    render(<DashboardPage />);
    expect(
      screen.getByTestId("stat-Suivi des recommandations"),
    ).toHaveTextContent("--");
  });

  it('shows "--" for coverage when no quality data', () => {
    setupMocks({ quality: null });
    render(<DashboardPage />);
    expect(screen.getByTestId("stat-Couverture equipes")).toHaveTextContent(
      "--",
    );
  });

  /* -- Heatmap ---------------------------------------- */

  it("renders heatmap from alert data", () => {
    render(<DashboardPage />);
    const heatmap = screen.getByTestId("heatmap-grid");
    // 2 alerts = 2 cells (Lyon-Lun, Paris-Mar), 2 rows, 2 cols
    expect(heatmap).toHaveTextContent("2 cells");
    expect(heatmap).toHaveTextContent("2 rows");
    expect(heatmap).toHaveTextContent("2 cols");
  });

  it("shows empty heatmap message when no alerts", () => {
    setupMocks({ alerts: [] });
    render(<DashboardPage />);
    expect(
      screen.getByText(/Les donnees de couverture apparaitront ici/),
    ).toBeInTheDocument();
  });

  it("shows empty heatmap message when alerts is null", () => {
    setupMocks({ alerts: null });
    render(<DashboardPage />);
    expect(
      screen.getByText(/Les donnees de couverture apparaitront ici/),
    ).toBeInTheDocument();
  });

  /* -- Proof Summary / Performance globale ------------ */

  it("displays proof summary data when available", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Economies realisees")).toBeInTheDocument();
    expect(screen.getByText(/15[\s\u202f]?000 EUR/)).toBeInTheDocument();
    expect(screen.getByText("Recommandations suivies")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("Alertes detectees")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Alertes resolues")).toBeInTheDocument();
    expect(screen.getByText("38")).toBeInTheDocument();
  });

  it("shows empty state when no proof summary", () => {
    setupMocks({ proofSummary: null });
    render(<DashboardPage />);
    expect(
      screen.getByText(/Vos bilans de performance apparaitront ici/),
    ).toBeInTheDocument();
  });

  it('shows "--" for adoption moyenne when avgAdoptionPct is null', () => {
    setupMocks({
      proofSummary: { ...mockProofSummary, avgAdoptionPct: null },
    });
    render(<DashboardPage />);
    const section = screen.getByLabelText("Performance globale");
    expect(section).toHaveTextContent("--");
  });

  /* -- Alerts table ----------------------------------- */

  it("renders alert data in data table", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("data-table")).toHaveTextContent("2 rows");
  });

  it("shows skeleton table when alerts are loading", () => {
    setupMocks({ alertsLoading: true });
    render(<DashboardPage />);
    expect(screen.getByTestId("skeleton-table")).toBeInTheDocument();
  });

  /* -- useApiGet call validation ---------------------- */

  it("calls useApiGet with correct endpoints", () => {
    render(<DashboardPage />);
    const calls = mockUseApiGet.mock.calls.map((c: unknown[]) => c[0]);
    expect(calls).toContain("/api/v1/coverage-alerts?status=open&page_size=5");
    expect(calls).toContain("/api/v1/canonical/quality");
    expect(calls).toContain("/api/v1/dashboard/summary");
    expect(calls).toContain("/api/v1/operational-decisions/override-stats");
    expect(calls).toContain("/api/v1/proof/summary");
  });
});
