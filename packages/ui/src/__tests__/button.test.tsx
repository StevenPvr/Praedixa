import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "../components/button";

describe("Button", () => {
  it("renders children correctly", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button")).toHaveTextContent("Click me");
  });

  it("handles click events", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("is disabled when loading", () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("shows spinner when loading", () => {
    render(<Button loading>Loading</Button>);
    // The spinner is an SVG with animate-spin class
    const button = screen.getByRole("button");
    expect(button.querySelector("svg.animate-spin")).toBeInTheDocument();
  });

  it("applies default variant classes (amber)", () => {
    render(<Button>Default</Button>);
    expect(screen.getByRole("button")).toHaveClass(
      "bg-amber-500",
      "text-white",
    );
  });

  it("applies destructive variant classes", () => {
    const { rerender } = render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-destructive");

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole("button")).toHaveClass("border");
  });

  it("applies size classes", () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-9");

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-11");
  });

  it("renders left icon when provided", () => {
    render(
      <Button leftIcon={<span data-testid="left-icon">*</span>}>
        With Icon
      </Button>,
    );
    expect(screen.getByTestId("left-icon")).toBeInTheDocument();
  });

  it("renders right icon when provided", () => {
    render(
      <Button rightIcon={<span data-testid="right-icon">*</span>}>
        With Icon
      </Button>,
    );
    expect(screen.getByTestId("right-icon")).toBeInTheDocument();
  });

  it("sets aria-busy when loading", () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
  });

  it("does not set aria-busy when not loading", () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-busy");
  });

  it("does not render icons when loading", () => {
    render(
      <Button
        loading
        leftIcon={<span data-testid="left-icon">*</span>}
        rightIcon={<span data-testid="right-icon">*</span>}
      >
        Loading
      </Button>,
    );
    expect(screen.queryByTestId("left-icon")).not.toBeInTheDocument();
    expect(screen.queryByTestId("right-icon")).not.toBeInTheDocument();
  });
});
