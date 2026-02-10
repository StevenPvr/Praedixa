/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUseApiGet = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
}));

vi.mock("@/lib/auth/client", () => ({
  getValidAccessToken: vi.fn(() => Promise.resolve("token")),
  clearAuthSession: vi.fn(),
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

const mockScenarios = [
  {
    id: "s-1",
    name: "Scenario A",
    type: "baseline",
    status: "completed",
    parameters: { horizon: 30 },
    createdAt: "2026-01-20T10:00:00Z",
  },
];

describe("PrevisionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseApiGet.mockReturnValue({
      data: mockScenarios,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("renders heading and scenario table", () => {
    render(<PrevisionsPage />);
    expect(screen.getByText("Previsions")).toBeInTheDocument();
    expect(screen.getByText("Scenario A")).toBeInTheDocument();
    expect(screen.getByText("baseline")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();
  });

  it("shows parameter count", () => {
    render(<PrevisionsPage />);
    expect(screen.getByText("1 param.")).toBeInTheDocument();
  });

  it("shows loading skeleton", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
    render(<PrevisionsPage />);
    expect(screen.getByTestId("skeleton-card")).toBeInTheDocument();
  });

  it("shows error fallback on error", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: "Scenario error",
      refetch: vi.fn(),
    });
    render(<PrevisionsPage />);
    expect(screen.getByText("Scenario error")).toBeInTheDocument();
  });

  it("renders scenario with no parameters", () => {
    mockUseApiGet.mockReturnValue({
      data: [
        {
          ...mockScenarios[0],
          parameters: undefined,
        },
      ],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<PrevisionsPage />);
    expect(screen.getByText("0 param.")).toBeInTheDocument();
  });

  it("renders failed status with correct color", () => {
    mockUseApiGet.mockReturnValue({
      data: [{ ...mockScenarios[0], status: "failed" }],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<PrevisionsPage />);
    expect(screen.getByText("failed")).toBeInTheDocument();
  });
});
