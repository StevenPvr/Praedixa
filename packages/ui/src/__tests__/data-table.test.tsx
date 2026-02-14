import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DataTable, type DataTableColumn } from "../components/data-table";

interface TestRow {
  id: number;
  name: string;
  email: string;
}

const sampleColumns: DataTableColumn<TestRow>[] = [
  { key: "id", label: "ID", sortable: true },
  { key: "name", label: "Name", sortable: true },
  { key: "email", label: "Email" },
];

const sampleData: TestRow[] = [
  { id: 1, name: "Alice", email: "alice@test.com" },
  { id: 2, name: "Bob", email: "bob@test.com" },
  { id: 3, name: "Charlie", email: "charlie@test.com" },
];

describe("DataTable", () => {
  describe("rendering", () => {
    it("renders column headers", () => {
      render(<DataTable columns={sampleColumns} data={sampleData} />);
      expect(screen.getByText("ID")).toBeInTheDocument();
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Email")).toBeInTheDocument();
    });

    it("renders data rows", () => {
      render(<DataTable columns={sampleColumns} data={sampleData} />);
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("bob@test.com")).toBeInTheDocument();
      expect(screen.getByText("Charlie")).toBeInTheDocument();
    });

    it("uses getRowKey for row keys when provided", () => {
      const getRowKey = vi.fn((row: TestRow) => row.id);
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          getRowKey={getRowKey}
        />,
      );
      expect(getRowKey).toHaveBeenCalledTimes(3);
      expect(getRowKey).toHaveBeenCalledWith(sampleData[0], 0);
      expect(getRowKey).toHaveBeenCalledWith(sampleData[1], 1);
      expect(getRowKey).toHaveBeenCalledWith(sampleData[2], 2);
    });

    it("renders cell value as string from row property by default", () => {
      render(<DataTable columns={sampleColumns} data={sampleData} />);
      // id=1 should be rendered as "1"
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("handles null/undefined cell values gracefully (empty string)", () => {
      const dataWithNull = [
        { id: 1, name: "Alice", email: undefined as unknown as string },
      ];
      render(<DataTable columns={sampleColumns} data={dataWithNull} />);
      // undefined should become "" via the ?? "" fallback
      const cells = screen.getAllByRole("cell");
      const emailCell = cells[2]; // third column
      expect(emailCell.textContent).toBe("");
    });
  });

  describe("custom cell renderers", () => {
    it("uses custom render function when provided", () => {
      const columns: DataTableColumn<TestRow>[] = [
        {
          key: "name",
          label: "Name",
          render: (row) => <strong data-testid="bold-name">{row.name}</strong>,
        },
      ];
      render(<DataTable columns={columns} data={sampleData} />);
      expect(screen.getAllByTestId("bold-name")).toHaveLength(3);
      expect(screen.getAllByTestId("bold-name")[0]).toHaveTextContent("Alice");
    });

    it("passes row index to custom render function", () => {
      const renderSpy = vi.fn((row: TestRow, index: number) => (
        <span>{`${row.name}-${index}`}</span>
      ));
      const columns: DataTableColumn<TestRow>[] = [
        { key: "name", label: "Name", render: renderSpy },
      ];
      render(<DataTable columns={columns} data={sampleData} />);
      expect(renderSpy).toHaveBeenCalledWith(sampleData[0], 0);
      expect(renderSpy).toHaveBeenCalledWith(sampleData[2], 2);
    });
  });

  describe("empty state", () => {
    it("shows default empty message when data is empty", () => {
      render(<DataTable columns={sampleColumns} data={[]} />);
      expect(screen.getByText("Aucune donnee")).toBeInTheDocument();
    });

    it("shows custom empty message", () => {
      render(
        <DataTable
          columns={sampleColumns}
          data={[]}
          emptyMessage="No records found"
        />,
      );
      expect(screen.getByText("No records found")).toBeInTheDocument();
    });

    it("empty message spans all columns", () => {
      render(<DataTable columns={sampleColumns} data={[]} />);
      const td = screen.getByText("Aucune donnee").closest("td");
      expect(td).toHaveAttribute("colspan", String(sampleColumns.length));
    });
  });

  describe("sorting", () => {
    it("does not call onSort for non-sortable columns", () => {
      const onSort = vi.fn();
      render(
        <DataTable columns={sampleColumns} data={sampleData} onSort={onSort} />,
      );
      // Email is not sortable
      fireEvent.click(screen.getByText("Email"));
      expect(onSort).not.toHaveBeenCalled();
    });

    it("calls onSort with ascending when clicking unsorted column", () => {
      const onSort = vi.fn();
      render(
        <DataTable columns={sampleColumns} data={sampleData} onSort={onSort} />,
      );
      fireEvent.click(screen.getByText("Name"));
      expect(onSort).toHaveBeenCalledWith({
        key: "name",
        direction: "asc",
      });
    });

    it("toggles sort direction to desc when clicking already-ascending column", () => {
      const onSort = vi.fn();
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          sort={{ key: "name", direction: "asc" }}
          onSort={onSort}
        />,
      );
      fireEvent.click(screen.getByText("Name"));
      expect(onSort).toHaveBeenCalledWith({
        key: "name",
        direction: "desc",
      });
    });

    it("resets to ascending when clicking a different column", () => {
      const onSort = vi.fn();
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          sort={{ key: "name", direction: "desc" }}
          onSort={onSort}
        />,
      );
      fireEvent.click(screen.getByText("ID"));
      expect(onSort).toHaveBeenCalledWith({
        key: "id",
        direction: "asc",
      });
    });

    it("does not call onSort when onSort is not provided (sortable column)", () => {
      // No crash when clicking sortable column without onSort handler
      render(<DataTable columns={sampleColumns} data={sampleData} />);
      fireEvent.click(screen.getByText("Name"));
      // Just verifying no error is thrown
    });

    it("shows aria-sort ascending on active sorted column", () => {
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          sort={{ key: "name", direction: "asc" }}
        />,
      );
      const nameHeader = screen.getByText("Name").closest("th");
      expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
    });

    it("shows aria-sort descending on active sorted column", () => {
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          sort={{ key: "name", direction: "desc" }}
        />,
      );
      const nameHeader = screen.getByText("Name").closest("th");
      expect(nameHeader).toHaveAttribute("aria-sort", "descending");
    });

    it("does not set aria-sort on non-sorted columns", () => {
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          sort={{ key: "name", direction: "asc" }}
        />,
      );
      const emailHeader = screen.getByText("Email").closest("th");
      expect(emailHeader).not.toHaveAttribute("aria-sort");
    });

    it("renders sort icons on sortable columns", () => {
      const { container } = render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          sort={{ key: "id", direction: "asc" }}
        />,
      );
      // sortable columns (ID, Name) should have SVG icons
      const headers = container.querySelectorAll("th");
      const idHeader = headers[0];
      const nameHeader = headers[1];
      const emailHeader = headers[2];

      expect(idHeader.querySelector("svg")).toBeInTheDocument();
      expect(nameHeader.querySelector("svg")).toBeInTheDocument();
      expect(emailHeader.querySelector("svg")).not.toBeInTheDocument();
    });
  });

  describe("column alignment", () => {
    it("applies text-center for center-aligned columns", () => {
      const columns: DataTableColumn<TestRow>[] = [
        { key: "id", label: "ID", align: "center" },
      ];
      render(<DataTable columns={columns} data={sampleData} />);
      const th = screen.getByText("ID").closest("th");
      expect(th).toHaveClass("text-center");
    });

    it("applies text-right for right-aligned columns", () => {
      const columns: DataTableColumn<TestRow>[] = [
        { key: "id", label: "ID", align: "right" },
      ];
      render(<DataTable columns={columns} data={sampleData} />);
      const th = screen.getByText("ID").closest("th");
      expect(th).toHaveClass("text-right");
    });

    it("applies text-left for left-aligned columns (default)", () => {
      const columns: DataTableColumn<TestRow>[] = [
        { key: "id", label: "ID", align: "left" },
      ];
      render(<DataTable columns={columns} data={sampleData} />);
      const th = screen.getByText("ID").closest("th");
      expect(th).toHaveClass("text-left");
    });

    it("defaults to text-left when no align is specified", () => {
      render(<DataTable columns={sampleColumns} data={sampleData} />);
      const th = screen.getByText("ID").closest("th");
      expect(th).toHaveClass("text-left");
    });
  });

  describe("pagination", () => {
    it("does not render pagination when not provided", () => {
      render(<DataTable columns={sampleColumns} data={sampleData} />);
      expect(
        screen.queryByLabelText("Page precedente"),
      ).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Page suivante")).not.toBeInTheDocument();
    });

    it("does not render pagination when totalPages <= 1", () => {
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          pagination={{
            page: 1,
            pageSize: 10,
            total: 3,
            onPageChange: vi.fn(),
          }}
        />,
      );
      // total=3, pageSize=10 => totalPages=1 => no pagination
      expect(
        screen.queryByLabelText("Page precedente"),
      ).not.toBeInTheDocument();
    });

    it("renders pagination with total count and page pills", () => {
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          pagination={{
            page: 1,
            pageSize: 2,
            total: 5,
            onPageChange: vi.fn(),
          }}
        />,
      );
      expect(screen.getByLabelText("Page precedente")).toBeInTheDocument();
      expect(screen.getByLabelText("Page suivante")).toBeInTheDocument();
      expect(screen.getByText(/sur 5/)).toBeInTheDocument();
      // Page pills: 1, 2, 3 (totalPages=3 <= 7 so all shown)
      expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
    });

    it("highlights active page pill with brand styling", () => {
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          pagination={{
            page: 2,
            pageSize: 2,
            total: 5,
            onPageChange: vi.fn(),
          }}
        />,
      );
      const activePill = screen.getByRole("button", { name: "2" });
      expect(activePill.className).toMatch(/brand|bg-\[var\(--brand\)\]/);
      expect(activePill).toHaveClass("text-white");
      const inactivePill = screen.getByRole("button", { name: "1" });
      expect(inactivePill.className).not.toMatch(/bg-\[var\(--brand\)\]/);
    });

    it("disables previous button on first page", () => {
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          pagination={{
            page: 1,
            pageSize: 2,
            total: 5,
            onPageChange: vi.fn(),
          }}
        />,
      );
      expect(screen.getByLabelText("Page precedente")).toBeDisabled();
    });

    it("disables next button on last page", () => {
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          pagination={{
            page: 3,
            pageSize: 2,
            total: 5,
            onPageChange: vi.fn(),
          }}
        />,
      );
      expect(screen.getByLabelText("Page suivante")).toBeDisabled();
    });

    it("calls onPageChange with page-1 when clicking previous arrow", () => {
      const onPageChange = vi.fn();
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          pagination={{
            page: 2,
            pageSize: 2,
            total: 5,
            onPageChange,
          }}
        />,
      );
      fireEvent.click(screen.getByLabelText("Page precedente"));
      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it("calls onPageChange with page+1 when clicking next arrow", () => {
      const onPageChange = vi.fn();
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          pagination={{
            page: 1,
            pageSize: 2,
            total: 5,
            onPageChange,
          }}
        />,
      );
      fireEvent.click(screen.getByLabelText("Page suivante"));
      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it("calls onPageChange when clicking a page pill", () => {
      const onPageChange = vi.fn();
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          pagination={{
            page: 1,
            pageSize: 2,
            total: 5,
            onPageChange,
          }}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "3" }));
      expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it("enables both arrow buttons on a middle page", () => {
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          pagination={{
            page: 2,
            pageSize: 2,
            total: 5,
            onPageChange: vi.fn(),
          }}
        />,
      );
      expect(screen.getByLabelText("Page precedente")).not.toBeDisabled();
      expect(screen.getByLabelText("Page suivante")).not.toBeDisabled();
    });

    it("shows ellipsis for many pages (current near start)", () => {
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          pagination={{
            page: 2,
            pageSize: 1,
            total: 20,
            onPageChange: vi.fn(),
          }}
        />,
      );
      // current=2, total=20 => [1,2,3,4,5,...,20]
      expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "5" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "20" })).toBeInTheDocument();
      expect(screen.getByText("...")).toBeInTheDocument();
    });

    it("shows ellipsis for many pages (current in middle)", () => {
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          pagination={{
            page: 10,
            pageSize: 1,
            total: 20,
            onPageChange: vi.fn(),
          }}
        />,
      );
      // current=10, total=20 => [1,...,9,10,11,...,20]
      expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "9" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "10" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "11" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "20" })).toBeInTheDocument();
      expect(screen.getAllByText("...")).toHaveLength(2);
    });

    it("shows ellipsis for many pages (current near end)", () => {
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          pagination={{
            page: 19,
            pageSize: 1,
            total: 20,
            onPageChange: vi.fn(),
          }}
        />,
      );
      // current=19, total=20 => [1,...,16,17,18,19,20]
      expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "16" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "20" })).toBeInTheDocument();
      expect(screen.getByText("...")).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("merges custom className on root element", () => {
      render(
        <DataTable
          data-testid="table"
          columns={sampleColumns}
          data={sampleData}
          className="my-custom"
        />,
      );
      expect(screen.getByTestId("table")).toHaveClass("my-custom");
    });

    it("does not apply zebra stripes and uses hover class", () => {
      const { container } = render(
        <DataTable columns={sampleColumns} data={sampleData} />,
      );
      const rows = container.querySelectorAll("tbody tr");
      expect(rows[0]).not.toHaveClass("bg-gray-50");
      expect(rows[1]).not.toHaveClass("bg-gray-50");
      expect(rows[0].className).toMatch(/hover:bg/);
    });

    it("adds cursor-pointer to sortable column headers", () => {
      render(<DataTable columns={sampleColumns} data={sampleData} />);
      const nameHeader = screen.getByText("Name").closest("th");
      expect(nameHeader).toHaveClass("cursor-pointer");
    });
  });

  describe("selection", () => {
    const getRowKey = (row: TestRow) => row.id;

    it("renders checkbox column when selection is provided", () => {
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          getRowKey={getRowKey}
          selection={{
            selectedKeys: new Set<string | number>(),
            onSelectionChange: vi.fn(),
          }}
        />,
      );
      // Header checkbox + 3 row checkboxes
      expect(screen.getByLabelText("Tout selectionner")).toBeInTheDocument();
      expect(screen.getByLabelText("Selectionner ligne 1")).toBeInTheDocument();
      expect(screen.getByLabelText("Selectionner ligne 2")).toBeInTheDocument();
      expect(screen.getByLabelText("Selectionner ligne 3")).toBeInTheDocument();
    });

    it("does not render checkboxes when selection is not provided", () => {
      render(<DataTable columns={sampleColumns} data={sampleData} />);
      expect(
        screen.queryByLabelText("Tout selectionner"),
      ).not.toBeInTheDocument();
    });

    it("calls onSelectionChange when clicking a row checkbox", () => {
      const onSelectionChange = vi.fn();
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          getRowKey={getRowKey}
          selection={{
            selectedKeys: new Set<string | number>(),
            onSelectionChange,
          }}
        />,
      );
      fireEvent.click(screen.getByLabelText("Selectionner ligne 1"));
      expect(onSelectionChange).toHaveBeenCalledWith(new Set([1]));
    });

    it("deselects a row when clicking already-selected row checkbox", () => {
      const onSelectionChange = vi.fn();
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          getRowKey={getRowKey}
          selection={{
            selectedKeys: new Set<string | number>([1, 2]),
            onSelectionChange,
          }}
        />,
      );
      fireEvent.click(screen.getByLabelText("Selectionner ligne 1"));
      expect(onSelectionChange).toHaveBeenCalledWith(new Set([2]));
    });

    it("selects all rows when clicking header checkbox (none selected)", () => {
      const onSelectionChange = vi.fn();
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          getRowKey={getRowKey}
          selection={{
            selectedKeys: new Set<string | number>(),
            onSelectionChange,
          }}
        />,
      );
      fireEvent.click(screen.getByLabelText("Tout selectionner"));
      expect(onSelectionChange).toHaveBeenCalledWith(new Set([1, 2, 3]));
    });

    it("deselects all rows when clicking header checkbox (all selected)", () => {
      const onSelectionChange = vi.fn();
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          getRowKey={getRowKey}
          selection={{
            selectedKeys: new Set<string | number>([1, 2, 3]),
            onSelectionChange,
          }}
        />,
      );
      fireEvent.click(screen.getByLabelText("Tout selectionner"));
      expect(onSelectionChange).toHaveBeenCalledWith(new Set());
    });

    it("shows indeterminate state when some rows are selected", () => {
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          getRowKey={getRowKey}
          selection={{
            selectedKeys: new Set<string | number>([1]),
            onSelectionChange: vi.fn(),
          }}
        />,
      );
      const headerCheckbox = screen.getByLabelText("Tout selectionner");
      expect(headerCheckbox).toHaveAttribute("aria-checked", "mixed");
    });

    it("applies selected row highlight class", () => {
      const { container } = render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          getRowKey={getRowKey}
          selection={{
            selectedKeys: new Set<string | number>([1]),
            onSelectionChange: vi.fn(),
          }}
        />,
      );
      const rows = container.querySelectorAll("tbody tr");
      expect(rows[0].className).toMatch(/brand-50|brand-100|--brand/);
      expect(rows[1].className).not.toMatch(/brand-50|--brand-50/);
    });

    it("empty state spans selection column too", () => {
      render(
        <DataTable
          columns={sampleColumns}
          data={[]}
          selection={{
            selectedKeys: new Set<string | number>(),
            onSelectionChange: vi.fn(),
          }}
        />,
      );
      const td = screen.getByText("Aucune donnee").closest("td");
      // 3 data columns + 1 checkbox column = 4
      expect(td).toHaveAttribute("colspan", "4");
    });

    it("single mode allows only one selected row", () => {
      const onSelectionChange = vi.fn();
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          getRowKey={getRowKey}
          selection={{
            selectedKeys: new Set<string | number>(),
            onSelectionChange,
            mode: "single",
          }}
        />,
      );
      // No header "select all" in single mode
      expect(
        screen.queryByLabelText("Tout selectionner"),
      ).not.toBeInTheDocument();
      // Row checkboxes still present
      fireEvent.click(screen.getByLabelText("Selectionner ligne 1"));
      expect(onSelectionChange).toHaveBeenCalledWith(new Set([1]));
    });

    it("single mode deselects previously selected row", () => {
      const onSelectionChange = vi.fn();
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          getRowKey={getRowKey}
          selection={{
            selectedKeys: new Set<string | number>([1]),
            onSelectionChange,
            mode: "single",
          }}
        />,
      );
      // Click same row: deselects
      fireEvent.click(screen.getByLabelText("Selectionner ligne 1"));
      expect(onSelectionChange).toHaveBeenCalledWith(new Set());
    });

    it("single mode replaces selection when clicking different row", () => {
      const onSelectionChange = vi.fn();
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          getRowKey={getRowKey}
          selection={{
            selectedKeys: new Set<string | number>([1]),
            onSelectionChange,
            mode: "single",
          }}
        />,
      );
      fireEvent.click(screen.getByLabelText("Selectionner ligne 2"));
      expect(onSelectionChange).toHaveBeenCalledWith(new Set([2]));
    });

    it("single mode renders empty th in header (no checkbox)", () => {
      const { container } = render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          getRowKey={getRowKey}
          selection={{
            selectedKeys: new Set<string | number>(),
            onSelectionChange: vi.fn(),
            mode: "single",
          }}
        />,
      );
      const headers = container.querySelectorAll("thead th");
      // First th is empty spacer, followed by 3 data columns
      expect(headers).toHaveLength(4);
      expect(headers[0].textContent).toBe("");
    });
  });

  describe("sticky header", () => {
    it("does not add sticky class by default", () => {
      const { container } = render(
        <DataTable columns={sampleColumns} data={sampleData} />,
      );
      const thead = container.querySelector("thead");
      expect(thead).not.toHaveClass("sticky");
    });

    it("adds sticky class and shadow when stickyHeader is true", () => {
      const { container } = render(
        <DataTable columns={sampleColumns} data={sampleData} stickyHeader />,
      );
      const thead = container.querySelector("thead");
      expect(thead).toHaveClass("sticky");
      expect(thead).toHaveClass("top-0");
      expect(thead).toHaveClass("z-10");
      expect(thead?.className).toMatch(/shadow/);
    });
  });

  describe("resizable columns", () => {
    const resizableColumns: DataTableColumn<TestRow>[] = [
      { key: "id", label: "ID", resizable: true, minWidth: 80, maxWidth: 200 },
      { key: "name", label: "Name", resizable: true },
      { key: "email", label: "Email" },
    ];

    it("does not render resize handles by default", () => {
      render(<DataTable columns={sampleColumns} data={sampleData} />);
      expect(screen.queryByRole("separator")).not.toBeInTheDocument();
    });

    it("renders resize handles only on resizable columns", () => {
      render(<DataTable columns={resizableColumns} data={sampleData} />);
      const separators = screen.getAllByRole("separator");
      // Only ID and Name are resizable, not Email
      expect(separators).toHaveLength(2);
    });

    it("sets table-layout fixed when any column is resizable", () => {
      const { container } = render(
        <DataTable columns={resizableColumns} data={sampleData} />,
      );
      const table = container.querySelector("table");
      expect(table).toHaveStyle({ tableLayout: "fixed" });
    });

    it("renders colgroup when any column is resizable", () => {
      const { container } = render(
        <DataTable columns={resizableColumns} data={sampleData} />,
      );
      const colgroup = container.querySelector("colgroup");
      expect(colgroup).toBeInTheDocument();
      const cols = colgroup!.querySelectorAll("col");
      expect(cols).toHaveLength(resizableColumns.length);
    });

    it("updates column width on resize drag", () => {
      const { container } = render(
        <DataTable columns={resizableColumns} data={sampleData} />,
      );
      const handle = screen.getAllByRole("separator")[0];
      const th = handle.parentElement!;
      Object.defineProperty(th, "offsetWidth", { value: 150 });

      fireEvent.mouseDown(handle, { clientX: 200 });
      fireEvent.mouseMove(document, { clientX: 250 });
      fireEvent.mouseUp(document);

      // Column should now have width = min(maxWidth=200, 150 + 50) = 200
      const colgroup = container.querySelector("colgroup");
      const firstCol = colgroup!.querySelectorAll("col")[0];
      expect(firstCol).toHaveStyle({ width: "200px" });
    });

    it("respects minWidth during resize", () => {
      const { container } = render(
        <DataTable columns={resizableColumns} data={sampleData} />,
      );
      const handle = screen.getAllByRole("separator")[0];
      const th = handle.parentElement!;
      Object.defineProperty(th, "offsetWidth", { value: 150 });

      fireEvent.mouseDown(handle, { clientX: 200 });
      // Try to shrink below minWidth=80
      fireEvent.mouseMove(document, { clientX: 100 });
      fireEvent.mouseUp(document);

      const colgroup = container.querySelector("colgroup");
      const firstCol = colgroup!.querySelectorAll("col")[0];
      // max(80, 150 - 100) = max(80, 50) = 80
      expect(firstCol).toHaveStyle({ width: "80px" });
    });

    it("respects maxWidth during resize", () => {
      const { container } = render(
        <DataTable columns={resizableColumns} data={sampleData} />,
      );
      const handle = screen.getAllByRole("separator")[0];
      const th = handle.parentElement!;
      Object.defineProperty(th, "offsetWidth", { value: 150 });

      fireEvent.mouseDown(handle, { clientX: 200 });
      // Try to expand beyond maxWidth=200
      fireEvent.mouseMove(document, { clientX: 400 });
      fireEvent.mouseUp(document);

      const colgroup = container.querySelector("colgroup");
      const firstCol = colgroup!.querySelectorAll("col")[0];
      // min(200, 150 + 200) = 200
      expect(firstCol).toHaveStyle({ width: "200px" });
    });
  });

  describe("toolbar", () => {
    it("renders toolbar above the table", () => {
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          toolbar={<div data-testid="my-toolbar">Toolbar Content</div>}
        />,
      );
      expect(screen.getByTestId("my-toolbar")).toBeInTheDocument();
      expect(screen.getByText("Toolbar Content")).toBeInTheDocument();
    });

    it("toolbar appears before the table scroll container", () => {
      const { container } = render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          toolbar={<div data-testid="my-toolbar">Toolbar</div>}
        />,
      );
      const root = container.firstElementChild!;
      const toolbar = root.querySelector("[data-testid='my-toolbar']");
      const scrollDiv = root.querySelector(".overflow-x-auto");
      // Toolbar should be a preceding sibling of the scroll container
      expect(toolbar).toBeTruthy();
      expect(scrollDiv).toBeTruthy();
      expect(toolbar!.compareDocumentPosition(scrollDiv!)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });

    it("does not render toolbar when not provided", () => {
      const { container } = render(
        <DataTable columns={sampleColumns} data={sampleData} />,
      );
      const root = container.firstElementChild!;
      // First child should be the overflow-x-auto div directly
      expect(root.firstElementChild).toHaveClass("overflow-x-auto");
    });
  });

  describe("onRowClick", () => {
    it("calls onRowClick when clicking a row", () => {
      const onRowClick = vi.fn();
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          onRowClick={onRowClick}
        />,
      );
      fireEvent.click(screen.getByText("Alice"));
      expect(onRowClick).toHaveBeenCalledWith(sampleData[0], 0);
    });

    it("adds cursor-pointer to rows when onRowClick is provided", () => {
      const { container } = render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          onRowClick={vi.fn()}
        />,
      );
      const rows = container.querySelectorAll("tbody tr");
      expect(rows[0]).toHaveClass("cursor-pointer");
    });

    it("does not add cursor-pointer when onRowClick is not provided", () => {
      const { container } = render(
        <DataTable columns={sampleColumns} data={sampleData} />,
      );
      const rows = container.querySelectorAll("tbody tr");
      expect(rows[0]).not.toHaveClass("cursor-pointer");
    });
  });

  describe("backward compatibility", () => {
    it("renders identically without any new props", () => {
      const { container } = render(
        <DataTable columns={sampleColumns} data={sampleData} />,
      );
      // No checkboxes, no toolbar, no resize handles, no sticky
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
      expect(screen.queryByRole("separator")).not.toBeInTheDocument();
      const thead = container.querySelector("thead");
      expect(thead).not.toHaveClass("sticky");
      const table = container.querySelector("table");
      expect(table?.style.tableLayout).toBe("");
      expect(container.querySelector("colgroup")).not.toBeInTheDocument();
    });
  });
});
