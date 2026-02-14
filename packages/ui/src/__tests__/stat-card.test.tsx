import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { StatCard, statCardVariants } from "../components/stat-card";

describe("StatCard", () => {
  it("renders value and label", () => {
    render(<StatCard value="1,234" label="Total Users" />);
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("Total Users")).toBeInTheDocument();
  });

  it("applies default variant classes", () => {
    render(<StatCard data-testid="card" value="100" label="Metric" />);
    const card = screen.getByTestId("card");
    expect(card.className).toMatch(/border|bg-\[var\(--card-bg\)\]/);
  });

  it("applies accent variant classes", () => {
    render(
      <StatCard
        data-testid="card"
        value="100"
        label="Metric"
        variant="accent"
      />,
    );
    const card = screen.getByTestId("card");
    expect(card.className).toMatch(/accent|gradient/);
  });

  it("applies success variant classes", () => {
    render(
      <StatCard
        data-testid="card"
        value="100"
        label="Metric"
        variant="success"
      />,
    );
    const card = screen.getByTestId("card");
    expect(card.className).toMatch(/success/);
  });

  it("applies warning variant classes", () => {
    render(
      <StatCard
        data-testid="card"
        value="100"
        label="Metric"
        variant="warning"
      />,
    );
    const card = screen.getByTestId("card");
    expect(card.className).toMatch(/warning/);
  });

  it("renders icon with warning variant bg", () => {
    const { container } = render(
      <StatCard
        value="100"
        label="Metric"
        variant="warning"
        icon={<span data-testid="icon">I</span>}
      />,
    );
    const iconContainer =
      container.querySelector(".h-10.w-10") ??
      container.querySelector("[class*='w-10']");
    expect(iconContainer).toBeTruthy();
    expect(iconContainer?.className).toMatch(/warning/);
  });

  it("applies danger variant classes", () => {
    render(
      <StatCard
        data-testid="card"
        value="100"
        label="Metric"
        variant="danger"
      />,
    );
    const card = screen.getByTestId("card");
    expect(card.className).toMatch(/danger/);
  });

  it("renders trend text when provided", () => {
    render(<StatCard value="87%" label="Score" trend="+12.5%" />);
    expect(screen.getByText("+12.5%")).toBeInTheDocument();
  });

  it("does not render trend span when trend is not provided", () => {
    const { container } = render(<StatCard value="100" label="Metric" />);
    // No span with trend-related classes
    const trendSpans = container.querySelectorAll("span.inline-flex");
    expect(trendSpans).toHaveLength(0);
  });

  it("applies up trend color", () => {
    render(
      <StatCard value="100" label="Metric" trend="+5%" trendDirection="up" />,
    );
    const trendEl = screen.getByText("+5%").closest("span");
    expect(trendEl?.className).toMatch(/success/);
  });

  it("applies down trend color", () => {
    render(
      <StatCard value="100" label="Metric" trend="-3%" trendDirection="down" />,
    );
    const trendEl = screen.getByText("-3%").closest("span");
    expect(trendEl?.className).toMatch(/danger/);
  });

  it("applies flat trend color by default", () => {
    render(<StatCard value="100" label="Metric" trend="0%" />);
    const trendEl = screen.getByText("0%").closest("span");
    expect(trendEl?.className).toMatch(/ink-tertiary|ink-|tertiary/);
  });

  it("renders icon slot when icon is provided", () => {
    render(
      <StatCard
        value="100"
        label="Metric"
        icon={<span data-testid="icon">I</span>}
      />,
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("renders icon with default variant bg", () => {
    const { container } = render(
      <StatCard
        value="100"
        label="Metric"
        icon={<span data-testid="icon">I</span>}
      />,
    );
    const iconContainer =
      container.querySelector(".h-10.w-10") ??
      container.querySelector("[class*='w-10']");
    expect(iconContainer).toBeTruthy();
    expect(iconContainer?.className).toMatch(/brand|accent/);
  });

  it("renders icon with accent variant bg", () => {
    const { container } = render(
      <StatCard
        value="100"
        label="Metric"
        variant="accent"
        icon={<span data-testid="icon">I</span>}
      />,
    );
    const iconContainer =
      container.querySelector(".h-10.w-10") ??
      container.querySelector("[class*='w-10']");
    expect(iconContainer).toBeTruthy();
    expect(iconContainer?.className).toMatch(/accent/);
  });

  it("does not render icon container when no icon", () => {
    const { container } = render(<StatCard value="100" label="Metric" />);
    expect(container.querySelector(".h-10.w-10")).toBeNull();
  });

  it("applies tabular-nums to value", () => {
    render(<StatCard value="1,234" label="Metric" />);
    const valueEl = screen.getByText("1,234");
    expect(valueEl).toHaveClass("tabular-nums");
  });

  it("merges custom className", () => {
    render(
      <StatCard
        data-testid="card"
        value="100"
        label="Metric"
        className="my-custom"
      />,
    );
    expect(screen.getByTestId("card")).toHaveClass("my-custom");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<StatCard ref={ref} value="100" label="Metric" />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("passes through additional props", () => {
    render(<StatCard data-testid="card" value="100" label="M" id="stat-1" />);
    expect(screen.getByTestId("card")).toHaveAttribute("id", "stat-1");
  });

  it("renders TrendArrow with flat direction (horizontal line SVG)", () => {
    render(<StatCard value="100" label="M" trend="0%" trendDirection="flat" />);
    // Flat renders a horizontal line path "M2 7h10"
    const svg = screen.getByText("0%").closest("span")?.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("renders TrendArrow with up direction (arrow SVG)", () => {
    render(<StatCard value="100" label="M" trend="+1%" trendDirection="up" />);
    const svg = screen.getByText("+1%").closest("span")?.querySelector("svg");
    expect(svg).toBeInTheDocument();
    // up arrow does not have rotate-180
    expect(svg).not.toHaveClass("rotate-180");
  });

  it("renders TrendArrow with down direction (rotated arrow SVG)", () => {
    render(
      <StatCard value="100" label="M" trend="-1%" trendDirection="down" />,
    );
    const svg = screen.getByText("-1%").closest("span")?.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("rotate-180");
  });
});

describe("statCardVariants", () => {
  it("is a callable function (CVA output)", () => {
    expect(typeof statCardVariants).toBe("function");
  });

  it("returns classes for default variant", () => {
    const classes = statCardVariants({ variant: "default" });
    expect(classes).toMatch(/border|card-bg/);
  });

  it("returns default variant classes when no variant specified", () => {
    const classes = statCardVariants({});
    expect(classes).toMatch(/border|card-bg/);
  });
});
