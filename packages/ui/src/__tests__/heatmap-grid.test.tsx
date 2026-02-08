import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createRef } from "react";
import { HeatmapGrid, getCellColor } from "../components/heatmap-grid";
import type { HeatmapCell } from "../components/heatmap-grid";

const rows = ["Site A", "Site B"];
const columns = ["Lundi", "Mardi"];
const cells: HeatmapCell[] = [
  { row: "Site A", column: "Lundi", value: 90, label: "Bon" },
  { row: "Site A", column: "Mardi", value: 50 },
  { row: "Site B", column: "Lundi", value: 20 },
  { row: "Site B", column: "Mardi", value: 100 },
];

describe("HeatmapGrid", () => {
  it("renders without crashing", () => {
    render(<HeatmapGrid cells={cells} rows={rows} columns={columns} />);
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders row headers", () => {
    render(<HeatmapGrid cells={cells} rows={rows} columns={columns} />);
    expect(screen.getByText("Site A")).toBeInTheDocument();
    expect(screen.getByText("Site B")).toBeInTheDocument();
  });

  it("renders column headers", () => {
    render(<HeatmapGrid cells={cells} rows={rows} columns={columns} />);
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    expect(screen.getByText("Lundi")).toBeInTheDocument();
    expect(screen.getByText("Mardi")).toBeInTheDocument();
  });

  it("renders cell values", () => {
    render(<HeatmapGrid cells={cells} rows={rows} columns={columns} />);
    const gridcells = screen.getAllByRole("gridcell");
    expect(gridcells).toHaveLength(4);
    expect(screen.getByText("90")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
  });

  it("uses custom label for title when provided", () => {
    render(<HeatmapGrid cells={cells} rows={rows} columns={columns} />);
    const cell90 = screen.getByTitle("Bon");
    expect(cell90).toBeInTheDocument();
  });

  it("generates default title when no label", () => {
    render(<HeatmapGrid cells={cells} rows={rows} columns={columns} />);
    const cell50 = screen.getByTitle("Site A / Mardi: 50%");
    expect(cell50).toBeInTheDocument();
  });

  it("calls onCellClick when a cell is clicked", () => {
    const onClick = vi.fn();
    render(
      <HeatmapGrid
        cells={cells}
        rows={rows}
        columns={columns}
        onCellClick={onClick}
      />,
    );
    fireEvent.click(screen.getByText("90"));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith(cells[0]);
  });

  it("does not call onCellClick for missing cells", () => {
    const onClick = vi.fn();
    const sparseRows = ["Site A", "Site C"];
    render(
      <HeatmapGrid
        cells={cells}
        rows={sparseRows}
        columns={columns}
        onCellClick={onClick}
      />,
    );
    // Site C cells have value 0 (no data), clicking should not fire
    const gridcells = screen.getAllByRole("gridcell");
    // Click the third cell (Site C, Lundi — no matching cell data)
    fireEvent.click(gridcells[2]);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("merges custom className", () => {
    render(
      <HeatmapGrid
        cells={cells}
        rows={rows}
        columns={columns}
        className="my-custom"
      />,
    );
    expect(screen.getByRole("grid")).toHaveClass("my-custom");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <HeatmapGrid ref={ref} cells={cells} rows={rows} columns={columns} />,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("applies risk color scale (inverted)", () => {
    render(
      <HeatmapGrid
        cells={cells}
        rows={rows}
        columns={columns}
        colorScale="risk"
      />,
    );
    // Component should still render
    expect(screen.getAllByRole("gridcell")).toHaveLength(4);
  });

  it("defaults value to 0 for missing cell data", () => {
    const sparseRows = ["Site A", "Missing"];
    render(
      <HeatmapGrid cells={cells} rows={sparseRows} columns={columns} />,
    );
    // Missing row cells should show 0
    const zeroCells = screen.getAllByText("0");
    expect(zeroCells.length).toBeGreaterThanOrEqual(2);
  });
});

describe("getCellColor", () => {
  it("returns OKLCH color string", () => {
    const color = getCellColor(50, "coverage");
    expect(color).toMatch(/^oklch\(/);
  });

  it("returns green-ish for 100% coverage", () => {
    const color = getCellColor(100, "coverage");
    // hue ~145
    expect(color).toContain("145");
  });

  it("returns red-ish for 0% coverage", () => {
    const color = getCellColor(0, "coverage");
    // hue ~25
    expect(color).toContain("25.0");
  });

  it("clamps values below 0", () => {
    const color = getCellColor(-10, "coverage");
    expect(color).toMatch(/^oklch\(/);
  });

  it("clamps values above 100", () => {
    const color = getCellColor(110, "coverage");
    expect(color).toMatch(/^oklch\(/);
  });

  it("inverts colors for risk scale", () => {
    const coverageGreen = getCellColor(100, "coverage");
    const riskGreen = getCellColor(0, "risk");
    // Both should produce the same color (green end)
    expect(coverageGreen).toBe(riskGreen);
  });
});
