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
  DataTable: ({
    data,
    columns: _columns,
  }: {
    data: unknown[];
    columns: unknown[];
  }) => (
    <table data-testid="data-table">
      <tbody>
        {(data as Record<string, unknown>[]).map((row, i) => (
          <tr key={i}>
            <td>{JSON.stringify(row)}</td>
          </tr>
        ))}
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

// Mock hooks
const mockUseApiGet = vi.fn();
vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
}));

vi.mock("@/lib/api/endpoints", () => ({
  ADMIN_ENDPOINTS: {
    monitoringAlertsSummary: "/api/v1/admin/monitoring/alerts/summary",
  },
}));

import AlertesPage from "../page";

describe("AlertesPage", () => {
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
    render(<AlertesPage />);
    expect(screen.getAllByTestId("skeleton-card")).toHaveLength(4);
  });

  it("shows error fallback on error", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: "Network error",
      refetch: vi.fn(),
    });
    render(<AlertesPage />);
    expect(screen.getByTestId("error-fallback")).toHaveTextContent(
      "Network error",
    );
  });

  it("renders severity stat cards with data", () => {
    mockUseApiGet.mockReturnValue({
      data: {
        total: 42,
        bySeverity: { low: 10, medium: 15, high: 12, critical: 5 },
        byStatus: { open: 20, acknowledged: 10, resolved: 8, expired: 4 },
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<AlertesPage />);
    expect(screen.getByTestId("stat-Critique")).toHaveTextContent("5");
    expect(screen.getByTestId("stat-Haute")).toHaveTextContent("12");
    expect(screen.getByTestId("stat-Moyenne")).toHaveTextContent("15");
    expect(screen.getByTestId("stat-Basse")).toHaveTextContent("10");
  });

  it("renders status breakdown", () => {
    mockUseApiGet.mockReturnValue({
      data: {
        total: 42,
        bySeverity: { low: 10, medium: 15, high: 12, critical: 5 },
        byStatus: { open: 20, acknowledged: 10, resolved: 8, expired: 4 },
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<AlertesPage />);
    expect(screen.getByText("Ouvertes")).toBeInTheDocument();
    expect(screen.getByText("Prises en charge")).toBeInTheDocument();
    expect(screen.getByText("Resolues")).toBeInTheDocument();
    expect(screen.getByText("Expirees")).toBeInTheDocument();
  });

  it("renders total count in subtitle", () => {
    mockUseApiGet.mockReturnValue({
      data: {
        total: 42,
        bySeverity: { low: 10, medium: 15, high: 12, critical: 5 },
        byStatus: { open: 20, acknowledged: 10, resolved: 8, expired: 4 },
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<AlertesPage />);
    expect(screen.getByText("42 alertes au total")).toBeInTheDocument();
  });
});
