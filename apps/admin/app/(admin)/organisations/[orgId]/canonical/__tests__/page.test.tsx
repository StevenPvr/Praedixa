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
        <tr>
          <td>{data?.length ?? 0} rows</td>
        </tr>
      </tbody>
    </table>
  ),
  StatusBadge: ({ label }: { label: string }) => (
    <span data-testid={`badge-${label}`}>{label}</span>
  ),
}));

// Mock lucide-react
vi.mock(
  "lucide-react",
  () =>
    new Proxy(
      {},
      {
        get: (_target, prop) => {
          if (prop === "__esModule") return true;
          if (prop === "then") return undefined;
          return ({ className }: { className?: string }) => (
            <span data-testid={`icon-${String(prop)}`} className={className} />
          );
        },
        has: (_target, prop) => prop !== "then",
      },
    ),
);

// Mock error fallback
vi.mock("@/components/error-fallback", () => ({
  ErrorFallback: ({ message }: { message: string }) => (
    <div data-testid="error-fallback">{message}</div>
  ),
}));

const mockUseApiGet = vi.fn();
const mockUseApiGetPaginated = vi.fn();
vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
  useApiGetPaginated: (...args: unknown[]) => mockUseApiGetPaginated(...args),
}));

vi.mock("@/lib/api/endpoints", () => ({
  ADMIN_ENDPOINTS: {
    orgCanonical: (orgId: string) =>
      `/api/v1/admin/organizations/${orgId}/canonical`,
    orgCanonicalQuality: (orgId: string) =>
      `/api/v1/admin/organizations/${orgId}/canonical/quality`,
  },
}));

import OrgCanonicalPage from "../page";

describe("OrgCanonicalPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: true,
      error: null,
    });
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("renders page title", () => {
    render(<OrgCanonicalPage />);
    expect(screen.getByText("Donnees canoniques")).toBeInTheDocument();
  });

  it("renders back button", () => {
    render(<OrgCanonicalPage />);
    expect(screen.getByText(/Retour a l/)).toBeInTheDocument();
  });

  it("renders quality stats when loaded", () => {
    mockUseApiGet.mockReturnValue({
      data: {
        totalRecords: 500,
        completenessScore: 0.95,
        duplicateCount: 12,
        outlierCount: 3,
        lastUpdated: "2026-02-01",
      },
      loading: false,
      error: null,
    });
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 500,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<OrgCanonicalPage />);
    expect(screen.getByTestId("stat-Total records")).toHaveTextContent("500");
    expect(screen.getByTestId("stat-Completude")).toHaveTextContent("95.0%");
    expect(screen.getByTestId("stat-Doublons")).toHaveTextContent("12");
    expect(screen.getByTestId("stat-Outliers")).toHaveTextContent("3");
  });

  it("renders data table", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: null,
    });
    mockUseApiGetPaginated.mockReturnValue({
      data: [{ id: "1", employeeRef: "E001" }],
      total: 1,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<OrgCanonicalPage />);
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });

  it("shows error for quality dashboard", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: "Quality error",
    });
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<OrgCanonicalPage />);
    expect(screen.getByText("Quality error")).toBeInTheDocument();
  });
});
