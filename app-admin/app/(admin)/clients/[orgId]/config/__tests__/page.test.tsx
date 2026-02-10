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

const mockContext = {
  orgId: "org-1",
  orgName: "Test Org",
  selectedSiteId: null as string | null,
  setSelectedSiteId: vi.fn(),
  hierarchy: [],
};

vi.mock("../../client-context", () => ({
  useClientContext: () => mockContext,
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

import ConfigPage from "../page";

const mockCostParams = [
  {
    id: "cp-1",
    category: "Cout interne",
    value: 250,
    effectiveFrom: "2026-01-01T00:00:00Z",
    effectiveUntil: "2026-12-31T00:00:00Z",
    siteName: "Lyon",
  },
];

const mockProofPacks = [
  {
    id: "pp-1",
    name: "Pack Q1 2026",
    status: "generated",
    generatedAt: "2026-03-01T10:00:00Z",
    downloadUrl: "/api/proof-packs/pp-1/download",
  },
];

describe("ConfigPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContext.selectedSiteId = null;
    let callIndex = 0;

    mockUseApiGet.mockImplementation(() => {
      const idx = callIndex++;
      if (idx === 0) {
        return {
          data: mockCostParams,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      return {
        data: mockProofPacks,
        loading: false,
        error: null,
        refetch: vi.fn(),
      };
    });
  });

  it("renders heading and cost parameters table", () => {
    render(<ConfigPage />);
    expect(screen.getByText("Configuration")).toBeInTheDocument();
    expect(screen.getByText("Cout interne")).toBeInTheDocument();
    expect(screen.getByText("250")).toBeInTheDocument();
    expect(screen.getByText("Lyon")).toBeInTheDocument();
  });

  it("renders proof packs table", () => {
    render(<ConfigPage />);
    expect(screen.getByText("Pack Q1 2026")).toBeInTheDocument();
    expect(screen.getByText("generated")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
  });

  it("shows loading skeletons", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
    render(<ConfigPage />);
    expect(screen.getAllByTestId("skeleton-card").length).toBeGreaterThan(0);
  });

  it("shows cost params error fallback", () => {
    let callIndex = 0;
    mockUseApiGet.mockImplementation(() => {
      const idx = callIndex++;
      if (idx === 0) {
        return {
          data: null,
          loading: false,
          error: "Cost params error",
          refetch: vi.fn(),
        };
      }
      return {
        data: mockProofPacks,
        loading: false,
        error: null,
        refetch: vi.fn(),
      };
    });
    render(<ConfigPage />);
    expect(screen.getByText("Cost params error")).toBeInTheDocument();
  });

  it("shows proof packs error fallback", () => {
    let callIndex = 0;
    mockUseApiGet.mockImplementation(() => {
      const idx = callIndex++;
      if (idx === 0) {
        return {
          data: mockCostParams,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      return {
        data: null,
        loading: false,
        error: "Proof error",
        refetch: vi.fn(),
      };
    });
    render(<ConfigPage />);
    expect(screen.getByText("Proof error")).toBeInTheDocument();
  });

  it("passes site_id filter when selectedSiteId is set", () => {
    mockContext.selectedSiteId = "site-77";
    render(<ConfigPage />);
    const calledUrl = mockUseApiGet.mock.calls[0]?.[0];
    expect(String(calledUrl)).toContain("site_id=site-77");
  });

  it("renders proof pack with no download url", () => {
    let callIndex = 0;
    mockUseApiGet.mockImplementation(() => {
      const idx = callIndex++;
      if (idx === 0) {
        return {
          data: mockCostParams,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      return {
        data: [{ ...mockProofPacks[0], downloadUrl: null }],
        loading: false,
        error: null,
        refetch: vi.fn(),
      };
    });
    render(<ConfigPage />);
    expect(screen.queryByText("PDF")).not.toBeInTheDocument();
  });

  it("renders cost param with no effectiveUntil", () => {
    let callIndex = 0;
    mockUseApiGet.mockImplementation(() => {
      const idx = callIndex++;
      if (idx === 0) {
        return {
          data: [{ ...mockCostParams[0], effectiveUntil: null }],
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      return {
        data: mockProofPacks,
        loading: false,
        error: null,
        refetch: vi.fn(),
      };
    });
    render(<ConfigPage />);
    const dashes = screen.getAllByText("-");
    expect(dashes.length).toBeGreaterThan(0);
  });
});
