import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge, badgeVariants } from "../components/badge";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("renders as a div element", () => {
    render(<Badge data-testid="badge">Label</Badge>);
    expect(screen.getByTestId("badge").tagName).toBe("DIV");
  });

  it("applies default variant classes", () => {
    render(<Badge data-testid="badge">Default</Badge>);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("bg-primary", "text-primary-foreground");
  });

  it("applies secondary variant classes", () => {
    render(
      <Badge data-testid="badge" variant="secondary">
        Secondary
      </Badge>,
    );
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("bg-secondary", "text-secondary-foreground");
  });

  it("applies destructive variant classes", () => {
    render(
      <Badge data-testid="badge" variant="destructive">
        Error
      </Badge>,
    );
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("bg-destructive", "text-destructive-foreground");
  });

  it("applies outline variant classes", () => {
    render(
      <Badge data-testid="badge" variant="outline">
        Outline
      </Badge>,
    );
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("text-foreground");
    // outline variant does NOT have border-transparent
    expect(badge).not.toHaveClass("border-transparent");
  });

  it("applies success variant classes", () => {
    render(
      <Badge data-testid="badge" variant="success">
        OK
      </Badge>,
    );
    expect(screen.getByTestId("badge")).toHaveClass(
      "bg-green-100",
      "text-green-800",
    );
  });

  it("applies warning variant classes", () => {
    render(
      <Badge data-testid="badge" variant="warning">
        Warn
      </Badge>,
    );
    expect(screen.getByTestId("badge")).toHaveClass(
      "bg-yellow-100",
      "text-yellow-800",
    );
  });

  it("applies error variant classes", () => {
    render(
      <Badge data-testid="badge" variant="error">
        Err
      </Badge>,
    );
    expect(screen.getByTestId("badge")).toHaveClass(
      "bg-red-100",
      "text-red-800",
    );
  });

  it("applies info variant classes", () => {
    render(
      <Badge data-testid="badge" variant="info">
        Info
      </Badge>,
    );
    expect(screen.getByTestId("badge")).toHaveClass(
      "bg-blue-100",
      "text-blue-800",
    );
  });

  it("merges custom className", () => {
    render(
      <Badge data-testid="badge" className="my-custom">
        Custom
      </Badge>,
    );
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("my-custom");
    expect(badge).toHaveClass("inline-flex");
  });

  it("applies base classes to all variants", () => {
    render(<Badge data-testid="badge">Base</Badge>);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass(
      "inline-flex",
      "items-center",
      "rounded-full",
      "text-xs",
      "font-semibold",
    );
  });

  it("passes through additional HTML attributes", () => {
    render(
      <Badge data-testid="badge" id="my-badge" role="status">
        Status
      </Badge>,
    );
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveAttribute("id", "my-badge");
    expect(badge).toHaveAttribute("role", "status");
  });
});

describe("badgeVariants", () => {
  it("is a callable function (CVA output)", () => {
    expect(typeof badgeVariants).toBe("function");
  });

  it("returns classes for default variant", () => {
    const classes = badgeVariants({ variant: "default" });
    expect(classes).toContain("bg-primary");
  });

  it("returns classes without explicit variant (uses default)", () => {
    const classes = badgeVariants({});
    expect(classes).toContain("bg-primary");
  });
});
