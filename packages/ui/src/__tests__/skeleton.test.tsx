import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import {
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  SkeletonChart,
} from "../components/skeleton";

describe("Skeleton", () => {
  it("renders a div with pulse animation", () => {
    render(<Skeleton data-testid="sk" />);
    const el = screen.getByTestId("sk");
    expect(el).toHaveClass("animate-pulse", "bg-gray-200");
  });

  it("applies custom width class", () => {
    render(<Skeleton data-testid="sk" width="w-32" />);
    expect(screen.getByTestId("sk")).toHaveClass("w-32");
  });

  it("merges custom className", () => {
    render(<Skeleton data-testid="sk" className="h-6" />);
    expect(screen.getByTestId("sk")).toHaveClass("h-6", "animate-pulse");
  });

  it("is aria-hidden", () => {
    render(<Skeleton data-testid="sk" />);
    expect(screen.getByTestId("sk")).toHaveAttribute("aria-hidden", "true");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Skeleton ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe("SkeletonCard", () => {
  it("renders with aria-busy", () => {
    render(<SkeletonCard data-testid="card" />);
    const el = screen.getByTestId("card");
    expect(el).toHaveAttribute("aria-busy", "true");
  });

  it("has role=status", () => {
    render(<SkeletonCard />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("has loading aria-label", () => {
    render(<SkeletonCard />);
    expect(screen.getByLabelText("Chargement")).toBeInTheDocument();
  });

  it("renders card structure (border + shadow)", () => {
    render(<SkeletonCard data-testid="card" />);
    expect(screen.getByTestId("card")).toHaveClass(
      "rounded-card",
      "border-gray-200",
      "shadow-card",
    );
  });

  it("merges custom className", () => {
    render(<SkeletonCard data-testid="card" className="col-span-2" />);
    expect(screen.getByTestId("card")).toHaveClass("col-span-2");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<SkeletonCard ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe("SkeletonTable", () => {
  it("renders with aria-busy", () => {
    render(<SkeletonTable data-testid="table" />);
    expect(screen.getByTestId("table")).toHaveAttribute("aria-busy", "true");
  });

  it("renders default 5 rows", () => {
    const { container } = render(<SkeletonTable />);
    // Header row + 5 body rows = 6 flex rows
    const rows = container.querySelectorAll("[class*='flex'][class*='gap-4']");
    // 1 header + 5 body
    expect(rows.length).toBe(6);
  });

  it("renders custom row count", () => {
    const { container } = render(<SkeletonTable rows={3} />);
    const rows = container.querySelectorAll("[class*='flex'][class*='gap-4']");
    // 1 header + 3 body
    expect(rows.length).toBe(4);
  });

  it("renders custom column count", () => {
    const { container } = render(<SkeletonTable columns={6} rows={1} />);
    // Header: 6 skeleton bars + Body: 6 skeleton bars = 12
    const skeletons = container.querySelectorAll("[class*='animate-pulse']");
    expect(skeletons.length).toBe(12);
  });

  it("has table loading label", () => {
    render(<SkeletonTable />);
    expect(screen.getByLabelText("Chargement du tableau")).toBeInTheDocument();
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<SkeletonTable ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe("SkeletonChart", () => {
  it("renders with aria-busy", () => {
    render(<SkeletonChart data-testid="chart" />);
    expect(screen.getByTestId("chart")).toHaveAttribute("aria-busy", "true");
  });

  it("has chart loading label", () => {
    render(<SkeletonChart />);
    expect(
      screen.getByLabelText("Chargement du graphique"),
    ).toBeInTheDocument();
  });

  it("renders card structure (border + shadow)", () => {
    render(<SkeletonChart data-testid="chart" />);
    expect(screen.getByTestId("chart")).toHaveClass(
      "rounded-card",
      "shadow-card",
    );
  });

  it("merges custom className", () => {
    render(<SkeletonChart data-testid="chart" className="mt-6" />);
    expect(screen.getByTestId("chart")).toHaveClass("mt-6");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<SkeletonChart ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
