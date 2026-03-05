/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUseApiGet = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
}));

vi.mock("../../client-context", () => ({
  useClientContext: () => ({
    orgId: "org-1",
    orgName: "Test Org",
    selectedSiteId: null,
    setSelectedSiteId: vi.fn(),
    hierarchy: [],
  }),
}));

vi.mock("@praedixa/ui", async () => {
  const actual = await vi.importActual<object>("@praedixa/ui");
  return {
    ...actual,
    SkeletonCard: () => (
      <div data-testid="skeleton-card" role="status" aria-label="Chargement" />
    ),
    DataTable: ({ data, columns }: any) => (
      <div data-testid="data-table">
        {data?.[0] &&
          columns?.map((col: any) => (
            <div key={col.key}>
              {col.render ? col.render(data[0]) : String(data[0][col.key] ?? "")}
            </div>
          ))}
      </div>
    ),
  };
});

import PrevisionsPage from "../page";

const summary = {
  modelVersion: "v1.3",
  mape: 4.2,
  mae: 3.4,
  driftScore: 0.17,
  status: "watch",
  lastTrainingAt: "2026-01-20T10:00:00Z",
};

const drift = [
  {
    id: "d-1",
    feature: "absence_rate",
    driftScore: 0.14,
    pValue: 0.0021,
    detectedAt: "2026-01-20T10:00:00Z",
  },
];

const scenarios = [
  {
    id: "s-1",
    name: "Scenario A",
    type: "baseline",
    status: "completed",
    createdAt: "2026-01-20T10:00:00Z",
  },
];

function setupMocks(options?: {
  summaryLoading?: boolean;
  summaryError?: string | null;
  driftLoading?: boolean;
  driftError?: string | null;
  scenariosLoading?: boolean;
  scenariosError?: string | null;
}) {
  mockUseApiGet.mockImplementation((url: string | null) => {
    if (url?.includes("/ml-monitoring/summary")) {
      return {
        data: options?.summaryError ? null : summary,
        loading: options?.summaryLoading ?? false,
        error: options?.summaryError ?? null,
        refetch: vi.fn(),
      };
    }

    if (url?.includes("/ml-monitoring/drift")) {
      return {
        data: options?.driftError ? null : drift,
        loading: options?.driftLoading ?? false,
        error: options?.driftError ?? null,
        refetch: vi.fn(),
      };
    }

    if (url?.includes("/scenarios")) {
      return {
        data: options?.scenariosError ? null : scenarios,
        loading: options?.scenariosLoading ?? false,
        error: options?.scenariosError ?? null,
        refetch: vi.fn(),
      };
    }

    return { data: null, loading: false, error: null, refetch: vi.fn() };
  });
}

describe("PrevisionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it("renders heading, summary, drift and scenario rows", () => {
    render(<PrevisionsPage />);

    expect(screen.getByText("Previsions")).toBeInTheDocument();
    expect(screen.getByText("v1.3")).toBeInTheDocument();
    expect(screen.getByText("4.2%")).toBeInTheDocument();
    expect(screen.getByText("absence_rate")).toBeInTheDocument();
    expect(screen.getByText("Scenario A")).toBeInTheDocument();
    expect(screen.getByText("baseline")).toBeInTheDocument();
  });

  it("shows loading skeletons", () => {
    setupMocks({ summaryLoading: true, driftLoading: true, scenariosLoading: true });
    render(<PrevisionsPage />);

    expect(screen.getAllByTestId("skeleton-card").length).toBeGreaterThan(0);
  });

  it("shows global fallback when all sections are in error", () => {
    setupMocks({
      summaryError: "summary failed",
      driftError: "drift failed",
      scenariosError: "scenarios failed",
    });

    render(<PrevisionsPage />);

    expect(
      screen.getByText("Impossible de charger la supervision previsionnelle"),
    ).toBeInTheDocument();
  });
});
