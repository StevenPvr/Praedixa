import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PrevisionsPage from "../page";

// ── Hoisted dynamic mock ────────────────────────────────────────────────────
const { mockUseApiGet } = vi.hoisted(() => ({
  mockUseApiGet: vi.fn(),
}));

const mockRefetchRuns = vi.fn();
const mockRefetchDaily = vi.fn();
const RUN_ID = "40000000-0000-0000-0000-000000000001";

vi.mock("next/navigation", () => ({
  usePathname: () => "/previsions",
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
vi.mock("@/components/previsions/filter-bar", () => ({
  FilterBar: ({
    dimension,
    onDimensionChange,
  }: {
    dimension: string;
    onDimensionChange: (d: string) => void;
  }) => (
    <div data-testid="filter-bar">
      <button onClick={() => onDimensionChange("human")}>Humaine</button>
      <button onClick={() => onDimensionChange("merchandise")}>
        Marchandise
      </button>
      <span>{dimension}</span>
    </div>
  ),
}));

vi.mock("@/components/previsions/risk-cards", () => ({
  RiskCards: () => <div data-testid="risk-cards">risk-cards</div>,
}));

vi.mock("@/components/previsions/risk-distribution-chart", () => ({
  RiskDistributionChart: () => (
    <div data-testid="risk-distribution-chart">chart</div>
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

function setupLoadingMock() {
  mockUseApiGet.mockImplementation(() => ({
    data: null,
    loading: true,
    error: null,
    refetch: vi.fn(),
  }));
}

function setupSuccessMock() {
  mockUseApiGet.mockImplementation((url: string | null) => {
    if (url !== null && url.includes("/api/v1/forecasts?page=")) {
      return {
        data: [{ id: RUN_ID, status: "completed" }],
        loading: false,
        error: null,
        refetch: mockRefetchRuns,
      };
    }
    if (url !== null && url.includes("/daily")) {
      return {
        data: [
          {
            forecastDate: "2026-02-01",
            dimension: "human",
            predictedDemand: 100,
            predictedCapacity: 90,
            gap: -10,
            riskScore: 0.5,
            confidenceLower: 80,
            confidenceUpper: 100,
            departmentId: null,
          },
        ],
        loading: false,
        error: null,
        refetch: mockRefetchDaily,
      };
    }
    return { data: null, loading: false, error: null, refetch: vi.fn() };
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("PrevisionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupLoadingMock();
  });

  it("renders the Previsions heading", () => {
    render(<PrevisionsPage />);
    expect(
      screen.getByRole("heading", { name: "Previsions" }),
    ).toBeInTheDocument();
  });

  it("renders the page description", () => {
    render(<PrevisionsPage />);
    expect(
      screen.getByText("Previsions de capacite humaine et marchandise"),
    ).toBeInTheDocument();
  });

  it("renders the dimension filter bar", () => {
    render(<PrevisionsPage />);
    expect(screen.getByText("Humaine")).toBeInTheDocument();
    expect(screen.getByText("Marchandise")).toBeInTheDocument();
  });

  it("renders the risk section heading", () => {
    render(<PrevisionsPage />);
    expect(
      screen.getByRole("heading", { name: "Risques par departement" }),
    ).toBeInTheDocument();
  });

  // ── Error branch ──────────────────────────────────────────────────────────

  it("shows ErrorFallback when runs fetch has an error", () => {
    mockUseApiGet.mockImplementation((url: string | null) => {
      if (url !== null && url.includes("/api/v1/forecasts?page=")) {
        return {
          data: null,
          loading: false,
          error: "Erreur previsions",
          refetch: mockRefetchRuns,
        };
      }
      return {
        data: null,
        loading: false,
        error: null,
        refetch: mockRefetchDaily,
      };
    });

    render(<PrevisionsPage />);
    expect(screen.getByText("Erreur previsions")).toBeInTheDocument();
  });

  it("retry on error calls both refetchRuns and refetchDaily", () => {
    mockUseApiGet.mockImplementation((url: string | null) => {
      if (url !== null && url.includes("/api/v1/forecasts?page=")) {
        return {
          data: null,
          loading: false,
          error: "fail",
          refetch: mockRefetchRuns,
        };
      }
      return {
        data: null,
        loading: false,
        error: null,
        refetch: mockRefetchDaily,
      };
    });

    render(<PrevisionsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Reessayer" }));
    expect(mockRefetchRuns).toHaveBeenCalledTimes(1);
    expect(mockRefetchDaily).toHaveBeenCalledTimes(1);
  });

  // ── Data URL construction ─────────────────────────────────────────────────

  it("passes correct forecasts URL with latestRunId", () => {
    setupSuccessMock();
    render(<PrevisionsPage />);
    const calls = mockUseApiGet.mock.calls.map((c: unknown[]) => c[0]);
    const dailyCalls = calls.filter(
      (u: string | null) => typeof u === "string" && u.includes("/daily"),
    );
    expect(dailyCalls.length).toBeGreaterThan(0);
    expect(dailyCalls[0]).toContain(`/api/v1/forecasts/${RUN_ID}/daily`);
  });

  it("passes null URL when no runs are available", () => {
    mockUseApiGet.mockImplementation((url: string | null) => {
      if (url !== null && url.includes("/api/v1/forecasts?page=")) {
        return {
          data: [],
          loading: false,
          error: null,
          refetch: mockRefetchRuns,
        };
      }
      return { data: null, loading: false, error: null, refetch: vi.fn() };
    });

    render(<PrevisionsPage />);
    const calls = mockUseApiGet.mock.calls.map((c: unknown[]) => c[0]);
    expect(calls).toContain(null);
  });
});
