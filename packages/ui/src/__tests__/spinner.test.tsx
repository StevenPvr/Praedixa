import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Spinner } from "../components/spinner";

describe("Spinner", () => {
  it("renders with role=status", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("has aria-label Loading", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Loading");
  });

  it("renders an SVG element", () => {
    render(<Spinner />);
    const container = screen.getByRole("status");
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("has animate-spin class", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toHaveClass("animate-spin");
  });

  it("has screen-reader-only Loading text", () => {
    render(<Spinner />);
    expect(screen.getByText("Loading...")).toHaveClass("sr-only");
  });

  it("defaults to medium size", () => {
    render(<Spinner />);
    const spinner = screen.getByRole("status");
    expect(spinner).toHaveClass("h-8", "w-8");
  });

  it("applies small size classes", () => {
    render(<Spinner size="sm" />);
    const spinner = screen.getByRole("status");
    expect(spinner).toHaveClass("h-4", "w-4");
  });

  it("applies medium size classes", () => {
    render(<Spinner size="md" />);
    const spinner = screen.getByRole("status");
    expect(spinner).toHaveClass("h-8", "w-8");
  });

  it("applies large size classes", () => {
    render(<Spinner size="lg" />);
    const spinner = screen.getByRole("status");
    expect(spinner).toHaveClass("h-12", "w-12");
  });

  it("merges custom className", () => {
    render(<Spinner className="text-red-500" />);
    const spinner = screen.getByRole("status");
    expect(spinner).toHaveClass("text-red-500");
    expect(spinner).toHaveClass("animate-spin");
  });

  it("passes through additional props", () => {
    render(<Spinner data-testid="spinner" id="my-spinner" />);
    expect(screen.getByTestId("spinner")).toHaveAttribute("id", "my-spinner");
  });

  it("SVG has correct viewBox", () => {
    render(<Spinner />);
    const svg = screen.getByRole("status").querySelector("svg");
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
  });

  it("SVG has fill=none", () => {
    render(<Spinner />);
    const svg = screen.getByRole("status").querySelector("svg");
    expect(svg).toHaveAttribute("fill", "none");
  });
});
