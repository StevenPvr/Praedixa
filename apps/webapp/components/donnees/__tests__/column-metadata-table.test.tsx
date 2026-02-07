import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ColumnMetadataTable } from "../column-metadata-table";
import type { DatasetColumn } from "@praedixa/shared-types";

vi.mock("@praedixa/ui", () => ({
  DataTable: ({
    data,
    columns,
    emptyMessage,
  }: {
    data: DatasetColumn[];
    columns: {
      key: string;
      label: string;
      render?: (row: DatasetColumn) => string;
    }[];
    emptyMessage?: string;
  }) => (
    <div data-testid="data-table">
      {data.length === 0 ? (
        <p>{emptyMessage}</p>
      ) : (
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx}>
                {columns.map((col) => (
                  <td key={col.key} data-col={col.key}>
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  ),
}));

function makeColumn(overrides: Partial<DatasetColumn> = {}): DatasetColumn {
  return {
    id: "col-001",
    datasetId: "ds-001",
    name: "nb_employes",
    dtype: "float",
    role: "feature",
    nullable: true,
    rulesOverride: null,
    ordinalPosition: 1,
    createdAt: "2026-02-05T10:00:00Z",
    updatedAt: "2026-02-05T10:00:00Z",
    ...overrides,
  };
}

describe("ColumnMetadataTable", () => {
  it("renders a data table", () => {
    render(<ColumnMetadataTable data={[makeColumn()]} />);
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });

  it("renders column headers: #, Nom, Type, Role, Nullable", () => {
    render(<ColumnMetadataTable data={[makeColumn()]} />);
    expect(screen.getByText("#")).toBeInTheDocument();
    expect(screen.getByText("Nom")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Nullable")).toBeInTheDocument();
  });

  it("renders column name from data", () => {
    render(
      <ColumnMetadataTable data={[makeColumn({ name: "temperature_ext" })]} />,
    );
    expect(screen.getByText("temperature_ext")).toBeInTheDocument();
  });

  it("renders French dtype label for float", () => {
    render(<ColumnMetadataTable data={[makeColumn({ dtype: "float" })]} />);
    expect(screen.getByText("Decimal")).toBeInTheDocument();
  });

  it("renders French dtype label for integer", () => {
    render(<ColumnMetadataTable data={[makeColumn({ dtype: "integer" })]} />);
    expect(screen.getByText("Entier")).toBeInTheDocument();
  });

  it("renders French dtype label for date", () => {
    render(<ColumnMetadataTable data={[makeColumn({ dtype: "date" })]} />);
    expect(screen.getByText("Date")).toBeInTheDocument();
  });

  it("renders French dtype label for category", () => {
    render(<ColumnMetadataTable data={[makeColumn({ dtype: "category" })]} />);
    expect(screen.getByText("Categorie")).toBeInTheDocument();
  });

  it("renders French dtype label for boolean", () => {
    render(<ColumnMetadataTable data={[makeColumn({ dtype: "boolean" })]} />);
    expect(screen.getByText("Booleen")).toBeInTheDocument();
  });

  it("renders French dtype label for text", () => {
    render(<ColumnMetadataTable data={[makeColumn({ dtype: "text" })]} />);
    expect(screen.getByText("Texte")).toBeInTheDocument();
  });

  it("renders French role label for target", () => {
    render(<ColumnMetadataTable data={[makeColumn({ role: "target" })]} />);
    expect(screen.getByText("Cible")).toBeInTheDocument();
  });

  it("renders French role label for feature", () => {
    render(<ColumnMetadataTable data={[makeColumn({ role: "feature" })]} />);
    expect(screen.getByText("Feature")).toBeInTheDocument();
  });

  it("renders French role label for temporal_index", () => {
    render(
      <ColumnMetadataTable data={[makeColumn({ role: "temporal_index" })]} />,
    );
    expect(screen.getByText("Index temporel")).toBeInTheDocument();
  });

  it("renders French role label for group_by", () => {
    render(<ColumnMetadataTable data={[makeColumn({ role: "group_by" })]} />);
    expect(screen.getByText("Regroupement")).toBeInTheDocument();
  });

  it("renders French role label for id", () => {
    render(<ColumnMetadataTable data={[makeColumn({ role: "id" })]} />);
    expect(screen.getByText("Identifiant")).toBeInTheDocument();
  });

  it("renders French role label for meta", () => {
    render(<ColumnMetadataTable data={[makeColumn({ role: "meta" })]} />);
    expect(screen.getByText("Metadonnee")).toBeInTheDocument();
  });

  it("renders 'Oui' for nullable true", () => {
    render(<ColumnMetadataTable data={[makeColumn({ nullable: true })]} />);
    expect(screen.getByText("Oui")).toBeInTheDocument();
  });

  it("renders 'Non' for nullable false", () => {
    render(<ColumnMetadataTable data={[makeColumn({ nullable: false })]} />);
    expect(screen.getByText("Non")).toBeInTheDocument();
  });

  it("renders ordinal position", () => {
    render(<ColumnMetadataTable data={[makeColumn({ ordinalPosition: 3 })]} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders empty message when no columns", () => {
    render(<ColumnMetadataTable data={[]} />);
    expect(screen.getByText("Aucune colonne definie")).toBeInTheDocument();
  });

  it("falls back to raw dtype when not in DTYPE_LABELS", () => {
    render(
      <ColumnMetadataTable
        data={[makeColumn({ dtype: "timestamp" as never })]}
      />,
    );
    expect(screen.getByText("timestamp")).toBeInTheDocument();
  });

  it("falls back to raw role when not in ROLE_LABELS", () => {
    render(
      <ColumnMetadataTable
        data={[makeColumn({ role: "custom_role" as never })]}
      />,
    );
    expect(screen.getByText("custom_role")).toBeInTheDocument();
  });

  it("renders multiple columns", () => {
    render(
      <ColumnMetadataTable
        data={[
          makeColumn({
            name: "date",
            ordinalPosition: 1,
            dtype: "date",
            role: "temporal_index",
          }),
          makeColumn({
            name: "volume",
            ordinalPosition: 2,
            dtype: "float",
            role: "target",
          }),
        ]}
      />,
    );
    expect(screen.getByText("date")).toBeInTheDocument();
    expect(screen.getByText("volume")).toBeInTheDocument();
  });
});
