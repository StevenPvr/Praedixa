import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SitesTable } from "../sites-table";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockUseApiGet = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
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
    data: unknown[];
    columns: {
      key: string;
      label: string;
      render?: (row: unknown) => string;
    }[];
    sort?: { key: string; direction: string };
    onSort?: (s: { key: string; direction: string }) => void;
    emptyMessage: string;
    getRowKey?: (row: unknown) => string;
  }) => {
    if (data.length === 0) return <div>{emptyMessage}</div>;
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
          {data.map((row: unknown, i: number) => (
            <tr key={getRowKey ? getRowKey(row) : i}>
              {columns.map((c) => (
                <td key={c.key}>
                  {c.render
                    ? c.render(row)
                    : String((row as Record<string, unknown>)[c.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  },
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

// ── Test data ────────────────────────────────────────────────────────────────

const mockSites = [
  {
    id: "s1",
    name: "Lyon",
    code: "LYN",
    timezone: "Europe/Paris",
    headcount: 1500,
  },
  {
    id: "s2",
    name: "Paris",
    code: null,
    timezone: "Europe/Paris",
    headcount: 800,
  },
];

// ── Tests ────────────────────────────────────────────────────────────────────

describe("SitesTable", () => {
  beforeEach(() => {
    mockUseApiGet.mockReset();
  });

  describe("loading state", () => {
    it("renders SkeletonTable with 5 rows and 4 columns while loading", () => {
      mockUseApiGet.mockReturnValue({
        data: null,
        loading: true,
        error: null,
        refetch: vi.fn(),
      });

      render(<SitesTable />);
      const skeleton = screen.getByTestId("skeleton-table");
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute("data-rows", "5");
      expect(skeleton).toHaveAttribute("data-columns", "4");
    });
  });

  describe("error state", () => {
    it("renders ErrorFallback with error message", () => {
      mockUseApiGet.mockReturnValue({
        data: null,
        loading: false,
        error: "Server error 500",
        refetch: vi.fn(),
      });

      render(<SitesTable />);
      const fallback = screen.getByTestId("error-fallback");
      expect(fallback).toBeInTheDocument();
      expect(screen.getByText("Server error 500")).toBeInTheDocument();
    });

    it("calls refetch when retry button is clicked", () => {
      const mockRefetch = vi.fn();
      mockUseApiGet.mockReturnValue({
        data: null,
        loading: false,
        error: "Network failure",
        refetch: mockRefetch,
      });

      render(<SitesTable />);
      fireEvent.click(screen.getByText("Retry"));
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("empty state", () => {
    it("shows empty message when data is empty array", () => {
      mockUseApiGet.mockReturnValue({
        data: [],
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<SitesTable />);
      expect(screen.getByText("Aucun site configure")).toBeInTheDocument();
    });
  });

  describe("data rendering", () => {
    beforeEach(() => {
      mockUseApiGet.mockReturnValue({
        data: mockSites,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it("renders DataTable with site data", () => {
      render(<SitesTable />);
      expect(screen.getByTestId("data-table")).toBeInTheDocument();
      expect(screen.getByText("Lyon")).toBeInTheDocument();
      expect(screen.getByText("Paris")).toBeInTheDocument();
    });

    it("renders all four column labels", () => {
      render(<SitesTable />);
      expect(screen.getByText("Nom")).toBeInTheDocument();
      expect(screen.getByText("Code")).toBeInTheDocument();
      expect(screen.getByText("Effectif")).toBeInTheDocument();
      expect(screen.getByText("Fuseau horaire")).toBeInTheDocument();
    });

    it("renders null code as '--'", () => {
      render(<SitesTable />);
      // Paris has code: null, should show "--"
      expect(screen.getByText("--")).toBeInTheDocument();
      // Lyon has code: "LYN"
      expect(screen.getByText("LYN")).toBeInTheDocument();
    });

    it("formats headcount with fr-FR locale", () => {
      render(<SitesTable />);
      // 1500 in fr-FR → "1 500" (narrow no-break space U+202F)
      const cells = screen.getAllByRole("cell");
      const headcountCells = cells.filter((cell) =>
        cell.textContent?.match(/1\s?500/),
      );
      expect(headcountCells).toHaveLength(1);
    });

    it("renders timezone values", () => {
      render(<SitesTable />);
      // Both sites have Europe/Paris
      expect(screen.getAllByText("Europe/Paris")).toHaveLength(2);
    });
  });

  describe("sorting", () => {
    beforeEach(() => {
      mockUseApiGet.mockReturnValue({
        data: mockSites,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it("default sort is name ascending — Lyon before Paris", () => {
      render(<SitesTable />);
      const rows = screen.getAllByRole("row");
      // rows[0] is header, rows[1] is first data row
      const firstDataRow = rows[1];
      const secondDataRow = rows[2];
      expect(firstDataRow).toHaveTextContent("Lyon");
      expect(secondDataRow).toHaveTextContent("Paris");
    });

    it("sorting by a column with null values uses empty string fallback", () => {
      render(<SitesTable />);
      // Click "Code" — toggles to desc (since default direction is "asc")
      fireEvent.click(screen.getByText("Code"));
      // In desc: "LYN" > "" so Lyon first, Paris second

      // Click "Code" again — toggles to asc
      fireEvent.click(screen.getByText("Code"));
      // In asc: "" < "LYN" so Paris (null→"") first, Lyon second

      const rows = screen.getAllByRole("row");
      const firstDataRow = rows[1];
      const secondDataRow = rows[2];
      expect(firstDataRow).toHaveTextContent("Paris");
      expect(secondDataRow).toHaveTextContent("Lyon");
    });

    it("clicking a column header toggles sort direction", () => {
      render(<SitesTable />);
      // Click "Nom" to switch to descending
      fireEvent.click(screen.getByText("Nom"));

      // After toggle to desc, Paris should come before Lyon
      const rows = screen.getAllByRole("row");
      const firstDataRow = rows[1];
      const secondDataRow = rows[2];
      expect(firstDataRow).toHaveTextContent("Paris");
      expect(secondDataRow).toHaveTextContent("Lyon");
    });
  });

  describe("API call", () => {
    it("calls useApiGet with the correct URL", () => {
      mockUseApiGet.mockReturnValue({
        data: [],
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<SitesTable />);
      expect(mockUseApiGet).toHaveBeenCalledWith("/api/v1/sites");
    });
  });

  describe("null data fallback", () => {
    it("renders empty message when data is null", () => {
      mockUseApiGet.mockReturnValue({
        data: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<SitesTable />);
      expect(screen.getByText("Aucun site configure")).toBeInTheDocument();
    });
  });
});
