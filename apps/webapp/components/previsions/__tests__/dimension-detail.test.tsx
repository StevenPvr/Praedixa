import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Hoisted mock functions for refetch tracking
const mockRefetchRuns = vi.fn();
const mockRefetchDaily = vi.fn();

// Default mock return for useApiGet — overridden per test as needed
let useApiGetImpl: (url: string | null) => {
  data: unknown;
  loading: boolean;
  error: string | null;
  refetch: ReturnType<typeof vi.fn>;
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (url: string | null) => useApiGetImpl(url),
}));

vi.mock("@tremor/react", () => ({
  AreaChart: (props: Record<string, unknown>) => {
    // Invoke valueFormatter to exercise the inline arrow function for coverage
    const formatter = props.valueFormatter as
      | ((v: number) => string)
      | undefined;
    const formattedSample = formatter ? formatter(42) : "";
    return (
      <div
        data-testid="area-chart"
        data-data={JSON.stringify(props.data)}
        data-formatted-sample={formattedSample}
      />
    );
  },
}));

vi.mock("@praedixa/ui", () => ({
  DataTable: ({
    data,
    columns,
    sort,
    onSort,
    emptyMessage,
    getRowKey,
  }: {
    data: Record<string, unknown>[];
    columns: {
      key: string;
      label: string;
      render?: (row: Record<string, unknown>) => unknown;
    }[];
    sort?: { key: string; direction: string };
    onSort?: (s: { key: string; direction: string }) => void;
    emptyMessage?: string;
    getRowKey?: (row: Record<string, unknown>) => string;
  }) => {
    if (!data || data.length === 0)
      return <div data-testid="data-table-empty">{emptyMessage}</div>;
    return (
      <table data-testid="data-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                onClick={() =>
                  onSort?.({
                    key: c.key,
                    direction: sort?.direction === "asc" ? "desc" : "asc",
                  })
                }
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={getRowKey ? getRowKey(row) : i}>
              {columns.map((c) => (
                <td key={c.key}>
                  {c.render ? c.render(row) : String(row[c.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  },
  SkeletonChart: () => <div data-testid="skeleton-chart" />,
  SkeletonTable: ({ rows, columns }: { rows: number; columns: number }) => (
    <div data-testid="skeleton-table" data-rows={rows} data-columns={columns} />
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
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
}));

import { DimensionDetail } from "../dimension-detail";

// --- Sample data ---
const sampleRuns = [
  { id: "40000000-0000-0000-0000-000000000001", status: "completed" },
];
const sampleDaily = [
  {
    forecastDate: "2026-02-01",
    dimension: "human",
    predictedDemand: 100,
    predictedCapacity: 90,
    gap: -10,
    riskScore: 0.2,
    confidenceLower: 80,
    confidenceUpper: 100,
    departmentId: null,
  },
  {
    forecastDate: "2026-02-02",
    dimension: "human",
    predictedDemand: 110,
    predictedCapacity: 120,
    gap: 10,
    riskScore: 0.5,
    confidenceLower: 100,
    confidenceUpper: 130,
    departmentId: null,
  },
  {
    forecastDate: "2026-02-03",
    dimension: "human",
    predictedDemand: 130,
    predictedCapacity: 90,
    gap: -40,
    riskScore: 0.8,
    confidenceLower: 70,
    confidenceUpper: 110,
    departmentId: null,
  },
];

// Helper to build the default "data loaded" impl
function defaultImpl(url: string | null) {
  if (url?.includes("/api/v1/forecasts?page=")) {
    return {
      data: sampleRuns,
      loading: false,
      error: null,
      refetch: mockRefetchRuns,
    };
  }
  if (url?.includes("/daily")) {
    return {
      data: sampleDaily,
      loading: false,
      error: null,
      refetch: mockRefetchDaily,
    };
  }
  return { data: null, loading: false, error: null, refetch: vi.fn() };
}

describe("DimensionDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useApiGetImpl = defaultImpl;
  });

  // ------------------------------------------------------------------
  // Error states
  // ------------------------------------------------------------------
  describe("error handling", () => {
    it("shows ErrorFallback when runs fetch errors", () => {
      useApiGetImpl = (url) => {
        if (url?.includes("/api/v1/forecasts?page=")) {
          return {
            data: null,
            loading: false,
            error: "Erreur runs",
            refetch: mockRefetchRuns,
          };
        }
        return { data: null, loading: false, error: null, refetch: vi.fn() };
      };
      render(<DimensionDetail dimension="humaine" />);
      expect(screen.getByTestId("error-fallback")).toHaveTextContent(
        "Erreur runs",
      );
    });

    it("shows ErrorFallback when daily fetch errors", () => {
      useApiGetImpl = (url) => {
        if (url?.includes("/api/v1/forecasts?page=")) {
          return {
            data: sampleRuns,
            loading: false,
            error: null,
            refetch: mockRefetchRuns,
          };
        }
        if (url?.includes("/daily")) {
          return {
            data: null,
            loading: false,
            error: "Erreur daily",
            refetch: mockRefetchDaily,
          };
        }
        return { data: null, loading: false, error: null, refetch: vi.fn() };
      };
      render(<DimensionDetail dimension="humaine" />);
      expect(screen.getByTestId("error-fallback")).toHaveTextContent(
        "Erreur daily",
      );
    });

    it("retry calls both refetchRuns and refetchDaily", () => {
      useApiGetImpl = (url) => {
        if (url?.includes("/api/v1/forecasts?page=")) {
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
      };
      render(<DimensionDetail dimension="humaine" />);
      fireEvent.click(screen.getByText("Retry"));
      expect(mockRefetchRuns).toHaveBeenCalledOnce();
      expect(mockRefetchDaily).toHaveBeenCalledOnce();
    });
  });

  // ------------------------------------------------------------------
  // Loading states
  // ------------------------------------------------------------------
  describe("loading states", () => {
    it("shows pulse animation div when loading and no runs yet", () => {
      useApiGetImpl = () => ({
        data: null,
        loading: true,
        error: null,
        refetch: vi.fn(),
      });
      render(<DimensionDetail dimension="humaine" />);
      // The chart section should have the pulse animation div
      const pulseDiv = document.querySelector(".animate-pulse");
      expect(pulseDiv).toBeInTheDocument();
    });

    it("shows SkeletonTable for table when loading", () => {
      useApiGetImpl = () => ({
        data: null,
        loading: true,
        error: null,
        refetch: vi.fn(),
      });
      render(<DimensionDetail dimension="humaine" />);
      expect(screen.getByTestId("skeleton-table")).toBeInTheDocument();
    });
  });

  // ------------------------------------------------------------------
  // Empty states
  // ------------------------------------------------------------------
  describe("empty states", () => {
    it("shows empty chart message when chartData is empty", () => {
      useApiGetImpl = (url) => {
        if (url?.includes("/api/v1/forecasts?page=")) {
          return {
            data: sampleRuns,
            loading: false,
            error: null,
            refetch: mockRefetchRuns,
          };
        }
        if (url?.includes("/daily")) {
          return {
            data: [],
            loading: false,
            error: null,
            refetch: mockRefetchDaily,
          };
        }
        return { data: null, loading: false, error: null, refetch: vi.fn() };
      };
      render(<DimensionDetail dimension="humaine" />);
      // The chart section displays "Aucune prevision disponible"
      const chartSection = screen.getByLabelText("Timeline de prevision");
      expect(chartSection).toHaveTextContent("Aucune prevision disponible");
    });

    it("shows DataTable emptyMessage when data is empty", () => {
      useApiGetImpl = (url) => {
        if (url?.includes("/api/v1/forecasts?page=")) {
          return {
            data: sampleRuns,
            loading: false,
            error: null,
            refetch: mockRefetchRuns,
          };
        }
        if (url?.includes("/daily")) {
          return {
            data: [],
            loading: false,
            error: null,
            refetch: mockRefetchDaily,
          };
        }
        return { data: null, loading: false, error: null, refetch: vi.fn() };
      };
      render(<DimensionDetail dimension="humaine" />);
      expect(screen.getByTestId("data-table-empty")).toHaveTextContent(
        "Aucune prevision disponible",
      );
    });
  });

  // ------------------------------------------------------------------
  // API_DIMENSION_MAP
  // ------------------------------------------------------------------
  describe("API_DIMENSION_MAP", () => {
    it('maps "humaine" to API parameter "human"', () => {
      let capturedUrl: string | null = null;
      useApiGetImpl = (url) => {
        if (url?.includes("/daily")) capturedUrl = url;
        return defaultImpl(url);
      };
      render(<DimensionDetail dimension="humaine" />);
      expect(capturedUrl).toContain("dimension=human");
    });

    it('maps "marchandise" to API parameter "merchandise"', () => {
      let capturedUrl: string | null = null;
      useApiGetImpl = (url) => {
        if (url?.includes("/daily")) capturedUrl = url;
        return defaultImpl(url);
      };
      render(<DimensionDetail dimension="marchandise" />);
      expect(capturedUrl).toContain("dimension=merchandise");
    });

    it("passes through unknown dimension as-is", () => {
      let capturedUrl: string | null = null;
      useApiGetImpl = (url) => {
        if (url?.includes("/daily")) capturedUrl = url;
        return defaultImpl(url);
      };
      render(<DimensionDetail dimension="custom" />);
      expect(capturedUrl).toContain("dimension=custom");
    });
  });

  // ------------------------------------------------------------------
  // Null latestRunId
  // ------------------------------------------------------------------
  it("passes null URL to second useApiGet when no runs returned", () => {
    const urls: (string | null)[] = [];
    useApiGetImpl = (url) => {
      urls.push(url);
      if (url?.includes("/api/v1/forecasts?page=")) {
        return {
          data: [],
          loading: false,
          error: null,
          refetch: mockRefetchRuns,
        };
      }
      return { data: null, loading: false, error: null, refetch: vi.fn() };
    };
    render(<DimensionDetail dimension="humaine" />);
    // The second call should be null since no runs
    expect(urls).toContain(null);
  });

  // ------------------------------------------------------------------
  // Chart rendering
  // ------------------------------------------------------------------
  describe("chart", () => {
    it("renders AreaChart when data is available", () => {
      render(<DimensionDetail dimension="humaine" />);
      expect(screen.getByTestId("area-chart")).toBeInTheDocument();
    });

    it("passes formatted dates as chart data", () => {
      render(<DimensionDetail dimension="humaine" />);
      const chartEl = screen.getByTestId("area-chart");
      const data = JSON.parse(chartEl.getAttribute("data-data")!);
      // "2026-02-01" → fr-FR short format
      expect(data[0].date).toBeDefined();
      expect(data).toHaveLength(3);
    });
  });

  // ------------------------------------------------------------------
  // Table rendering
  // ------------------------------------------------------------------
  describe("table", () => {
    it("renders DataTable with data rows", () => {
      render(<DimensionDetail dimension="humaine" />);
      expect(screen.getByTestId("data-table")).toBeInTheDocument();
      // 3 data rows
      const rows = screen
        .getByTestId("data-table")
        .querySelectorAll("tbody tr");
      expect(rows).toHaveLength(3);
    });

    it("renders column headers: Date, Demande, Capacite, Ecart, Risque", () => {
      render(<DimensionDetail dimension="humaine" />);
      expect(screen.getByText("Date")).toBeInTheDocument();
      expect(screen.getByText("Demande")).toBeInTheDocument();
      expect(screen.getByText("Capacite")).toBeInTheDocument();
      expect(screen.getByText("Ecart")).toBeInTheDocument();
      expect(screen.getByText("Risque")).toBeInTheDocument();
    });
  });

  // ------------------------------------------------------------------
  // formatDate
  // ------------------------------------------------------------------
  it("formats ISO date to fr-FR short format", () => {
    render(<DimensionDetail dimension="humaine" />);
    // "2026-02-01" should become "1 fevr." (or locale-dependent)
    // The Date column renders via formatDate — find the cell content
    const table = screen.getByTestId("data-table");
    const cells = table.querySelectorAll("tbody tr:first-child td");
    // First column = Date, rendered by formatDate("2026-02-01")
    const formatted = new Date("2026-02-01").toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
    expect(cells[0].textContent).toBe(formatted);
  });

  // ------------------------------------------------------------------
  // Ecart column formatting
  // ------------------------------------------------------------------
  describe("Ecart column", () => {
    it("shows positive sign for positive gap", () => {
      render(<DimensionDetail dimension="humaine" />);
      // gap=10 → "+10"
      expect(screen.getByText("+10")).toBeInTheDocument();
    });

    it("shows negative value for negative gap", () => {
      render(<DimensionDetail dimension="humaine" />);
      // gap=-10 → "-10", gap=-40 → "-40"
      expect(screen.getByText("-10")).toBeInTheDocument();
      expect(screen.getByText("-40")).toBeInTheDocument();
    });
  });

  // ------------------------------------------------------------------
  // Risk column
  // ------------------------------------------------------------------
  describe("risk column", () => {
    it('shows "Faible" with success class for riskScore <= 0.3', () => {
      render(<DimensionDetail dimension="humaine" />);
      // riskScore 0.2 → "Faible (20)"
      const faible = screen.getByText("Faible (20)");
      expect(faible).toBeInTheDocument();
      expect(faible.className).toContain("text-success-700");
      expect(faible.className).toContain("bg-success-50");
    });

    it('shows "Moyen" with warning class for riskScore 0.3-0.6', () => {
      render(<DimensionDetail dimension="humaine" />);
      // riskScore 0.5 → "Moyen (50)"
      const moyen = screen.getByText("Moyen (50)");
      expect(moyen).toBeInTheDocument();
      expect(moyen.className).toContain("text-warning-700");
      expect(moyen.className).toContain("bg-warning-50");
    });

    it('shows "Eleve" with danger class for riskScore > 0.6', () => {
      render(<DimensionDetail dimension="humaine" />);
      // riskScore 0.8 → "Eleve (80)"
      const eleve = screen.getByText("Eleve (80)");
      expect(eleve).toBeInTheDocument();
      expect(eleve.className).toContain("text-danger-700");
      expect(eleve.className).toContain("bg-danger-50");
    });
  });

  // ------------------------------------------------------------------
  // Sort with null values (exercises ?? "" branch in sortedData)
  // ------------------------------------------------------------------
  describe("sorting with null departmentId", () => {
    it("exercises the null fallback branch when sorting by a nullable field", () => {
      // Override with data that has mixed null/non-null departmentId
      const mixedData = [
        { ...sampleDaily[0], departmentId: "dept-bbb" },
        { ...sampleDaily[1], departmentId: null },
        { ...sampleDaily[2], departmentId: "dept-aaa" },
      ];
      useApiGetImpl = (url) => {
        if (url?.includes("/api/v1/forecasts?page=")) {
          return {
            data: sampleRuns,
            loading: false,
            error: null,
            refetch: mockRefetchRuns,
          };
        }
        if (url?.includes("/daily")) {
          return {
            data: mixedData,
            loading: false,
            error: null,
            refetch: mockRefetchDaily,
          };
        }
        return { data: null, loading: false, error: null, refetch: vi.fn() };
      };

      render(<DimensionDetail dimension="humaine" />);
      // Table should render 3 rows
      const rows = screen
        .getByTestId("data-table")
        .querySelectorAll("tbody tr");
      expect(rows).toHaveLength(3);
    });
  });

  // ------------------------------------------------------------------
  // Section headings
  // ------------------------------------------------------------------
  describe("section headings", () => {
    it('renders "Evolution de la couverture" heading', () => {
      render(<DimensionDetail dimension="humaine" />);
      expect(
        screen.getByRole("heading", { name: "Evolution de la couverture" }),
      ).toBeInTheDocument();
    });

    it('renders "Donnees detaillees" heading', () => {
      render(<DimensionDetail dimension="humaine" />);
      expect(
        screen.getByRole("heading", { name: "Donnees detaillees" }),
      ).toBeInTheDocument();
    });
  });
});
