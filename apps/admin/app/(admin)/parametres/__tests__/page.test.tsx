import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
const mockPush = vi.fn();
const mockParams = { orgId: "test-org-id-123" };
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => mockParams,
}));

// Mock @praedixa/ui
vi.mock("@praedixa/ui", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
  StatCard: ({ label, value }: { label: string; value: string }) => (
    <div data-testid={`stat-${label}`}>{value}</div>
  ),
  SkeletonCard: () => <div data-testid="skeleton-card" />,
  DataTable: ({ data, columns: _columns }: { data: unknown[]; columns: unknown[] }) => (
    <table data-testid="data-table">
      <tbody>
        {(data as Record<string, unknown>[]).map((row, i) => (
          <tr key={i}><td>{JSON.stringify(row)}</td></tr>
        ))}
      </tbody>
    </table>
  ),
  StatusBadge: ({ label }: { label: string }) => (
    <span data-testid={`badge-${label}`}>{label}</span>
  ),
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

const mockUseApiGet = vi.fn();
vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
}));

vi.mock("@/lib/api/endpoints", () => ({
  ADMIN_ENDPOINTS: {
    monitoringCostParamsMissing: "/api/v1/admin/monitoring/cost-params/missing",
  },
}));

import ParametresPage from "../page";

describe("ParametresPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows skeleton cards while loading", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
    render(<ParametresPage />);
    expect(screen.getAllByTestId("skeleton-card")).toHaveLength(3);
  });

  it("shows error fallback on error", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: "Failed to load",
      refetch: vi.fn(),
    });
    render(<ParametresPage />);
    expect(screen.getByTestId("error-fallback")).toHaveTextContent("Failed to load");
  });

  it("renders stat cards with data", () => {
    mockUseApiGet.mockReturnValue({
      data: {
        totalOrgsWithMissing: 3,
        totalMissingParams: 7,
        orgs: [],
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<ParametresPage />);
    expect(screen.getByTestId("stat-Organisations avec manques")).toHaveTextContent("3");
    expect(screen.getByTestId("stat-Parametres manquants")).toHaveTextContent("7");
    expect(screen.getByTestId("stat-Statut global")).toHaveTextContent("Incomplet");
  });

  it("shows complete status when no missing params", () => {
    mockUseApiGet.mockReturnValue({
      data: {
        totalOrgsWithMissing: 0,
        totalMissingParams: 0,
        orgs: [],
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<ParametresPage />);
    expect(screen.getByTestId("stat-Statut global")).toHaveTextContent("Complet");
    expect(screen.getByText(/Toutes les organisations/)).toBeInTheDocument();
  });

  it("shows warning banner when missing params exist", () => {
    mockUseApiGet.mockReturnValue({
      data: {
        totalOrgsWithMissing: 2,
        totalMissingParams: 5,
        orgs: [
          {
            organizationId: "abcdef12-3456-7890-abcd-ef1234567890",
            missingTypes: ["overtime_hourly", "interim_daily"],
            totalMissing: 2,
          },
        ],
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<ParametresPage />);
    expect(screen.getByText(/parametres manquants/)).toBeInTheDocument();
    expect(screen.getByText("abcdef12...")).toBeInTheDocument();
  });

  it("renders type labels correctly", () => {
    mockUseApiGet.mockReturnValue({
      data: {
        totalOrgsWithMissing: 1,
        totalMissingParams: 2,
        orgs: [
          {
            organizationId: "abcdef12-3456-7890-abcd-ef1234567890",
            missingTypes: ["overtime_hourly"],
            totalMissing: 1,
          },
        ],
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<ParametresPage />);
    expect(screen.getByText("Cout horaire HS")).toBeInTheDocument();
  });
});
