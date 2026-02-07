import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DatasetTable } from "../dataset-table";
import type { DatasetDataRow } from "@praedixa/shared-types";

// Track what DataTable receives
const mockDataTableProps = vi.fn();

vi.mock("@praedixa/ui", () => ({
  DataTable: (props: {
    columns: {
      key: string;
      label: string;
      render?: (row: DatasetDataRow) => React.ReactNode;
    }[];
    data: DatasetDataRow[];
    emptyMessage?: string;
    pagination?: {
      page: number;
      pageSize: number;
      total: number;
      onPageChange: (p: number) => void;
    };
  }) => {
    mockDataTableProps(props);
    return (
      <div data-testid="data-table">
        {props.data.length === 0 ? (
          <p>{props.emptyMessage}</p>
        ) : (
          <table>
            <thead>
              <tr>
                {props.columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {props.data.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {props.columns.map((col) => (
                    <td key={col.key} data-col={col.key}>
                      {col.render
                        ? col.render(row)
                        : String(row[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  },
}));

vi.mock("../pii-mask-indicator", () => ({
  PiiMaskIndicator: () => <span data-testid="pii-mask">***masked***</span>,
}));

const defaultProps = {
  columns: ["date", "departement", "nb_employes"],
  rows: [
    { date: "2026-02-01", departement: "Logistique", nb_employes: 42 },
    { date: "2026-02-02", departement: "Transport", nb_employes: 35 },
  ] as DatasetDataRow[],
  maskedColumns: [] as string[],
  total: 2,
  page: 1,
  pageSize: 25,
  onPageChange: vi.fn(),
};

describe("DatasetTable", () => {
  it("renders a DataTable", () => {
    render(<DatasetTable {...defaultProps} />);
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });

  it("renders column headers from column names", () => {
    render(<DatasetTable {...defaultProps} />);
    expect(screen.getByText("date")).toBeInTheDocument();
    expect(screen.getByText("departement")).toBeInTheDocument();
    expect(screen.getByText("nb_employes")).toBeInTheDocument();
  });

  it("renders data values", () => {
    render(<DatasetTable {...defaultProps} />);
    expect(screen.getByText("Logistique")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders PiiMaskIndicator for masked columns", () => {
    render(<DatasetTable {...defaultProps} maskedColumns={["departement"]} />);
    // All rows for the masked column should show the PII mask
    const masks = screen.getAllByTestId("pii-mask");
    expect(masks).toHaveLength(2); // one per row
  });

  it("does not render PiiMaskIndicator for unmasked columns", () => {
    render(<DatasetTable {...defaultProps} maskedColumns={[]} />);
    expect(screen.queryByTestId("pii-mask")).not.toBeInTheDocument();
  });

  it("renders dash for null values in unmasked columns", () => {
    render(
      <DatasetTable
        {...defaultProps}
        rows={[{ date: "2026-02-01", departement: null, nb_employes: 42 }]}
        maskedColumns={[]}
      />,
    );
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("renders empty message when no rows", () => {
    render(<DatasetTable {...defaultProps} rows={[]} total={0} />);
    expect(
      screen.getByText("Aucune donnee dans ce dataset"),
    ).toBeInTheDocument();
  });

  it("passes pagination props to DataTable", () => {
    const onPageChange = vi.fn();
    render(
      <DatasetTable
        {...defaultProps}
        total={100}
        page={2}
        pageSize={25}
        onPageChange={onPageChange}
      />,
    );

    // Verify pagination was passed to DataTable
    const lastCall =
      mockDataTableProps.mock.calls[
        mockDataTableProps.mock.calls.length - 1
      ][0];
    expect(lastCall.pagination).toEqual({
      page: 2,
      pageSize: 25,
      total: 100,
      onPageChange,
    });
  });

  it("wraps in overflow-x-auto container", () => {
    const { container } = render(<DatasetTable {...defaultProps} />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain("overflow-x-auto");
  });

  it("renders columns as non-sortable", () => {
    render(<DatasetTable {...defaultProps} />);

    const lastCall =
      mockDataTableProps.mock.calls[
        mockDataTableProps.mock.calls.length - 1
      ][0];
    lastCall.columns.forEach((col: { sortable: boolean }) => {
      expect(col.sortable).toBe(false);
    });
  });
});
