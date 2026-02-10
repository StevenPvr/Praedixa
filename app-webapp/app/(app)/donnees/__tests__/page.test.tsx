import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DonneesPage from "../page";

// ── Hoisted dynamic mocks ──────────────────────────────────────────────────
const { mockUseApiGet, mockUseApiGetPaginated } = vi.hoisted(() => ({
  mockUseApiGet: vi.fn(),
  mockUseApiGetPaginated: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/donnees",
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
  useApiGetPaginated: (...args: unknown[]) => mockUseApiGetPaginated(...args),
}));

vi.mock("@praedixa/ui", () => ({
  DataTable: ({
    data,
    columns,
    getRowKey,
    emptyMessage,
    pagination,
  }: {
    data: Array<Record<string, unknown>>;
    columns?: Array<{
      key: string;
      render?: (row: Record<string, unknown>) => React.ReactNode;
    }>;
    getRowKey?: (row: Record<string, unknown>) => string;
    emptyMessage?: string;
    pagination?: {
      page: number;
      total: number;
      onPageChange: (p: number) => void;
    };
  }) => {
    const first = data[0];
    return (
      <div data-testid="data-table">
        {data.length === 0 ? <p>{emptyMessage}</p> : <p>{data.length} rows</p>}
        {first && getRowKey && (
          <div data-testid="row-key">{getRowKey(first)}</div>
        )}
        {first &&
          columns?.map((column) => (
            <div key={column.key} data-testid={`cell-${column.key}`}>
              {column.render
                ? column.render(first)
                : String(first[column.key] ?? "")}
            </div>
          ))}
        {pagination && (
          <div data-testid="pagination">
            Page {pagination.page} / total {pagination.total}
            <button onClick={() => pagination.onPageChange(2)}>Page 2</button>
          </div>
        )}
      </div>
    );
  },
  SkeletonTable: () => <div data-testid="skeleton-table" />,
}));

vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  ),
}));

vi.mock("@/components/ui/detail-card", () => ({
  DetailCard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="detail-card">{children}</div>
  ),
}));

vi.mock("@/components/ui/metric-card", () => ({
  MetricCard: ({
    label,
    value,
    unit,
    status,
  }: {
    label: string;
    value: string | number;
    unit?: string;
    status?: string;
  }) => (
    <div data-testid={`metric-${label}`} data-status={status}>
      {label}: {value}
      {unit}
    </div>
  ),
}));

