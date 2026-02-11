import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "../page";

const { mockUseApiGet } = vi.hoisted(() => ({
  mockUseApiGet: vi.fn(),
}));

vi.mock("next/navigation", () =>
  globalThis.__mocks.createNextNavigationMocks({ pathname: "/dashboard" }),
);

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
}));

vi.mock("@praedixa/ui", () => globalThis.__mocks.createUiMocks());

vi.mock("@/components/ui/detail-card", () => ({
  DetailCard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="detail-card">{children}</div>
  ),
}));

vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
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

vi.mock("@/components/dashboard/forecast-timeline-chart", () => ({
  ForecastTimelineChart: () => <div data-testid="forecast-timeline-chart" />,
}));

vi.mock("@/components/dashboard/scenario-comparison-chart", () => ({
  ScenarioComparisonChart: () => (
    <div data-testid="scenario-comparison-chart" />
  ),
}));

vi.mock("@/components/dashboard/onboarding-checklist", () => ({
  OnboardingChecklist: () => <div data-testid="onboarding-checklist" />,
}));

vi.mock("lucide-react", () => globalThis.__mocks.createLucideIconMocks());

const mockAlerts = [
  {
    id: "a1",
    siteId: "Lyon",
    alertDate: "2026-02-10",
    shift: "AM",
    severity: "critical",
    gapH: 6,
    pRupture: 0.6,
    status: "open",
    driversJson: [],
  },
  {
    id: "a2",
    siteId: "Paris",
    alertDate: "2026-02-11",
    shift: "PM",
    severity: "medium",
    gapH: 3,
    pRupture: 0.2,
    status: "open",
    driversJson: [],
  },
];

const mockSummary = {
  coverageHuman: 84.7,
  coverageMerchandise: 90.2,
  activeAlertsCount: 2,
  forecastAccuracy: 91,
  lastForecastDate: "2026-02-08",
};

function setupUseApi({
  alerts = mockAlerts,
  summary = mockSummary,
  alertsLoading = false,
  summaryLoading = false,
}: {
  alerts?: unknown[] | null;
  summary?: Record<string, unknown> | null;
  alertsLoading?: boolean;
  summaryLoading?: boolean;
} = {}) {
  mockUseApiGet.mockImplementation((url: string) => {
    if (url.includes("coverage-alerts")) {
      return {
        data: alerts,
        loading: alertsLoading,
        error: null,
        refetch: vi.fn(),
      };
    }
    if (url.includes("dashboard/summary")) {
      return {
        data: summary,
        loading: summaryLoading,
        error: null,
        refetch: vi.fn(),
      };
    }
    return { data: null, loading: false, error: null, refetch: vi.fn() };
  });
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUseApi();
  });

  it("renders the dashboard title and subtitle", () => {
    render(<DashboardPage />);
    expect(
      screen.getByRole("heading", { name: "Pilotage" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Statut actuel, priorites du jour et performance recente",
      ),
    ).toBeInTheDocument();
  });

  it("renders onboarding checklist block", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("onboarding-checklist")).toBeInTheDocument();
  });

  it("renders danger banner when at least one critical alert exists", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("status-banner")).toHaveAttribute(
      "data-variant",
      "danger",
    );
  });

  it("renders success banner when alerts are empty", () => {
    setupUseApi({ alerts: [] });
    render(<DashboardPage />);
    expect(screen.getByTestId("status-banner")).toHaveAttribute(
      "data-variant",
      "success",
    );
  });

  it("renders skeleton cards when loading", () => {
    setupUseApi({ alertsLoading: true });
    render(<DashboardPage />);
    expect(
      screen.getAllByTestId("skeleton-card").length,
    ).toBeGreaterThanOrEqual(3);
  });

  it("shows KPI values from summary", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("stat-Couverture equipes")).toHaveTextContent(
      "84.7%",
    );
    expect(screen.getByTestId("stat-Alertes actives")).toHaveTextContent("2");
  });

  it("renders top-priority cards and queue CTA", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Lyon")).toBeInTheDocument();
    expect(screen.getByText("Paris")).toBeInTheDocument();
    expect(
      screen.getAllByText("Traiter dans la file de decision").length,
    ).toBeGreaterThan(0);
  });

  it("shows no-action copy when no alerts", () => {
    setupUseApi({ alerts: [] });
    render(<DashboardPage />);
    expect(
      screen.getByText("Aucune action urgente pour aujourd'hui."),
    ).toBeInTheDocument();
  });

  it("renders trend charts", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("forecast-timeline-chart")).toBeInTheDocument();
    expect(screen.getByTestId("scenario-comparison-chart")).toBeInTheDocument();
  });

  it("calls expected API endpoints", () => {
    render(<DashboardPage />);
    const calledUrls = mockUseApiGet.mock.calls.map(
      (call: unknown[]) => call[0],
    );
    expect(calledUrls).toContain(
      "/api/v1/live/coverage-alerts?status=open&page_size=50",
    );
    expect(calledUrls).toContain("/api/v1/live/dashboard/summary");
  });
});
