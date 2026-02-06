import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { Label } from "../components/label";

describe("Label", () => {
  it("renders as a label element", () => {
    render(<Label data-testid="label">Username</Label>);
    expect(screen.getByTestId("label").tagName).toBe("LABEL");
  });

  it("renders children text", () => {
    render(<Label>Email</Label>);
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("applies htmlFor prop", () => {
    render(
      <Label htmlFor="email-input" data-testid="label">
        Email
      </Label>,
    );
    expect(screen.getByTestId("label")).toHaveAttribute("for", "email-input");
  });

  it("applies default variant classes", () => {
    render(<Label data-testid="label">Text</Label>);
    expect(screen.getByTestId("label")).toHaveClass(
      "text-sm",
      "font-medium",
      "leading-none",
    );
  });

  it("merges custom className", () => {
    render(
      <Label data-testid="label" className="my-class">
        Text
      </Label>,
    );
    const label = screen.getByTestId("label");
    expect(label).toHaveClass("my-class");
    expect(label).toHaveClass("text-sm");
  });

  it("shows required asterisk when required=true", () => {
    render(
      <Label data-testid="label" required>
        Name
      </Label>,
    );
    const label = screen.getByTestId("label");
    expect(label.textContent).toContain("*");
    // The asterisk should be in a span with text-destructive
    const asterisk = label.querySelector("span");
    expect(asterisk).toHaveClass("text-destructive");
    expect(asterisk).toHaveTextContent("*");
  });

  it("does not show asterisk when required is not set", () => {
    render(<Label data-testid="label">Name</Label>);
    const label = screen.getByTestId("label");
    expect(label.querySelector("span")).toBeNull();
    expect(label.textContent).toBe("Name");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLLabelElement>();
    render(<Label ref={ref}>Text</Label>);
    expect(ref.current).toBeInstanceOf(HTMLLabelElement);
  });

  it("passes through additional HTML attributes", () => {
    render(
      <Label data-testid="label" id="my-label">
        Text
      </Label>,
    );
    expect(screen.getByTestId("label")).toHaveAttribute("id", "my-label");
  });

  it("renders complex children", () => {
    render(
      <Label data-testid="label">
        <span data-testid="inner">Complex</span>
      </Label>,
    );
    expect(screen.getByTestId("inner")).toBeInTheDocument();
  });
});
