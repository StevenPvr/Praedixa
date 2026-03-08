import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PrevisionsPage from "../page";

const mockUseApiGet = vi.fn();
const mockUseLatestForecasts = vi.fn();
const mockUseDecisionConfig = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
}));

vi.mock("@/hooks/use-latest-forecasts", () => ({
  useLatestForecasts: (...args: unknown[]) => mockUseLatestForecasts(...args),
}));

vi.mock("@/hooks/use-decision-config", () => ({
  useDecisionConfig: (...args: unknown[]) => mockUseDecisionConfig(...args),
}));

const sampleDaily = {
  forecastDate: "2026-02-12",
  dimension: "human",
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
  horizon: "j7",
  pRupture: 0.72,
  gapH: 6,
  severity: "critical",
  status: "open",
  driversJson: ["absence_rate"],
  createdAt: "2026-02-12T00:00:00Z",
  updatedAt: "2026-02-12T00:00:00Z",
};

const sampleDecisionConfig = {
  organizationId: "org-1",
  siteId: null,
  versionId: "ver-1",
  effectiveAt: "2026-02-12T00:00:00Z",
  resolvedAt: "2026-02-12T00:00:01Z",
  nextVersion: null,
  selectedHorizon: { id: "j7", label: "J+7", days: 7 },
  payload: {
    horizons: [
      { id: "j3", label: "J+3", days: 3, rank: 1, active: true, isDefault: false },
      { id: "j7", label: "J+7", days: 7, rank: 2, active: true, isDefault: true },
    ],
    optionCatalog: [],
    policiesByHorizon: [],
  },
};

function setupMocks(options?: {
  dailyData?: unknown[] | null;
  forecastLoading?: boolean;
  forecastError?: string | null;
  alerts?: unknown[] | null;
  alertsLoading?: boolean;
  alertsError?: string | null;
  config?: unknown | null;
  configLoading?: boolean;
  configError?: string | null;
}) {
  const refetchDaily = vi.fn();
  const refetchAlerts = vi.fn();
  const refetchConfig = vi.fn();

  mockUseDecisionConfig.mockReturnValue({
    config: options?.config ?? sampleDecisionConfig,
    loading: options?.configLoading ?? false,
    error: options?.configError ?? null,
    refetch: refetchConfig,
  });

  mockUseLatestForecasts.mockReturnValue({
    dailyData: options?.dailyData ?? [sampleDaily],
    loading: options?.forecastLoading ?? false,
    error: options?.forecastError ?? null,
    refetchRuns: vi.fn(),
    refetchDaily,
  });

  mockUseApiGet.mockReturnValue({
    data: options?.alerts ?? [sampleAlert],
    loading: options?.alertsLoading ?? false,
    error: options?.alertsError ?? null,
    refetch: refetchAlerts,
  });

  return { refetchDaily, refetchAlerts, refetchConfig };
}

describe("PrevisionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it("renders heading, KPI cards and actions link", () => {
    render(<PrevisionsPage />);

    expect(
      screen.getByRole("heading", { name: "Previsions 7 jours" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Projection de risque et capacite previsionnelle pour orienter les actions.",
      ),
    ).toBeInTheDocument();

    expect(screen.getByText("Alertes ouvertes")).toBeInTheDocument();
    expect(screen.getByText("Alertes critiques")).toBeInTheDocument();

    const actionsLink = screen.getByRole("link", { name: "Aller dans Actions" });
    expect(actionsLink).toHaveAttribute("href", "/actions");
  });

  it("renders forecast row and top alert", () => {
    render(<PrevisionsPage />);

    expect(screen.getByText("2026-02-12")).toBeInTheDocument();
    expect(screen.getByText("120.0")).toBeInTheDocument();
    expect(screen.getByText(/Lyon/)).toBeInTheDocument();
    expect(screen.getByText(/Risque: 72%/)).toBeInTheDocument();
  });

  it("shows empty forecast state", () => {
    setupMocks({ dailyData: [] });
    render(<PrevisionsPage />);

    expect(screen.getByText("Aucune prevision disponible.")).toBeInTheDocument();
  });

  it("shows empty alerts state", () => {
    setupMocks({ alerts: [] });
    render(<PrevisionsPage />);

    expect(screen.getByText("Aucune alerte active.")).toBeInTheDocument();
  });

  it("retries config, forecast and alerts when retry is clicked", () => {
    const { refetchDaily, refetchAlerts, refetchConfig } = setupMocks({
      forecastError: "Runs failed",
    });

    render(<PrevisionsPage />);

    expect(screen.getByText("Runs failed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reessayer" }));

    expect(refetchConfig).toHaveBeenCalledTimes(1);
    expect(refetchDaily).toHaveBeenCalledTimes(1);
    expect(refetchAlerts).toHaveBeenCalledTimes(1);
  });

  it("shows alerts loading placeholders", () => {
    setupMocks({ alertsLoading: true });
    render(<PrevisionsPage />);

    expect(screen.getAllByText("...")).toHaveLength(2);
    expect(screen.getByText("Chargement...")).toBeInTheDocument();
  });

  it("calls hooks with expected arguments", () => {
    render(<PrevisionsPage />);

    const latestCall = mockUseLatestForecasts.mock.calls.at(-1);
    expect(latestCall?.[0]).toBe("human");
    expect(latestCall?.[1]).toBe(null);
    expect(mockUseDecisionConfig).toHaveBeenCalledWith(null);
    expect(mockUseApiGet).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/live/coverage-alerts?status=open&page_size=200"),
    );
  });
});
