import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilterBar } from "../filter-bar";

describe("FilterBar", () => {
  const defaultProps = {
    dimension: "human" as const,
    onDimensionChange: vi.fn(),
  };

  it("renders the Dimension label text", () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByText("Dimension")).toBeInTheDocument();
  });

  it("renders the Humaine button", () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByRole("button", { name: "Humaine" })).toBeInTheDocument();
  });

  it("renders the Marchandise button", () => {
    render(<FilterBar {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: "Marchandise" }),
    ).toBeInTheDocument();
  });

  it("applies active class to Humaine when dimension is human", () => {
    render(<FilterBar {...defaultProps} dimension="human" />);
    const btn = screen.getByRole("button", { name: "Humaine" });
    expect(btn.className).toContain("bg-white");
    expect(btn.className).toContain("text-charcoal");
    expect(btn.className).toContain("shadow-sm");
  });

  it("applies active class to Marchandise when dimension is merchandise", () => {
    render(<FilterBar {...defaultProps} dimension="merchandise" />);
    const btn = screen.getByRole("button", { name: "Marchandise" });
    expect(btn.className).toContain("bg-white");
    expect(btn.className).toContain("text-charcoal");
    expect(btn.className).toContain("shadow-sm");
  });

  it("does not apply active class to Marchandise when dimension is human", () => {
    render(<FilterBar {...defaultProps} dimension="human" />);
    const btn = screen.getByRole("button", { name: "Marchandise" });
    expect(btn.className).not.toContain("bg-white");
    expect(btn.className).toContain("text-gray-500");
  });

  it("does not apply active class to Humaine when dimension is merchandise", () => {
    render(<FilterBar {...defaultProps} dimension="merchandise" />);
    const btn = screen.getByRole("button", { name: "Humaine" });
    expect(btn.className).not.toContain("bg-white");
    expect(btn.className).toContain("text-gray-500");
  });

  it("calls onDimensionChange with 'human' when clicking Humaine", () => {
    const onDimensionChange = vi.fn();
    render(
      <FilterBar
        dimension="merchandise"
        onDimensionChange={onDimensionChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Humaine" }));
    expect(onDimensionChange).toHaveBeenCalledTimes(1);
    expect(onDimensionChange).toHaveBeenCalledWith("human");
  });

  it("calls onDimensionChange with 'merchandise' when clicking Marchandise", () => {
    const onDimensionChange = vi.fn();
    render(
      <FilterBar dimension="human" onDimensionChange={onDimensionChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Marchandise" }));
    expect(onDimensionChange).toHaveBeenCalledTimes(1);
    expect(onDimensionChange).toHaveBeenCalledWith("merchandise");
  });
});
