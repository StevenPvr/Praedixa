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

const mockUseApiGet = vi.fn();
vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
}));

vi.mock("@/lib/api/endpoints", () => ({
  ADMIN_ENDPOINTS: {
    monitoringScenariosSummary: "/api/v1/admin/monitoring/scenarios/summary",
  },
}));

import ScenariosPage from "../page";

describe("ScenariosPage", () => {
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
    render(<ScenariosPage />);
    expect(screen.getAllByTestId("skeleton-card")).toHaveLength(3);
  });

  it("shows error fallback on error", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: "Server error",
      refetch: vi.fn(),
    });
    render(<ScenariosPage />);
    expect(screen.getByTestId("error-fallback")).toHaveTextContent(
      "Server error",
    );
  });

  it("renders stat cards with data", () => {
    mockUseApiGet.mockReturnValue({
      data: {
        totalScenarios: 120,
        paretoOptimalCount: 30,
        recommendedCount: 15,
        byType: [],
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<ScenariosPage />);
    expect(screen.getByTestId("stat-Total scenarios")).toHaveTextContent("120");
    expect(screen.getByTestId("stat-Pareto-optimaux")).toHaveTextContent("30");
    expect(screen.getByTestId("stat-Recommandes")).toHaveTextContent("15");
  });

  it("renders type breakdown", () => {
    mockUseApiGet.mockReturnValue({
      data: {
        totalScenarios: 120,
        paretoOptimalCount: 30,
        recommendedCount: 15,
        byType: [
          { optionType: "hs", count: 50 },
          { optionType: "interim", count: 40 },
        ],
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<ScenariosPage />);
    expect(screen.getByText("Heures supplementaires")).toBeInTheDocument();
    expect(screen.getByText("Interim")).toBeInTheDocument();
  });
});
