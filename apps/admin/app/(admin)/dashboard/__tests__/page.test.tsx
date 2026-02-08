import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({}),
}));

// Mock @praedixa/ui
vi.mock("@praedixa/ui", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
  StatCard: ({ label, value }: { label: string; value: string }) => (
    <div data-testid={`stat-${label}`}>{value}</div>
  ),
  SkeletonCard: () => <div data-testid="skeleton-card" />,
}));

// Mock lucide-react
vi.mock("lucide-react", () =>
  new Proxy({}, {
    get: (_target, prop) => {
      if (prop === "__esModule") return true;
      if (prop === "then") return undefined;
      return ({ className }: { className?: string }) => (
        <span data-testid={`icon-${String(prop)}`} className={className} />
      );
    },
    has: (_target, prop) => prop !== "then",
  })
);

// Mock error fallback
vi.mock("@/components/error-fallback", () => ({
  ErrorFallback: ({ message }: { message: string }) => (
    <div data-testid="error-fallback">{message}</div>
  ),
}));

// Mock skeleton
vi.mock("@/components/skeletons/skeleton-admin-dashboard", () => ({
  SkeletonAdminDashboard: () => <div data-testid="skeleton-dashboard" />,
}));

// Mock hooks
const mockUseApiGet = vi.fn();
vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
}));

vi.mock("@/lib/api/endpoints", () => ({
  ADMIN_ENDPOINTS: {
    platformKPIs: "/api/v1/admin/monitoring/platform",
    errors: "/api/v1/admin/monitoring/errors",
    monitoringCanonicalCoverage: "/api/v1/admin/monitoring/canonical-coverage",
    monitoringAlertsSummary: "/api/v1/admin/monitoring/alerts/summary",
    monitoringProofPacksSummary: "/api/v1/admin/monitoring/proof-packs/summary",
    monitoringDecisionsAdoption: "/api/v1/admin/monitoring/decisions/adoption",
  },
}));

import AdminDashboardPage from "../page";

describe("AdminDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockAllLoading() {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
  }

  function mockAllLoaded() {
    mockUseApiGet.mockImplementation((url: string) => {
      if (url.includes("platform")) {
        return {
          data: {
            totalOrganizations: 10,
            totalUsers: 50,
            totalDatasets: 100,
            totalForecasts: 200,
            activeOrganizations: 8,
            totalDecisions: 150,
          },
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      if (url.includes("errors")) {
        return {
          data: {
            ingestionSuccessRate: 0.98,
            ingestionErrorCount: 5,
            apiErrorRate: 0.01,
          },
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      if (url.includes("canonical-coverage")) {
        return {
          data: {
            totalOrgs: 8,
            avgCompleteness: 0.92,
            orgs: [],
          },
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      if (url.includes("alerts/summary")) {
        return {
          data: {
            total: 20,
            bySeverity: { low: 5, medium: 8, high: 4, critical: 3 },
            byStatus: { open: 10, acknowledged: 5, resolved: 3, expired: 2 },
          },
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      if (url.includes("proof-packs")) {
        return {
          data: {
            totalProofRecords: 300,
            totalGainNetEur: 75000,
            avgAdoptionPct: 82.0,
            orgsWithProof: 6,
            orgs: [],
          },
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      if (url.includes("adoption")) {
        return {
          data: {
            overallAdoptionPct: 78.5,
            totalDecisions: 150,
            adoptedCount: 117,
            overriddenCount: 15,
            orgs: [],
          },
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      return {
        data: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
      };
    });
  }

  it("shows skeleton dashboard when all loading", () => {
    mockAllLoading();
    render(<AdminDashboardPage />);
    expect(screen.getByTestId("skeleton-dashboard")).toBeInTheDocument();
  });

  it("renders KPI stat cards", () => {
    mockAllLoaded();
    render(<AdminDashboardPage />);
    expect(screen.getByTestId("stat-Organisations")).toHaveTextContent("10");
    expect(screen.getByTestId("stat-Utilisateurs")).toHaveTextContent("50");
    expect(screen.getByTestId("stat-Datasets")).toHaveTextContent("100");
    expect(screen.getByTestId("stat-Previsions")).toHaveTextContent("200");
  });

  it("renders error metrics", () => {
    mockAllLoaded();
    render(<AdminDashboardPage />);
    expect(screen.getByText("Taux de succes ingestion")).toBeInTheDocument();
    expect(screen.getByText(/98\.0%/)).toBeInTheDocument();
  });

  it("renders canonical coverage section", () => {
    mockAllLoaded();
    render(<AdminDashboardPage />);
    expect(screen.getByText("Couverture canonique")).toBeInTheDocument();
    expect(screen.getByText("92.0%")).toBeInTheDocument();
  });

  it("renders active alerts section", () => {
    mockAllLoaded();
    render(<AdminDashboardPage />);
    expect(screen.getByText("Alertes actives")).toBeInTheDocument();
    // open (10) + acknowledged (5) = 15
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("renders proof packs section", () => {
    mockAllLoaded();
    render(<AdminDashboardPage />);
    expect(screen.getByText("Proof Packs")).toBeInTheDocument();
    expect(screen.getByText("300 proof records")).toBeInTheDocument();
  });

  it("renders adoption metrics section", () => {
    mockAllLoaded();
    render(<AdminDashboardPage />);
    expect(screen.getByText("Adoption des decisions")).toBeInTheDocument();
    expect(screen.getByText("78.5%")).toBeInTheDocument();
    expect(screen.getByText("117 adoptees")).toBeInTheDocument();
  });

  it("renders platform summary", () => {
    mockAllLoaded();
    render(<AdminDashboardPage />);
    expect(screen.getByText("Resume plateforme")).toBeInTheDocument();
    expect(screen.getByText("Organisations actives")).toBeInTheDocument();
    expect(screen.getByText("Decisions prises")).toBeInTheDocument();
  });
});
