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
    monitoringProofPacksSummary: "/api/v1/admin/monitoring/proof-packs/summary",
  },
}));

import ProofPacksPage from "../page";

describe("ProofPacksPage", () => {
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
    render(<ProofPacksPage />);
    expect(screen.getAllByTestId("skeleton-card")).toHaveLength(3);
  });

  it("shows error fallback on error", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: "API error",
      refetch: vi.fn(),
    });
    render(<ProofPacksPage />);
    expect(screen.getByTestId("error-fallback")).toHaveTextContent("API error");
  });

  it("renders stat cards with data", () => {
    mockUseApiGet.mockReturnValue({
      data: {
        totalProofRecords: 500,
        totalGainNetEur: 125000,
        avgAdoptionPct: 78.5,
        orgsWithProof: 8,
        orgs: [],
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<ProofPacksPage />);
    expect(screen.getByTestId("stat-Total proof packs")).toHaveTextContent("500");
    expect(screen.getByTestId("stat-Organisations")).toHaveTextContent("8");
  });

  it("renders adoption rate when present", () => {
    mockUseApiGet.mockReturnValue({
      data: {
        totalProofRecords: 500,
        totalGainNetEur: 125000,
        avgAdoptionPct: 78.5,
        orgsWithProof: 8,
        orgs: [],
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<ProofPacksPage />);
    expect(screen.getByText("78.5%")).toBeInTheDocument();
  });

  it("renders per-org table when orgs data present", () => {
    mockUseApiGet.mockReturnValue({
      data: {
        totalProofRecords: 500,
        totalGainNetEur: 125000,
        avgAdoptionPct: 78.5,
        orgsWithProof: 1,
        orgs: [
          {
            organizationId: "abcdef12-3456-7890-abcd-ef1234567890",
            totalRecords: 100,
            totalGainNetEur: 50000,
            avgAdoptionPct: 80.0,
          },
        ],
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<ProofPacksPage />);
    expect(screen.getByText("Par organisation")).toBeInTheDocument();
    expect(screen.getByText("abcdef12...")).toBeInTheDocument();
  });
});
