import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { MetricCard, statusDotColor } from "../components/metric-card";

describe("MetricCard", () => {
  it("renders without crashing", () => {
    render(<MetricCard label="Taux" value="95%" />);
    expect(screen.getByText("Taux")).toBeInTheDocument();
  });

  it("renders label", () => {
    render(<MetricCard label="Couverture" value="87" />);
    expect(screen.getByText("Couverture")).toBeInTheDocument();
  });

  it("renders string value", () => {
    render(<MetricCard label="Score" value="A+" />);
    expect(screen.getByText("A+")).toBeInTheDocument();
  });

  it("renders numeric value", () => {
    render(<MetricCard label="Count" value={42} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders unit when provided", () => {
    render(<MetricCard label="Duree" value={120} unit="min" />);
    expect(screen.getByText("min")).toBeInTheDocument();
  });

  it("does not render unit when not provided", () => {
    render(<MetricCard label="Score" value="A+" data-testid="card" />);
    const card = screen.getByTestId("card");
    expect(card.querySelectorAll("span.text-gray-400")).toHaveLength(0);
  });

  it("shows green status dot for good", () => {
    render(
      <MetricCard label="Test" value="OK" status="good" data-testid="card" />,
    );
    const dot = screen.getByLabelText("Statut: good");
    expect(dot).toHaveClass("bg-green-500");
  });

  it("shows amber status dot for warning", () => {
    render(<MetricCard label="Test" value="!" status="warning" />);
    const dot = screen.getByLabelText("Statut: warning");
    expect(dot).toHaveClass("bg-amber-500");
  });

  it("shows red status dot for danger", () => {
    render(<MetricCard label="Test" value="X" status="danger" />);
    const dot = screen.getByLabelText("Statut: danger");
    expect(dot).toHaveClass("bg-red-500");
  });

  it("shows gray status dot for neutral (default)", () => {
    render(<MetricCard label="Test" value="-" />);
    const dot = screen.getByLabelText("Statut: neutral");
    expect(dot).toHaveClass("bg-gray-400");
  });

  it("merges custom className", () => {
    render(
      <MetricCard
        label="Test"
        value="42"
        className="my-custom"
        data-testid="card"
      />,
    );
    expect(screen.getByTestId("card")).toHaveClass("my-custom");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<MetricCard ref={ref} label="Test" value="42" />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("passes through additional props", () => {
    render(<MetricCard label="Test" value="42" data-testid="card" id="m-1" />);
    expect(screen.getByTestId("card")).toHaveAttribute("id", "m-1");
  });

  it("renders as inline-flex element", () => {
    render(<MetricCard label="Test" value="42" data-testid="card" />);
    expect(screen.getByTestId("card")).toHaveClass("inline-flex");
  });

  it("applies border and background styles", () => {
    render(<MetricCard label="Test" value="42" data-testid="card" />);
    const card = screen.getByTestId("card");
    expect(card).toHaveClass("border-gray-200", "bg-white", "rounded-lg");
  });

  it("renders value in bold", () => {
    render(<MetricCard label="Test" value="42" data-testid="card" />);
    const valueEl = screen.getByText("42");
    expect(valueEl).toHaveClass("font-bold");
  });
});

describe("statusDotColor", () => {
  it("maps good to green", () => {
    expect(statusDotColor.good).toBe("bg-green-500");
  });

  it("maps warning to amber", () => {
    expect(statusDotColor.warning).toBe("bg-amber-500");
  });

  it("maps danger to red", () => {
    expect(statusDotColor.danger).toBe("bg-red-500");
  });

  it("maps neutral to gray", () => {
    expect(statusDotColor.neutral).toBe("bg-gray-400");
  });
});
