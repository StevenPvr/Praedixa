import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { WaterfallChart } from "../components/waterfall-chart";
import type { WaterfallItem } from "../components/waterfall-chart";

const items: WaterfallItem[] = [
  { label: "BAU", value: 1000, type: "total" },
  { label: "Optimisation", value: -200, type: "negative" },
  { label: "Croissance", value: 150, type: "positive" },
  { label: "Final", value: 950, type: "total" },
];

describe("WaterfallChart", () => {
  it("renders without crashing", () => {
    render(<WaterfallChart items={items} />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("renders all item labels", () => {
    render(<WaterfallChart items={items} />);
    expect(screen.getByText("BAU")).toBeInTheDocument();
    expect(screen.getByText("Optimisation")).toBeInTheDocument();
    expect(screen.getByText("Croissance")).toBeInTheDocument();
    expect(screen.getByText("Final")).toBeInTheDocument();
  });

  it("renders formatted values", () => {
    render(<WaterfallChart items={items} formatValue={(v) => `${v} EUR`} />);
    expect(screen.getByText("1000 EUR")).toBeInTheDocument();
    expect(screen.getByText("-200 EUR")).toBeInTheDocument();
  });

  it("renders default value format (string)", () => {
    render(<WaterfallChart items={items} />);
    expect(screen.getByText("1000")).toBeInTheDocument();
    expect(screen.getByText("-200")).toBeInTheDocument();
  });

  it("renders SVG bars for each item", () => {
    render(<WaterfallChart items={items} />);
    for (let i = 0; i < items.length; i++) {
      expect(screen.getByTestId(`waterfall-bar-${i}`)).toBeInTheDocument();
    }
  });

  it("renders empty state when no items", () => {
    render(<WaterfallChart items={[]} />);
    expect(screen.getByText("Aucune donnee")).toBeInTheDocument();
  });

  it("merges custom className", () => {
    render(<WaterfallChart items={items} className="my-custom" />);
    expect(screen.getByRole("img")).toHaveClass("my-custom");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<WaterfallChart ref={ref} items={items} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("applies green fill for positive bars", () => {
    render(<WaterfallChart items={items} />);
    // Croissance is index 2 (positive)
    const positiveBar = screen.getByTestId("waterfall-bar-2");
    expect(positiveBar.getAttribute("fill")).toContain("oklch(0.72");
  });

  it("applies red fill for negative bars", () => {
    render(<WaterfallChart items={items} />);
    // Optimisation is index 1 (negative)
    const negativeBar = screen.getByTestId("waterfall-bar-1");
    expect(negativeBar.getAttribute("fill")).toContain("oklch(0.60");
  });

  it("applies neutral fill for total bars", () => {
    render(<WaterfallChart items={items} />);
    // BAU is index 0 (total)
    const totalBar = screen.getByTestId("waterfall-bar-0");
    expect(totalBar.getAttribute("fill")).toContain("oklch(0.65");
  });

  it("has aria-label on container", () => {
    render(<WaterfallChart items={items} />);
    expect(screen.getByLabelText("Waterfall chart")).toBeInTheDocument();
  });

  it("handles single item", () => {
    const singleItem: WaterfallItem[] = [
      { label: "Total", value: 500, type: "total" },
    ];
    render(<WaterfallChart items={singleItem} />);
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
  });
});
