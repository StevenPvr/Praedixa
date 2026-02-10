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

import AlertesPage from "../page";

const mockAlerts = [
  {
    id: "a-1",
    date: "2026-01-15T00:00:00Z",
    type: "coverage",
    severity: "CRITICAL",
    siteName: "Lyon",
    departmentName: "Logistique",
    status: "active",
  },
  {
    id: "a-2",
    date: "2026-01-16T00:00:00Z",
    type: "absence",
    severity: "WARNING",
    siteName: null,
    departmentName: null,
    status: "resolved",
  },
  {
    id: "a-3",
    date: "2026-01-17T00:00:00Z",
    type: "forecast",
    severity: "INFO",
    siteName: "Paris",
    departmentName: null,
    status: "acknowledged",
  },
];

describe("AlertesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContext.selectedSiteId = null;
    mockUseApiGet.mockReturnValue({
      data: mockAlerts,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("renders heading and severity stat cards", () => {
    render(<AlertesPage />);
    expect(screen.getByText("Alertes")).toBeInTheDocument();
    expect(screen.getByText("Critiques: 1")).toBeInTheDocument();
    expect(screen.getByText("Avertissements: 1")).toBeInTheDocument();
    expect(screen.getByText("Informations: 1")).toBeInTheDocument();
  });

  it("renders alert data table with first row", () => {
    render(<AlertesPage />);
    expect(screen.getByText("coverage")).toBeInTheDocument();
    expect(screen.getByText("Lyon")).toBeInTheDocument();
    expect(screen.getByText("Logistique")).toBeInTheDocument();
  });

  it("shows loading skeletons", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
    render(<AlertesPage />);
    expect(screen.getAllByTestId("skeleton-card").length).toBeGreaterThan(0);
  });

  it("shows error fallback", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: "Alerts error",
      refetch: vi.fn(),
    });
    render(<AlertesPage />);
    expect(screen.getByText("Alerts error")).toBeInTheDocument();
  });

  it("passes site_id filter when selectedSiteId is set", () => {
    mockContext.selectedSiteId = "site-99";
    render(<AlertesPage />);
    const calledUrl = mockUseApiGet.mock.calls[0]?.[0];
    expect(String(calledUrl)).toContain("site_id=site-99");
  });

  it("shows zero counts when no alerts", () => {
    mockUseApiGet.mockReturnValue({
      data: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<AlertesPage />);
    expect(screen.getByText("Critiques: 0")).toBeInTheDocument();
    expect(screen.getByText("Avertissements: 0")).toBeInTheDocument();
    expect(screen.getByText("Informations: 0")).toBeInTheDocument();
  });
});
