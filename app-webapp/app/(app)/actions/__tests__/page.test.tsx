import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ActionsPage from "../page";

const mockUseApiGet = vi.fn();
const mockUseApiGetPaginated = vi.fn();
const mockMutate = vi.fn();

vi.mock("next/navigation", () =>
  globalThis.__mocks.createNextNavigationMocks({ pathname: "/actions" }),
);

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
  useApiGetPaginated: (...args: unknown[]) => mockUseApiGetPaginated(...args),
  useApiPost: () => ({
    mutate: mockMutate,
    loading: false,
    error: null,
    data: null,
    reset: vi.fn(),
  }),
}));

vi.mock("@praedixa/ui", () => globalThis.__mocks.createUiMocks());

const alertRows = [
  {
    id: "a1",
    organizationId: "org",
    siteId: "Lyon",
    alertDate: "2026-02-10",
    shift: "AM",
    horizon: "j7",
    pRupture: 0.62,
    gapH: 6,
    severity: "critical",
    status: "open",
    driversJson: ["absence_rate"],
    createdAt: "2026-02-10T00:00:00Z",
    updatedAt: "2026-02-10T00:00:00Z",
  },
  {
    id: "a2",
    organizationId: "org",
    siteId: "Paris",
    alertDate: "2026-02-11",
    shift: "PM",
    horizon: "j3",
    pRupture: 0.21,
    gapH: 2,
    severity: "medium",
    status: "open",
    driversJson: [],
    createdAt: "2026-02-11T00:00:00Z",
    updatedAt: "2026-02-11T00:00:00Z",
  },
];

const workspace = {
  alert: alertRows[0],
  options: [
    {
      id: "o1",
      coverageAlertId: "a1",
      costParameterId: "cp1",
      optionType: "hs",
      label: "Heures sup",
      coutTotalEur: 400,
      serviceAttenduPct: 89,
      heuresCouvertes: 4,
      isParetoOptimal: true,
      isRecommended: false,
      contraintesJson: {},
    },
  ],
  recommendedOptionId: "o1",
  diagnostic: { topDrivers: ["absence_rate"] },
};

const historyRows = [
  {
    id: "d1",
    title: "Decision A",
    status: "approved",
    priority: "high",
    confidenceScore: 83,
    targetPeriod: { startDate: "2026-02-10", endDate: "2026-02-17" },
  },
];

function setupHooks(options?: {
  alerts?: typeof alertRows;
  alertsLoading?: boolean;
  alertsError?: string | null;
  workspaceData?: typeof workspace | null;
  workspaceLoading?: boolean;
  workspaceError?: string | null;
  historyLoading?: boolean;
  historyError?: string | null;
}) {
  const alertsRefetch = vi.fn();
  const historyRefetch = vi.fn();

  mockUseApiGet.mockImplementation((url: string | null) => {
    if (url?.startsWith("/api/v1/live/coverage-alerts?status=open&page_size=200")) {
      return {
        data: options?.alerts ?? alertRows,
        loading: options?.alertsLoading ?? false,
        error: options?.alertsError ?? null,
        refetch: alertsRefetch,
      };
    }

    if (url?.startsWith("/api/v1/live/decision-workspace/")) {
      return {
        data: options?.workspaceData ?? workspace,
        loading: options?.workspaceLoading ?? false,
        error: options?.workspaceError ?? null,
        refetch: vi.fn(),
      };
    }

    return { data: null, loading: false, error: null, refetch: vi.fn() };
  });

  mockUseApiGetPaginated.mockReturnValue({
    data: historyRows,
    total: historyRows.length,
    pagination: null,
    loading: options?.historyLoading ?? false,
    error: options?.historyError ?? null,
    refetch: historyRefetch,
  });

  return { alertsRefetch, historyRefetch };
}

describe("ActionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutate.mockResolvedValue({ id: "decision-1" });
    setupHooks();
  });

  it("renders the current heading and intro", () => {
    render(<ActionsPage />);

    expect(
      screen.getByRole("heading", { name: "Centre Actions" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Validez les decisions recommandees puis suivez leur historique.",
      ),
    ).toBeInTheDocument();
  });

  it("shows empty alerts message when no alert is available", () => {
    setupHooks({ alerts: [] });
    render(<ActionsPage />);

    expect(screen.getByText("Aucune alerte.")).toBeInTheDocument();
  });

  it("keeps validate button disabled until an option is selected", () => {
    render(<ActionsPage />);

    const validateButton = screen.getByRole("button", {
      name: "Valider la decision",
    });
    expect(validateButton).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /hs/i }));
    expect(validateButton).not.toBeDisabled();
  });

  it("submits selected decision and refreshes alerts/history", async () => {
    const { alertsRefetch, historyRefetch } = setupHooks();

    render(<ActionsPage />);

    fireEvent.click(screen.getByRole("button", { name: /hs/i }));
    fireEvent.click(
      screen.getByRole("button", { name: "Valider la decision" }),
    );

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          coverageAlertId: "a1",
          chosenOptionId: "o1",
          siteId: "Lyon",
          shift: "AM",
          decisionDate: "2026-02-10",
          horizon: "j7",
          gapH: 6,
        }),
      );
    });

    await waitFor(() => {
      expect(alertsRefetch).toHaveBeenCalledTimes(1);
      expect(historyRefetch).toHaveBeenCalledTimes(1);
    });
  });

  it("renders history table when switching tab", () => {
    render(<ActionsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Historique" }));
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
    expect(screen.getByTestId("cell-title")).toHaveTextContent("Decision A");
  });

  it("calls hooks with expected endpoints", () => {
    render(<ActionsPage />);

    const useApiGetUrls = mockUseApiGet.mock.calls.map(
      (call: unknown[]) => call[0] as string | null,
    );

    expect(useApiGetUrls).toContain(
      "/api/v1/live/coverage-alerts?status=open&page_size=200",
    );
    expect(useApiGetUrls).toContain("/api/v1/live/decision-workspace/a1");

    expect(mockUseApiGetPaginated).toHaveBeenCalledWith(
      "/api/v1/decisions?sort_by=created_at&sort_order=desc",
      1,
      20,
    );
  });
});
