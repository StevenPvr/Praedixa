import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PrevisionsPage from "../page";

const { mockUseApiGet, mockUseLatestForecasts } = vi.hoisted(() => ({
  mockUseApiGet: vi.fn(),
  mockUseLatestForecasts: vi.fn(),
}));

const { mockReplace, mockSearchParams } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockSearchParams: new URLSearchParams(),
}));

const { mockRefetchRuns, mockRefetchDaily } = vi.hoisted(() => ({
  mockRefetchRuns: vi.fn(),
  mockRefetchDaily: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/previsions",
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
}));

vi.mock("@/hooks/use-latest-forecasts", () => ({
  useLatestForecasts: (...args: unknown[]) => mockUseLatestForecasts(...args),
}));

vi.mock("@/lib/forecast-decomposition", () => ({
  decomposeForecast: vi.fn(() => ({
    trend: [],
    seasonality: [],
    residuals: [],
    confidence: [],
  })),
  extractFeatureImportance: vi.fn(() => []),
}));

vi.mock("@tremor/react", () => ({
  LineChart: () => <div data-testid="line-chart" />,
  AreaChart: () => <div data-testid="area-chart" />,
}));

vi.mock("@praedixa/ui", () => ({
  SkeletonChart: () => <div data-testid="skeleton-chart" />,
  SkeletonCard: () => <div data-testid="skeleton-card" />,
}));

vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <header data-testid="page-header">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </header>
  ),
}));

vi.mock("@/components/ui/detail-card", () => ({
  DetailCard: ({ children }: { children: ReactNode }) => (
    <div data-testid="detail-card">{children}</div>
  ),
}));

vi.mock("@/components/ui/metric-card", () => ({
  MetricCard: ({
    label,
    value,
    status,
  }: {
    label: string;
    value: string | number;
    status?: string;
  }) => (
    <div data-testid={`metric-${label}`} data-status={status}>
      {value}
    </div>
  ),
}));

vi.mock("@/components/animated-section", () => ({
  AnimatedSection: ({ children }: { children: ReactNode }) => (
    <section data-testid="animated-section">{children}</section>
  ),
}));

vi.mock("@/components/status-banner", () => ({
  StatusBanner: ({
    variant,
    title,
    children,
  }: {
    variant: string;
    title?: string;
    children: ReactNode;
  }) => (
    <div data-testid="status-banner" data-variant={variant}>
      {title && <h3>{title}</h3>}
      {children}
    </div>
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
      <span>{message}</span>
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
}));

vi.mock("@/components/previsions/decomposition-panel", () => ({
  DecompositionPanel: () => <div data-testid="decomposition-panel" />,
}));

vi.mock("@/components/previsions/feature-importance-bar", () => ({
  FeatureImportanceBar: () => <div data-testid="feature-importance-bar" />,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/lib/formatters", () => ({
  formatSeverity: (value: string) => value,
}));

const sampleDaily = {
  forecastDate: "2026-02-12",
  predictedDemand: 120,
  predictedCapacity: 100,
  capacityPlannedCurrent: 100,
  capacityPlannedPredicted: 112,
  capacityOptimalPredicted: 118,
  gap: -8,
  riskScore: 0.65,
  confidenceLower: 90,
  confidenceUpper: 130,
};

const sampleAlert = {
  id: "a1",
  organizationId: "org-1",
  siteId: "Lyon",
  alertDate: "2026-02-12",
  shift: "am",
  horizon: "j3",
  pRupture: 0.72,
  gapH: 6,
  severity: "critical",
  status: "open",
  driversJson: ["absence_rate"],
  createdAt: "2026-02-12T00:00:00Z",
  updatedAt: "2026-02-12T00:00:00Z",
};

function setupMocks({
  forecastLoading = false,
  forecastError = null as string | null,
  dailyData = [sampleDaily] as unknown,
  alerts = [sampleAlert] as unknown,
  alertsLoading = false,
  alertsError = null as string | null,
} = {}) {
  mockUseLatestForecasts.mockReturnValue({
    dailyData,
    loading: forecastLoading,
    error: forecastError,
    refetchRuns: mockRefetchRuns,
    refetchDaily: mockRefetchDaily,
  });

  mockUseApiGet.mockImplementation((url: string | null) => {
    if (url?.includes("/coverage-alerts")) {
      return {
        data: alerts,
        loading: alertsLoading,
        error: alertsError,
        refetch: vi.fn(),
      };
    }
    return { data: null, loading: false, error: null, refetch: vi.fn() };
  });
}

describe("PrevisionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete("dimension");
    setupMocks();
  });

  it("renders page header and sections", () => {
    render(<PrevisionsPage />);
    expect(
      screen.getByRole("heading", { name: "Anticipation des tensions" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Projetez les besoins, identifiez les causes et priorisez les alertes avant rupture.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Decomposition du signal" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("feature-importance-bar")).toBeInTheDocument();
  });

  it("shows danger status when critical alerts exist", () => {
    render(<PrevisionsPage />);
    expect(screen.getByTestId("status-banner")).toHaveAttribute(
      "data-variant",
      "danger",
    );
  });

  it("shows success status when no alerts are open", () => {
    setupMocks({ alerts: [] });
    render(<PrevisionsPage />);
    expect(screen.getByTestId("status-banner")).toHaveAttribute(
      "data-variant",
      "success",
    );
  });

  it("shows forecast loading skeleton", () => {
    setupMocks({ forecastLoading: true });
    render(<PrevisionsPage />);
    expect(screen.getByTestId("skeleton-chart")).toBeInTheDocument();
  });

  it("shows forecast error and retries both forecast endpoints", () => {
    setupMocks({ forecastError: "Runs failed" });
    render(<PrevisionsPage />);
    expect(screen.getByTestId("error-fallback")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Retry"));
    expect(mockRefetchRuns).toHaveBeenCalledTimes(1);
    expect(mockRefetchDaily).toHaveBeenCalledTimes(1);
  });

  it("shows empty forecast message when no daily data is available", () => {
    setupMocks({ dailyData: [] });
    render(<PrevisionsPage />);
    expect(screen.getByText("Aucune prevision disponible")).toBeInTheDocument();
  });

  it("updates URL when switching dimension to merchandise", () => {
    render(<PrevisionsPage />);
    fireEvent.click(screen.getByText("Marchandise"));
    expect(mockReplace).toHaveBeenCalledWith(
      "/previsions?dimension=merchandise",
      { scroll: false },
    );
  });

  it("renders alert card and actions link", () => {
    render(<PrevisionsPage />);
    expect(screen.getByText("Lyon")).toBeInTheDocument();
    const link = screen.getByText("Voir les solutions");
    expect(link.closest("a")).toHaveAttribute("href", "/actions");
  });

  it("shows alert skeleton cards while alerts are loading", () => {
    setupMocks({ alertsLoading: true });
    render(<PrevisionsPage />);
    expect(screen.getAllByTestId("skeleton-card")).toHaveLength(3);
  });
});
