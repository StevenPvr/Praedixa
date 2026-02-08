import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createRef } from "react";
import { ParetoChart } from "../components/pareto-chart";
import type { ParetoPoint } from "../components/pareto-chart";

const points: ParetoPoint[] = [
  {
    id: "a",
    label: "Option A",
    cost: 100,
    service: 80,
    isParetoOptimal: true,
    isRecommended: false,
  },
  {
    id: "b",
    label: "Option B",
    cost: 200,
    service: 95,
    isParetoOptimal: true,
    isRecommended: true,
  },
  {
    id: "c",
    label: "Option C",
    cost: 150,
    service: 70,
    isParetoOptimal: false,
    isRecommended: false,
  },
];

describe("ParetoChart", () => {
  it("renders without crashing", () => {
    render(<ParetoChart points={points} />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("renders all points", () => {
    render(<ParetoChart points={points} />);
    expect(screen.getByTestId("pareto-point-a")).toBeInTheDocument();
    expect(screen.getByTestId("pareto-point-b")).toBeInTheDocument();
    expect(screen.getByTestId("pareto-point-c")).toBeInTheDocument();
  });

  it("renders frontier line for optimal points", () => {
    render(<ParetoChart points={points} />);
    expect(screen.getByTestId("frontier-line")).toBeInTheDocument();
  });

  it("does not render frontier for single optimal point", () => {
    const singleOptimal: ParetoPoint[] = [
      {
        id: "a",
        label: "A",
        cost: 100,
        service: 80,
        isParetoOptimal: true,
        isRecommended: false,
      },
    ];
    render(<ParetoChart points={singleOptimal} />);
    expect(screen.queryByTestId("frontier-line")).not.toBeInTheDocument();
  });

  it("shows tooltip on hover", () => {
    render(<ParetoChart points={points} />);
    const pointEl = screen.getByTestId("pareto-point-a");
    fireEvent.mouseEnter(pointEl);
    expect(screen.getByText("Option A")).toBeInTheDocument();
  });

  it("hides tooltip on mouse leave", () => {
    render(<ParetoChart points={points} />);
    const pointEl = screen.getByTestId("pareto-point-a");
    fireEvent.mouseEnter(pointEl);
    expect(screen.getByText("Option A")).toBeInTheDocument();
    fireEvent.mouseLeave(pointEl);
    // The label text should be gone (it only appears in tooltip)
    expect(screen.queryByText("Option A")).not.toBeInTheDocument();
  });

  it("calls onPointClick when a point is clicked", () => {
    const onClick = vi.fn();
    render(<ParetoChart points={points} onPointClick={onClick} />);
    const pointEl = screen.getByTestId("pareto-point-b");
    fireEvent.click(pointEl);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith(points[1]);
  });

  it("renders empty state when no points", () => {
    render(<ParetoChart points={[]} />);
    expect(screen.getByText("Aucune donnee")).toBeInTheDocument();
  });

  it("merges custom className", () => {
    render(<ParetoChart points={points} className="my-custom" />);
    expect(screen.getByRole("img")).toHaveClass("my-custom");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ParetoChart ref={ref} points={points} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("renders axis labels", () => {
    render(<ParetoChart points={points} />);
    expect(screen.getByText("Cout")).toBeInTheDocument();
    expect(screen.getByText("Service (%)")).toBeInTheDocument();
  });

  it("has aria-label on container", () => {
    render(<ParetoChart points={points} />);
    expect(screen.getByLabelText("Pareto chart")).toBeInTheDocument();
  });
});