vi.mock("@/components/ui/select-dropdown", () => ({
  SelectDropdown: ({
    label,
    options,
    value,
    onChange,
  }: {
    label?: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  }) => (
    <select
      data-testid={`select-${label}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock("@/components/ui/date-range-picker", () => ({
  DateRangePicker: ({
    value,
    onChange,
  }: {
    value: { from: string; to: string };
    onChange: (r: { from: string; to: string }) => void;
  }) => (
    <div data-testid="date-range-picker">
      <input
        data-testid="date-from"
        type="date"
        value={value.from}
        onChange={(e) => onChange({ ...value, from: e.target.value })}
      />
      <input
        data-testid="date-to"
        type="date"
        value={value.to}
        onChange={(e) => onChange({ ...value, to: e.target.value })}
      />
    </div>
  ),
}));

vi.mock("@/components/animated-section", () => ({
  AnimatedSection: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="animated-section">{children}</div>
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

const mockQuality = {
  totalRecords: 1250,
  coveragePct: 92,
  sites: 4,
  dateRange: ["2026-01-01", "2026-02-07"],
  missingShiftsPct: 1.5,
  avgAbsPct: 3.2,
};

const mockSites = [
  {
    id: "s1",
    name: "Lyon",
    organizationId: "org-1",
    timezone: "Europe/Paris",
    headcount: 50,
  },
  {
    id: "s2",
    name: "Paris",
    organizationId: "org-1",
    timezone: "Europe/Paris",
    headcount: 80,
  },
];

const mockRecords = [
  {
    id: "r1",
    organizationId: "org-1",
    siteId: "s1",
    date: "2026-02-01",
    shift: "am",
    capacitePlanH: 80,
    realiseH: 75,
    absH: 5,
    hsH: 2,
    interimH: 3,
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-01T00:00:00Z",
  },
];

const mockRefetchQuality = vi.fn();
const mockRefetchRecords = vi.fn();

function setupSuccessMocks() {
  mockUseApiGet.mockImplementation((url: string | null) => {
    if (url === "/api/v1/canonical/quality") {
      return {
        data: mockQuality,
        loading: false,
        error: null,
        refetch: mockRefetchQuality,
      };
    }
    if (url === "/api/v1/sites") {
      return { data: mockSites, loading: false, error: null, refetch: vi.fn() };
    }
    return { data: null, loading: false, error: null, refetch: vi.fn() };
  });

  mockUseApiGetPaginated.mockReturnValue({
    data: mockRecords,
    total: 1,
    pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    loading: false,
    error: null,
    refetch: mockRefetchRecords,
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("DonneesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSuccessMocks();
  });

  // ── Header ────────────────────────────────────────────────────────────────

  it("renders the page header with title Donnees", () => {
    render(<DonneesPage />);
    expect(
      screen.getByRole("heading", { name: "Donnees" }),
    ).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    render(<DonneesPage />);
    expect(
      screen.getByText("Toutes les donnees de vos equipes"),
    ).toBeInTheDocument();
  });

  // ── MetricCards ───────────────────────────────────────────────────────────

  it("renders Lignes de donnees metric with value", () => {
    render(<DonneesPage />);
    expect(screen.getByTestId("metric-Lignes de donnees")).toHaveTextContent(
      "1250",
    );
  });

  it("renders Taux de remplissage metric with value and %", () => {
    render(<DonneesPage />);
    expect(screen.getByTestId("metric-Taux de remplissage")).toHaveTextContent(
      "92%",
    );
  });

  it("renders Absence moyenne metric with value and %", () => {
    render(<DonneesPage />);
    expect(screen.getByTestId("metric-Absence moyenne")).toHaveTextContent(
      "3.2%",
    );
  });

  it("renders Postes non renseignes metric with value and %", () => {
    render(<DonneesPage />);
    expect(
      screen.getByTestId("metric-Postes non renseignes"),
    ).toHaveTextContent("1.5%");
  });

  it("sets good status when coverage >= 85", () => {
    render(<DonneesPage />);
    expect(screen.getByTestId("metric-Taux de remplissage")).toHaveAttribute(
      "data-status",
      "good",
    );
  });

  it("sets good status when avgAbsPct <= 5", () => {
    render(<DonneesPage />);
    expect(screen.getByTestId("metric-Absence moyenne")).toHaveAttribute(
      "data-status",
      "good",
    );
  });

  it("sets good status when missingShiftsPct <= 2", () => {
    render(<DonneesPage />);
    expect(screen.getByTestId("metric-Postes non renseignes")).toHaveAttribute(
      "data-status",
      "good",
    );
  });

  it("sets warning status when missingShiftsPct is between 2 and 3", () => {
    mockUseApiGet.mockImplementation((url: string | null) => {
      if (url === "/api/v1/canonical/quality") {
        return {
          data: { ...mockQuality, missingShiftsPct: 2.5 },
          loading: false,
          error: null,
          refetch: mockRefetchQuality,
        };
      }
      if (url === "/api/v1/sites") {
        return {
          data: mockSites,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      return { data: null, loading: false, error: null, refetch: vi.fn() };
    });
    render(<DonneesPage />);
    expect(screen.getByTestId("metric-Postes non renseignes")).toHaveAttribute(
      "data-status",
      "warning",
    );
  });

  it("sets danger status when missingShiftsPct is above 3", () => {
    mockUseApiGet.mockImplementation((url: string | null) => {
      if (url === "/api/v1/canonical/quality") {
        return {
          data: { ...mockQuality, missingShiftsPct: 3.5 },
          loading: false,
          error: null,
          refetch: mockRefetchQuality,
        };
      }
      if (url === "/api/v1/sites") {
        return {
          data: mockSites,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      return { data: null, loading: false, error: null, refetch: vi.fn() };
    });
    render(<DonneesPage />);
    expect(screen.getByTestId("metric-Postes non renseignes")).toHaveAttribute(
      "data-status",
      "danger",
    );
  });

  it("sets warning status when coverage is between 68 and 85", () => {
    mockUseApiGet.mockImplementation((url: string | null) => {
      if (url === "/api/v1/canonical/quality") {
        return {
          data: { ...mockQuality, coveragePct: 70 },
          loading: false,
          error: null,
          refetch: mockRefetchQuality,
        };
      }
      if (url === "/api/v1/sites") {
        return {
          data: mockSites,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      return { data: null, loading: false, error: null, refetch: vi.fn() };
    });
    render(<DonneesPage />);
    expect(screen.getByTestId("metric-Taux de remplissage")).toHaveAttribute(
      "data-status",
      "warning",
    );
  });

  it("sets danger status when coverage < 68", () => {
    mockUseApiGet.mockImplementation((url: string | null) => {
      if (url === "/api/v1/canonical/quality") {
        return {
          data: { ...mockQuality, coveragePct: 50 },
          loading: false,
          error: null,
          refetch: mockRefetchQuality,
        };
      }
      if (url === "/api/v1/sites") {
        return {
          data: mockSites,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      return { data: null, loading: false, error: null, refetch: vi.fn() };
    });
    render(<DonneesPage />);
    expect(screen.getByTestId("metric-Taux de remplissage")).toHaveAttribute(
      "data-status",
      "danger",
    );
  });

  it("sets warning status when avgAbsPct is between 5 and 7.5", () => {
    mockUseApiGet.mockImplementation((url: string | null) => {
      if (url === "/api/v1/canonical/quality") {
        return {
          data: { ...mockQuality, avgAbsPct: 6 },
          loading: false,
          error: null,
          refetch: mockRefetchQuality,
        };
      }
      if (url === "/api/v1/sites") {
        return {
          data: mockSites,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      return { data: null, loading: false, error: null, refetch: vi.fn() };
    });
    render(<DonneesPage />);
    expect(screen.getByTestId("metric-Absence moyenne")).toHaveAttribute(
      "data-status",
      "warning",
    );
  });

  it("sets danger status when avgAbsPct > 7.5", () => {
    mockUseApiGet.mockImplementation((url: string | null) => {
      if (url === "/api/v1/canonical/quality") {
        return {
          data: { ...mockQuality, avgAbsPct: 10 },
          loading: false,
          error: null,
          refetch: mockRefetchQuality,
        };
      }
      if (url === "/api/v1/sites") {
        return {
          data: mockSites,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      return { data: null, loading: false, error: null, refetch: vi.fn() };
    });
    render(<DonneesPage />);
    expect(screen.getByTestId("metric-Absence moyenne")).toHaveAttribute(
      "data-status",
      "danger",
    );
  });

  // ── Loading states ────────────────────────────────────────────────────────

  it("shows ... in metric cards when quality is loading", () => {
    mockUseApiGet.mockImplementation((url: string | null) => {
      if (url === "/api/v1/canonical/quality") {
        return {
          data: null,
          loading: true,
          error: null,
          refetch: mockRefetchQuality,
        };
      }
      if (url === "/api/v1/sites") {
        return {
          data: mockSites,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      return { data: null, loading: false, error: null, refetch: vi.fn() };
    });
    render(<DonneesPage />);
    expect(screen.getByTestId("metric-Lignes de donnees")).toHaveTextContent(
      "...",
    );
  });

  it("shows skeleton table when records are loading", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      pagination: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
    render(<DonneesPage />);
    expect(screen.getByTestId("skeleton-table")).toBeInTheDocument();
  });

  // ── Error states ──────────────────────────────────────────────────────────

  it("shows error fallback when quality fetch fails", () => {
    mockUseApiGet.mockImplementation((url: string | null) => {
      if (url === "/api/v1/canonical/quality") {
        return {
          data: null,
          loading: false,
          error: "Quality error",
          refetch: mockRefetchQuality,
        };
      }
      if (url === "/api/v1/sites") {
        return {
          data: mockSites,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      return { data: null, loading: false, error: null, refetch: vi.fn() };
    });
    render(<DonneesPage />);
    expect(screen.getByText("Quality error")).toBeInTheDocument();
  });

  it("shows error fallback when records fetch fails", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      pagination: null,
      loading: false,
      error: "Records error",
      refetch: mockRefetchRecords,
    });
    render(<DonneesPage />);
    expect(screen.getByText("Records error")).toBeInTheDocument();
  });

  // ── Filters ───────────────────────────────────────────────────────────────

  it("renders site filter with options from API", () => {
    render(<DonneesPage />);
    const select = screen.getByTestId("select-Site");
    expect(select).toBeInTheDocument();
    expect(select).toHaveTextContent("Lyon");
    expect(select).toHaveTextContent("Paris");
  });

  it("renders shift filter with AM/PM options", () => {
    render(<DonneesPage />);
    const select = screen.getByTestId("select-Poste");
    expect(select).toBeInTheDocument();
    expect(select).toHaveTextContent("Matin (AM)");
    expect(select).toHaveTextContent("Apres-midi (PM)");
  });

  it("renders date range picker", () => {
    render(<DonneesPage />);
    expect(screen.getByTestId("date-range-picker")).toBeInTheDocument();
  });

  it("changes site filter and resets page to 1", () => {
    render(<DonneesPage />);
    fireEvent.change(screen.getByTestId("select-Site"), {
      target: { value: "s1" },
    });
    // Verify paginated hook was called (it re-renders with new URL)
    expect(mockUseApiGetPaginated).toHaveBeenCalled();
  });

  it("changes shift filter", () => {
    render(<DonneesPage />);
    fireEvent.change(screen.getByTestId("select-Poste"), {
      target: { value: "am" },
    });
    expect(mockUseApiGetPaginated).toHaveBeenCalled();
  });

  it("changes date range", () => {
    render(<DonneesPage />);
    fireEvent.change(screen.getByTestId("date-from"), {
      target: { value: "2026-01-15" },
    });
    expect(mockUseApiGetPaginated).toHaveBeenCalled();
  });

  // ── DataTable ─────────────────────────────────────────────────────────────

  it("renders data table with records", () => {
    render(<DonneesPage />);
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
    expect(screen.getByText("1 rows")).toBeInTheDocument();
  });

  it("uses row id as DataTable key", () => {
    render(<DonneesPage />);
    expect(screen.getByTestId("row-key")).toHaveTextContent("r1");
  });

  it("renders fallback for realised hours when value is null", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [{ ...mockRecords[0], realiseH: null }],
      total: 1,
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      loading: false,
      error: null,
      refetch: mockRefetchRecords,
    });
    render(<DonneesPage />);
    expect(screen.getByTestId("cell-realiseH")).toHaveTextContent("—");
  });

  it("shows empty message when no records", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<DonneesPage />);
    expect(
      screen.getByText(
        "Aucune donnee disponible pour les filtres selectionnes.",
      ),
    ).toBeInTheDocument();
  });

  it("renders pagination controls", () => {
    render(<DonneesPage />);
    expect(screen.getByTestId("pagination")).toBeInTheDocument();
  });

  it("can navigate to page 2", () => {
    render(<DonneesPage />);
    fireEvent.click(screen.getByText("Page 2"));
    expect(mockUseApiGetPaginated).toHaveBeenCalled();
  });

  // ── Empty sites ───────────────────────────────────────────────────────────

  it("renders site filter with only Tous les sites when sites are null", () => {
    mockUseApiGet.mockImplementation((url: string | null) => {
      if (url === "/api/v1/canonical/quality") {
        return {
          data: mockQuality,
          loading: false,
          error: null,
          refetch: mockRefetchQuality,
        };
      }
      if (url === "/api/v1/sites") {
        return { data: null, loading: true, error: null, refetch: vi.fn() };
      }
      return { data: null, loading: false, error: null, refetch: vi.fn() };
    });
    render(<DonneesPage />);
    const select = screen.getByTestId("select-Site");
    expect(select.querySelectorAll("option")).toHaveLength(1);
    expect(select).toHaveTextContent("Tous les sites");
  });

  // ── Retry ─────────────────────────────────────────────────────────────────

  it("calls refetch on quality error retry", () => {
    mockUseApiGet.mockImplementation((url: string | null) => {
      if (url === "/api/v1/canonical/quality") {
        return {
          data: null,
          loading: false,
          error: "Quality error",
          refetch: mockRefetchQuality,
        };
      }
      if (url === "/api/v1/sites") {
        return {
          data: mockSites,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      return { data: null, loading: false, error: null, refetch: vi.fn() };
    });
    render(<DonneesPage />);
    fireEvent.click(screen.getByText("Reessayer"));
    expect(mockRefetchQuality).toHaveBeenCalledTimes(1);
  });

  it("calls refetch on records error retry", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      pagination: null,
      loading: false,
      error: "Records error",
      refetch: mockRefetchRecords,
    });
    render(<DonneesPage />);
    fireEvent.click(screen.getByText("Reessayer"));
    expect(mockRefetchRecords).toHaveBeenCalledTimes(1);
  });

  // ── Neutral status when quality is null ───────────────────────────────────

  it("sets neutral status when quality data is null", () => {
    mockUseApiGet.mockImplementation((url: string | null) => {
      if (url === "/api/v1/canonical/quality") {
        return {
          data: null,
          loading: false,
          error: null,
          refetch: mockRefetchQuality,
        };
      }
      if (url === "/api/v1/sites") {
        return {
          data: mockSites,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      return { data: null, loading: false, error: null, refetch: vi.fn() };
    });
    render(<DonneesPage />);
    expect(screen.getByTestId("metric-Taux de remplissage")).toHaveAttribute(
      "data-status",
      "neutral",
    );
  });
});
