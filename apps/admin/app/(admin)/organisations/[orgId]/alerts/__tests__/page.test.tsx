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
  DataTable: ({ data }: { data: unknown[] }) => (
    <table data-testid="data-table">
      <tbody>
        <tr><td>{data?.length ?? 0} rows</td></tr>
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

const mockUseApiGetPaginated = vi.fn();
vi.mock("@/hooks/use-api", () => ({
  useApiGetPaginated: (...args: unknown[]) => mockUseApiGetPaginated(...args),
}));

vi.mock("@/lib/api/endpoints", () => ({
  ADMIN_ENDPOINTS: {
    orgAlerts: (orgId: string) => `/api/v1/admin/organizations/${orgId}/alerts`,
  },
}));

import OrgAlertsPage from "../page";

describe("OrgAlertsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page title", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<OrgAlertsPage />);
    expect(screen.getByText("Alertes de couverture")).toBeInTheDocument();
  });

  it("renders back button", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<OrgAlertsPage />);
    expect(screen.getByText(/Retour a l/)).toBeInTheDocument();
  });

  it("renders data table", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [{ id: "1", alertType: "understaffing", severity: "high" }],
      total: 1,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<OrgAlertsPage />);
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });

  it("shows error on failure", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: false,
      error: "Failed",
      refetch: vi.fn(),
    });
    render(<OrgAlertsPage />);
    expect(screen.getByTestId("error-fallback")).toHaveTextContent("Failed");
  });

  it("shows alert count", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 7,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<OrgAlertsPage />);
    expect(screen.getByText("7 alertes")).toBeInTheDocument();
  });
});
