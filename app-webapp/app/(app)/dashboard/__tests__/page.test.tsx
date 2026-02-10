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
  SkeletonCard: () => <div data-testid="skeleton-card" />,
  SkeletonChart: () => <div data-testid="skeleton-chart" />,
}));

vi.mock("@/components/ui/detail-card", () => ({
  DetailCard: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="detail-card" className={className}>
      {children}
    </div>
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

vi.mock("@/components/staggered-grid", () => ({
  StaggeredGrid: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="staggered-grid">{children}</div>
  ),
  StaggeredItem: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="staggered-item">{children}</div>
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

vi.mock("@/components/dashboard/forecast-timeline-chart", () => ({
  ForecastTimelineChart: () => (
    <div data-testid="forecast-timeline-chart">ForecastTimelineChart</div>
  ),
}));

vi.mock("@/components/dashboard/next-action-card", () => ({
  NextActionCard: ({
    alerts,
    loading,
  }: {
    alerts: unknown[] | null;
    loading: boolean;
  }) => (
    <div data-testid="next-action-card">
      {loading ? "loading" : `${alerts?.length ?? 0} alerts`}
    </div>
  ),
}));

vi.mock("@/components/dashboard/scenario-comparison-chart", () => ({
  ScenarioComparisonChart: () => (
    <div data-testid="scenario-comparison-chart">ScenarioComparisonChart</div>
  ),
}));

vi.mock("lucide-react", () => ({
  AlertTriangle: () => <svg data-testid="icon-alert" />,
  ShieldCheck: () => <svg data-testid="icon-shield" />,
  TrendingUp: () => <svg data-testid="icon-trend" />,
}));

/* -- Mock data ---------------------------------------- */

const mockAlerts = [
  {
    id: "a1",
    siteId: "Lyon",
    alertDate: "2026-02-02",
    shift: "AM",
    severity: "high",
    gapH: 4,
    pRupture: 0.3,
    status: "open",
    driversJson: ["absence_rate"],
  },
  {
    id: "a2",
    siteId: "Paris",
    alertDate: "2026-02-03",
    shift: "PM",
    severity: "medium",
    gapH: 2,
    pRupture: 0.15,
    status: "open",
    driversJson: [],
  },
];

const mockSummary = {
  coverageHuman: 85.5,
  coverageMerchandise: 90.2,
  activeAlertsCount: 3,
  forecastAccuracy: 92.1,
  lastForecastDate: "2026-02-07",
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
    if (url?.includes("dashboard/summary")) {
      return {
        data: has(overrides, "summary") ? overrides!.summary : mockSummary,
        loading: overrides?.summaryLoading ?? false,
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

  it("renders the Accueil heading", () => {
    render(<DashboardPage />);
    expect(
      screen.getByRole("heading", { name: "Accueil" }),
    ).toBeInTheDocument();
  });

  it("renders the page subtitle", () => {
    render(<DashboardPage />);
    expect(
      screen.getByText(/Vue d'ensemble de vos previsions/),
    ).toBeInTheDocument();
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

  it("danger banner CTA links to /actions", () => {
    const criticalAlerts = [{ ...mockAlerts[0], severity: "critical" }];
    setupMocks({ alerts: criticalAlerts });
    render(<DashboardPage />);
    const link = screen.getByText("Voir les actions");
    expect(link).toHaveAttribute("href", "/actions");
  });

  it("warning banner CTA links to /previsions", () => {
    render(<DashboardPage />);
    const link = screen.getByText("Voir le detail");
    expect(link).toHaveAttribute("href", "/previsions");
  });

  /* -- Loading states --------------------------------- */

  it("shows skeleton cards when loading", () => {
    setupMocks({ alertsLoading: true });
    render(<DashboardPage />);
    expect(screen.getAllByTestId("skeleton-card").length).toBe(3);
  });

  it("shows skeleton chart when loading", () => {
    setupMocks({ summaryLoading: true });
    render(<DashboardPage />);
    expect(screen.getByTestId("skeleton-chart")).toBeInTheDocument();
  });

  /* -- KPI StatCards ---------------------------------- */

  it("displays coverage percent from summary", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("stat-Couverture equipes")).toHaveTextContent(
      "85.5%",
    );
  });

  it('shows "--" for coverage when no summary', () => {
    setupMocks({ summary: null });
    render(<DashboardPage />);
    expect(screen.getByTestId("stat-Couverture equipes")).toHaveTextContent(
      "--",
    );
  });

  it("displays active alerts count from summary", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("stat-Alertes actives")).toHaveTextContent("3");
  });

  it("shows 0 alerts when no summary", () => {
    setupMocks({ summary: null });
    render(<DashboardPage />);
    expect(screen.getByTestId("stat-Alertes actives")).toHaveTextContent("0");
  });

  it("displays last forecast date formatted", () => {
    render(<DashboardPage />);
    // Date formatting depends on locale — just check it's not the raw ISO string
    const el = screen.getByTestId("stat-Derniere prevision");
    expect(el.textContent).not.toBe("2026-02-07");
    expect(el.textContent).not.toBe("--");
  });

  it('shows "--" for last forecast date when null', () => {
    setupMocks({ summary: { ...mockSummary, lastForecastDate: null } });
    render(<DashboardPage />);
    expect(screen.getByTestId("stat-Derniere prevision")).toHaveTextContent(
      "--",
    );
  });

  it('shows "--" for last forecast date when no summary', () => {
    setupMocks({ summary: null });
    render(<DashboardPage />);
    expect(screen.getByTestId("stat-Derniere prevision")).toHaveTextContent(
      "--",
    );
  });

  /* -- Sections --------------------------------------- */

  it("renders the forecast timeline section", () => {
    render(<DashboardPage />);
    expect(screen.getByLabelText("Prevision de capacite")).toBeInTheDocument();
    expect(screen.getByTestId("forecast-timeline-chart")).toBeInTheDocument();
  });

  it("renders the forecast explanation card", () => {
    render(<DashboardPage />);
    expect(
      screen.getByText(/Comparez la capacite prevue actuelle/),
    ).toBeInTheDocument();
  });

  it("renders the next action section", () => {
    render(<DashboardPage />);
    expect(
      screen.getByLabelText("Prochaine action recommandee"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("next-action-card")).toBeInTheDocument();
  });

  it("passes alerts and loading to NextActionCard", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("next-action-card")).toHaveTextContent(
      "2 alerts",
    );
  });

  it("renders the scenario comparison section", () => {
    render(<DashboardPage />);
    expect(
      screen.getByLabelText("Comparaison des scenarios"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("scenario-comparison-chart")).toBeInTheDocument();
  });

  it("renders the scenario explanation card", () => {
    render(<DashboardPage />);
    expect(screen.getByText(/Rouge = cout sans Praedixa/)).toBeInTheDocument();
  });

  it("renders section headings with font-serif", () => {
    render(<DashboardPage />);
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings).toHaveLength(3);
    expect(headings[0]).toHaveTextContent("Prevision de capacite");
    expect(headings[1]).toHaveTextContent("Prochaine action recommandee");
    expect(headings[2]).toHaveTextContent("Comparaison des scenarios");
  });

  /* -- useApiGet call validation ---------------------- */

  it("calls useApiGet with correct endpoints", () => {
    render(<DashboardPage />);
    const calls = mockUseApiGet.mock.calls.map((c: unknown[]) => c[0]);
    expect(calls).toContain("/api/v1/coverage-alerts?status=open&page_size=50");
    expect(calls).toContain("/api/v1/dashboard/summary");
  });
});
