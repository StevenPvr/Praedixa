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
              {col.render
                ? col.render(data[0])
                : String(data[0][col.key] ?? "")}
            </div>
          ))}
      </div>
    ),
  };
});

import PrevisionsPage from "../page";

function setupMocks(options?: {
  summaryLoading?: boolean;
  summaryError?: string | null;
  driftLoading?: boolean;
  driftError?: string | null;
  scenariosLoading?: boolean;
  scenariosError?: string | null;
}) {
  mockUseApiGet.mockImplementation((url: string | null) => {
    return {
      data: null,
      loading:
        options?.summaryLoading ??
        options?.driftLoading ??
        options?.scenariosLoading ??
        false,
      error:
        options?.summaryError ??
        options?.driftError ??
        options?.scenariosError ??
        null,
      refetch: vi.fn(),
      url,
    };
  });
}

describe("PrevisionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it("renders the fail-close fallback while forecasting workspace is disabled", () => {
    render(<PrevisionsPage />);

    expect(screen.getByText("Previsions")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Le workspace previsions et ML monitoring n'est pas encore industrialise/i,
      ),
    ).toBeInTheDocument();
  });

  it("does not call forecasting endpoints while disabled", () => {
    render(<PrevisionsPage />);

    expect(mockUseApiGet).toHaveBeenNthCalledWith(1, null);
    expect(mockUseApiGet).toHaveBeenNthCalledWith(2, null);
    expect(mockUseApiGet).toHaveBeenNthCalledWith(3, null);
  });
});
