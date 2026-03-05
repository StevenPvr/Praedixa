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
    StatCard: ({ label, value }: { label: string; value: string }) => (
      <div data-testid="stat-card">
        {label}: {value}
      </div>
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

import DonneesPage from "../page";

const mockCanonical = [
  {
    id: "c-1",
    employeeId: "EMP-001",
    date: "2026-01-15",
    absenceType: "maladie",
    hours: 7,
    siteName: "Lyon",
    departmentName: "Logistique",
  },
];

const mockQuality = {
  totalRecords: 1000,
  validRecords: 950,
  duplicateRecords: 10,
  qualityScore: 0.95,
};

const mockIngestion = [
  {
    id: "i-1",
    fileName: "absences.csv",
    status: "completed",
    rowsProcessed: 500,
    rowsRejected: 2,
    createdAt: "2026-01-10T10:00:00Z",
  },
];

describe("DonneesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContext.selectedSiteId = null;
    let callIndex = 0;

    mockUseApiGet.mockImplementation(() => {
      const idx = callIndex++;
      if (idx === 0) {
        return {
          data: mockCanonical,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      if (idx === 1) {
        return {
          data: mockQuality,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      return {
        data: mockIngestion,
        loading: false,
        error: null,
        refetch: vi.fn(),
      };
    });
  });

  it("renders heading and quality stat cards", () => {
    render(<DonneesPage />);
    expect(screen.getByText("Donnees")).toBeInTheDocument();
    expect(screen.getByText("Total enregistrements: 1000")).toBeInTheDocument();
    expect(
      screen.getByText("Enregistrements valides: 950"),
    ).toBeInTheDocument();
    expect(screen.getByText("Doublons: 10")).toBeInTheDocument();
    expect(screen.getByText("Score qualite: 95%")).toBeInTheDocument();
  });

  it("renders canonical data table with employee", () => {
    render(<DonneesPage />);
    expect(screen.getByText("EMP-001")).toBeInTheDocument();
    expect(screen.getByText("maladie")).toBeInTheDocument();
    expect(screen.getByText("Lyon")).toBeInTheDocument();
  });

  it("renders ingestion log table", () => {
    render(<DonneesPage />);
    expect(screen.getByText("absences.csv")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();
  });

  it("shows loading skeletons", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
    render(<DonneesPage />);
    expect(screen.getAllByTestId("skeleton-card").length).toBeGreaterThan(0);
  });

  it("shows canonical error fallback", () => {
    let callIndex = 0;
    mockUseApiGet.mockImplementation(() => {
      const idx = callIndex++;
      if (idx === 0) {
        return {
          data: null,
          loading: false,
          error: "Canonical error",
          refetch: vi.fn(),
        };
      }
      return { data: null, loading: false, error: null, refetch: vi.fn() };
    });
    render(<DonneesPage />);
    expect(screen.getByText("Canonical error")).toBeInTheDocument();
  });

  it("shows ingestion error fallback", () => {
    mockUseApiGet.mockImplementation((url: string | null) => {
      if (url?.includes("/ingestion-log")) {
        return {
          data: null,
          loading: false,
          error: "Ingestion error",
          refetch: vi.fn(),
        };
      }
      if (url?.includes("/canonical/quality")) {
        return { data: mockQuality, loading: false, error: null, refetch: vi.fn() };
      }
      if (url?.includes("/canonical")) {
        return { data: mockCanonical, loading: false, error: null, refetch: vi.fn() };
      }
      if (url?.includes("/datasets") && !url?.includes("/data") && !url?.includes("/features")) {
        return { data: [], loading: false, error: null, refetch: vi.fn() };
      }
      if (url?.includes("/datasets/") && url?.endsWith("/data")) {
        return {
          data: { datasetId: "dataset-1", rows: [] },
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      if (url?.includes("/datasets/") && url?.endsWith("/features")) {
        return {
          data: { datasetId: "dataset-1", features: [] },
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      return { data: null, loading: false, error: null, refetch: vi.fn() };
    });
    render(<DonneesPage />);
    expect(screen.getByText("Ingestion error")).toBeInTheDocument();
  });

  it("passes site_id filter when selectedSiteId is set", () => {
    mockContext.selectedSiteId = "site-42";
    render(<DonneesPage />);
    const calledUrl = mockUseApiGet.mock.calls[0]?.[0];
    expect(String(calledUrl)).toContain("site_id=site-42");
  });
});
