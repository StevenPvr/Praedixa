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
      expect(screen.queryByText("Precedent")).not.toBeInTheDocument();
      expect(screen.queryByText("Suivant")).not.toBeInTheDocument();
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
      expect(screen.queryByText("Precedent")).not.toBeInTheDocument();
    });

    it("renders pagination when totalPages > 1", () => {
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
      expect(screen.getByText("Precedent")).toBeInTheDocument();
      expect(screen.getByText("Suivant")).toBeInTheDocument();
      expect(screen.getByText(/Page 1 sur 3/)).toBeInTheDocument();
      expect(screen.getByText(/5/)).toBeInTheDocument();
    });

    it("disables Precedent button on first page", () => {
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
      expect(screen.getByText("Precedent")).toBeDisabled();
    });

    it("disables Suivant button on last page", () => {
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
      expect(screen.getByText("Suivant")).toBeDisabled();
    });

    it("calls onPageChange with page-1 when clicking Precedent", () => {
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
      fireEvent.click(screen.getByText("Precedent"));
      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it("calls onPageChange with page+1 when clicking Suivant", () => {
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
      fireEvent.click(screen.getByText("Suivant"));
      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it("enables both buttons on a middle page", () => {
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
      expect(screen.getByText("Precedent")).not.toBeDisabled();
      expect(screen.getByText("Suivant")).not.toBeDisabled();
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

    it("applies alternating row background", () => {
      const { container } = render(
        <DataTable columns={sampleColumns} data={sampleData} />,
      );
      const rows = container.querySelectorAll("tbody tr");
      // Second row (index 1) should have bg-gray-50
      expect(rows[1]).toHaveClass("bg-gray-50");
      // First row (index 0) should NOT have bg-gray-50
      expect(rows[0]).not.toHaveClass("bg-gray-50");
    });

    it("adds cursor-pointer to sortable column headers", () => {
      render(<DataTable columns={sampleColumns} data={sampleData} />);
      const nameHeader = screen.getByText("Name").closest("th");
      expect(nameHeader).toHaveClass("cursor-pointer");
    });
  });
});
