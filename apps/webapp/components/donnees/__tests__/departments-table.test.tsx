import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DepartmentsTable } from "../departments-table";

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
  { id: "s1", name: "Lyon" },
  { id: "s2", name: "Paris" },
];

const mockDepartments = [
  {
    id: "d1",
    name: "Logistique",
    code: "LOG",
    siteId: "s1",
    headcount: 42,
    minStaffingLevel: 80,
    criticalRolesCount: 5,
  },
  {
    id: "d2",
    name: "Expedition",
    code: null,
    siteId: null,
    headcount: 1500,
    minStaffingLevel: 95,
    criticalRolesCount: 0,
  },
];

// ── Tests ────────────────────────────────────────────────────────────────────

describe("DepartmentsTable", () => {
  beforeEach(() => {
    mockUseApiGet.mockReset();
  });

  describe("loading state", () => {
    it("renders SkeletonTable with 5 rows and 6 columns while loading", () => {
      mockUseApiGet.mockReturnValue({
        data: null,
        loading: true,
        error: null,
        refetch: vi.fn(),
      });

      render(<DepartmentsTable sites={mockSites} />);
      const skeleton = screen.getByTestId("skeleton-table");
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute("data-rows", "5");
      expect(skeleton).toHaveAttribute("data-columns", "6");
    });
  });

  describe("error state", () => {
    it("renders ErrorFallback with error message", () => {
      mockUseApiGet.mockReturnValue({
        data: null,
        loading: false,
        error: "Erreur serveur",
        refetch: vi.fn(),
      });

      render(<DepartmentsTable sites={mockSites} />);
      const fallback = screen.getByTestId("error-fallback");
      expect(fallback).toBeInTheDocument();
      expect(screen.getByText("Erreur serveur")).toBeInTheDocument();
    });

    it("calls refetch when retry button is clicked", () => {
      const mockRefetch = vi.fn();
      mockUseApiGet.mockReturnValue({
        data: null,
        loading: false,
        error: "Erreur reseau",
        refetch: mockRefetch,
      });

      render(<DepartmentsTable sites={mockSites} />);
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

      render(<DepartmentsTable sites={mockSites} />);
      expect(
        screen.getByText("Aucun departement configure"),
      ).toBeInTheDocument();
    });
  });

  describe("site filter", () => {
    beforeEach(() => {
      mockUseApiGet.mockReturnValue({
        data: mockDepartments,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it("renders the filter label", () => {
      render(<DepartmentsTable sites={mockSites} />);
      expect(screen.getByText("Filtrer par site")).toBeInTheDocument();
    });

    it("has default filter value empty (Tous les sites)", () => {
      render(<DepartmentsTable sites={mockSites} />);
      const select = screen.getByLabelText(
        "Filtrer par site",
      ) as HTMLSelectElement;
      expect(select.value).toBe("");
    });

    it("renders site options from props", () => {
      render(<DepartmentsTable sites={mockSites} />);
      expect(screen.getByText("Tous les sites")).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Lyon" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Paris" })).toBeInTheDocument();
    });

    it("calls useApiGet with base URL when no site is selected", () => {
      render(<DepartmentsTable sites={mockSites} />);
      expect(mockUseApiGet).toHaveBeenCalledWith("/api/v1/departments");
    });

    it("calls useApiGet with site_id param when a site is selected", () => {
      render(<DepartmentsTable sites={mockSites} />);

      const select = screen.getByLabelText("Filtrer par site");
      fireEvent.change(select, { target: { value: "s1" } });

      // After re-render, useApiGet should be called with filtered URL
      expect(mockUseApiGet).toHaveBeenCalledWith(
        "/api/v1/departments?site_id=s1",
      );
    });
  });

  describe("data rendering", () => {
    beforeEach(() => {
      mockUseApiGet.mockReturnValue({
        data: mockDepartments,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it("renders DataTable with department data", () => {
      render(<DepartmentsTable sites={mockSites} />);
      expect(screen.getByTestId("data-table")).toBeInTheDocument();
      expect(screen.getByText("Logistique")).toBeInTheDocument();
      expect(screen.getByText("Expedition")).toBeInTheDocument();
    });

    it("renders all six column labels", () => {
      render(<DepartmentsTable sites={mockSites} />);
      expect(screen.getByText("Nom")).toBeInTheDocument();
      expect(screen.getByText("Code")).toBeInTheDocument();
      expect(screen.getByText("Site")).toBeInTheDocument();
      expect(screen.getByText("Effectif")).toBeInTheDocument();
      expect(screen.getByText("Seuil min.")).toBeInTheDocument();
      expect(screen.getByText("Roles critiques")).toBeInTheDocument();
    });

    it("renders null code as '--'", () => {
      render(<DepartmentsTable sites={mockSites} />);
      // Expedition has code: null → "--", siteId: null → "--"
      // We expect at least 2 "--" cells (code + siteId for Expedition)
      const dashes = screen.getAllByText("--");
      expect(dashes.length).toBeGreaterThanOrEqual(2);
    });

    it("resolves known siteId to site name via siteNameMap", () => {
      render(<DepartmentsTable sites={mockSites} />);
      // d1.siteId = "s1" → "Lyon" (from siteNameMap)
      // "Lyon" appears in both the site filter option AND the table cell
      const lyonTexts = screen.getAllByText("Lyon");
      expect(lyonTexts.length).toBeGreaterThanOrEqual(2); // option + cell
    });

    it("shows '--' for unknown siteId not in sites prop", () => {
      const deptWithUnknownSite = [
        {
          id: "d3",
          name: "RH",
          code: "RH",
          siteId: "unknown-id",
          headcount: 10,
          minStaffingLevel: 70,
          criticalRolesCount: 1,
        },
      ];
      mockUseApiGet.mockReturnValue({
        data: deptWithUnknownSite,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<DepartmentsTable sites={mockSites} />);
      expect(screen.getByText("--")).toBeInTheDocument();
    });

    it("shows '--' for null siteId", () => {
      const deptWithNullSite = [
        {
          id: "d4",
          name: "IT",
          code: "IT",
          siteId: null,
          headcount: 5,
          minStaffingLevel: 60,
          criticalRolesCount: 0,
        },
      ];
      mockUseApiGet.mockReturnValue({
        data: deptWithNullSite,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<DepartmentsTable sites={mockSites} />);
      expect(screen.getByText("--")).toBeInTheDocument();
    });

    it("formats headcount with fr-FR locale", () => {
      render(<DepartmentsTable sites={mockSites} />);
      // 1500 in fr-FR → contains "1" and "500" with a space separator
      const cells = screen.getAllByRole("cell");
      const headcountCells = cells.filter((cell) =>
        cell.textContent?.match(/1\s?500/),
      );
      expect(headcountCells).toHaveLength(1);
    });

    it("renders minStaffingLevel as percentage with toFixed(0)", () => {
      render(<DepartmentsTable sites={mockSites} />);
      expect(screen.getByText("80%")).toBeInTheDocument();
      expect(screen.getByText("95%")).toBeInTheDocument();
    });

    it("renders criticalRolesCount as string", () => {
      render(<DepartmentsTable sites={mockSites} />);
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  describe("sorting", () => {
    beforeEach(() => {
      mockUseApiGet.mockReturnValue({
        data: mockDepartments,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it("default sort is name ascending — Expedition before Logistique", () => {
      render(<DepartmentsTable sites={mockSites} />);
      const rows = screen.getAllByRole("row");
      // rows[0] = header, rows[1] = first data row
      expect(rows[1]).toHaveTextContent("Expedition");
      expect(rows[2]).toHaveTextContent("Logistique");
    });

    it("sorting by a column with null values exercises the ?? fallback", () => {
      render(<DepartmentsTable sites={mockSites} />);
      // Click "Code" — toggles to desc (since default direction is "asc")
      fireEvent.click(screen.getByText("Code"));
      // Click "Code" again — toggles to asc
      fireEvent.click(screen.getByText("Code"));
      // In asc: "" (null→"") < "LOG" so Expedition (null code) first
      const rows = screen.getAllByRole("row");
      expect(rows[1]).toHaveTextContent("Expedition");
      expect(rows[2]).toHaveTextContent("Logistique");
    });

    it("clicking a column header toggles sort direction", () => {
      render(<DepartmentsTable sites={mockSites} />);

      // Click "Nom" to switch to descending
      fireEvent.click(screen.getByText("Nom"));

      const rows = screen.getAllByRole("row");
      expect(rows[1]).toHaveTextContent("Logistique");
      expect(rows[2]).toHaveTextContent("Expedition");
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

      render(<DepartmentsTable sites={mockSites} />);
      expect(
        screen.getByText("Aucun departement configure"),
      ).toBeInTheDocument();
    });
  });

  describe("filter still renders during loading", () => {
    it("shows site filter even when data is loading", () => {
      mockUseApiGet.mockReturnValue({
        data: null,
        loading: true,
        error: null,
        refetch: vi.fn(),
      });

      render(<DepartmentsTable sites={mockSites} />);
      // Filter is outside the loading/error conditional
      expect(screen.getByText("Filtrer par site")).toBeInTheDocument();
      expect(screen.getByTestId("skeleton-table")).toBeInTheDocument();
    });
  });
});
