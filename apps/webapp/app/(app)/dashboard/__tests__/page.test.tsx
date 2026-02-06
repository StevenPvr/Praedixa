import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "../page";

// ── Hoisted dynamic mock ────────────────────────────────────────────────────
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

// Mock child components to isolate page logic
vi.mock("@/components/dashboard/kpi-section", () => ({
  KpiSection: ({ data, loading }: { data: unknown; loading: boolean }) => (
    <section aria-label="Indicateurs cles">
      {loading ? "loading" : data ? "kpi-data" : "no-data"}
    </section>
  ),
}));

vi.mock("@/components/dashboard/alerts-list", () => ({
  AlertsList: ({
    alerts,
    loading,
    onDismissed,
  }: {
    alerts: unknown;
    loading: boolean;
    onDismissed: () => void;
  }) => (
    <section aria-label="Alertes recentes">
      {loading ? "loading" : alerts ? "alerts-data" : "no-alerts"}
      <button onClick={onDismissed}>trigger-dismiss</button>
    </section>
  ),
}));

vi.mock("@/components/dashboard/forecast-chart", () => ({
  ForecastChart: () => (
    <section aria-label="Prevision de couverture">chart</section>
  ),
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
      {onRetry && <button onClick={onRetry}>Reessayer</button>}
    </div>
  ),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

const mockRefetchSummary = vi.fn();
const mockRefetchAlerts = vi.fn();

function setupSuccessMock() {
  mockUseApiGet.mockImplementation((url: string | null) => {
    if (url === "/api/v1/dashboard/summary") {
      return {
        data: {
          coverageHuman: 87,
          coverageMerchandise: 92,
          activeAlertsCount: 3,
          forecastAccuracy: 94,
          lastForecastDate: "2026-02-06",
        },
        loading: false,
        error: null,
        refetch: mockRefetchSummary,
      };
    }
    if (url === "/api/v1/alerts") {
      return {
        data: [{ id: "a1", title: "Alert" }],
        loading: false,
        error: null,
        refetch: mockRefetchAlerts,
      };
    }
    return { data: null, loading: false, error: null, refetch: vi.fn() };
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSuccessMock();
  });

  it("renders the Dashboard heading", () => {
    render(<DashboardPage />);
    expect(
      screen.getByRole("heading", { name: "Dashboard" }),
    ).toBeInTheDocument();
  });

  it("renders the page description", () => {
    render(<DashboardPage />);
    expect(
      screen.getByText(/Vue d.*ensemble de la capacite operationnelle/),
    ).toBeInTheDocument();
  });

  it("renders the KPI section with data", () => {
    render(<DashboardPage />);
    expect(screen.getByLabelText("Indicateurs cles")).toBeInTheDocument();
    expect(screen.getByText("kpi-data")).toBeInTheDocument();
  });

  it("renders the alerts section with alert data", () => {
    render(<DashboardPage />);
    expect(screen.getByLabelText("Alertes recentes")).toBeInTheDocument();
    expect(screen.getByText("alerts-data")).toBeInTheDocument();
  });

  it("renders the forecast chart section", () => {
    render(<DashboardPage />);
    expect(
      screen.getByLabelText("Prevision de couverture"),
    ).toBeInTheDocument();
  });

  // ── Error branches ───────────────────────────────────────────────────────

  it("shows ErrorFallback when summary has an error", () => {
    mockUseApiGet.mockImplementation((url: string | null) => {
      if (url === "/api/v1/dashboard/summary") {
        return {
          data: null,
          loading: false,
          error: "Erreur serveur",
          refetch: mockRefetchSummary,
        };
      }
      if (url === "/api/v1/alerts") {
        return {
          data: [],
          loading: false,
          error: null,
          refetch: mockRefetchAlerts,
        };
      }
      return { data: null, loading: false, error: null, refetch: vi.fn() };
    });

    render(<DashboardPage />);
    expect(screen.getByText("Erreur serveur")).toBeInTheDocument();
  });

  it("shows ErrorFallback when alerts has an error", () => {
    mockUseApiGet.mockImplementation((url: string | null) => {
      if (url === "/api/v1/dashboard/summary") {
        return {
          data: {
            coverageHuman: 87,
            coverageMerchandise: 92,
            activeAlertsCount: 0,
            forecastAccuracy: 94,
            lastForecastDate: "2026-02-06",
          },
          loading: false,
          error: null,
          refetch: mockRefetchSummary,
        };
      }
      if (url === "/api/v1/alerts") {
        return {
          data: null,
          loading: false,
          error: "Erreur alertes",
          refetch: mockRefetchAlerts,
        };
      }
      return { data: null, loading: false, error: null, refetch: vi.fn() };
    });

    render(<DashboardPage />);
    expect(screen.getByText("Erreur alertes")).toBeInTheDocument();
  });

  it("handleAlertDismissed calls both refetchAlerts and refetchSummary", () => {
    render(<DashboardPage />);
    // Our mock AlertsList exposes a button that calls onDismissed directly
    screen.getByText("trigger-dismiss").click();
    expect(mockRefetchAlerts).toHaveBeenCalledTimes(1);
    expect(mockRefetchSummary).toHaveBeenCalledTimes(1);
  });
});
