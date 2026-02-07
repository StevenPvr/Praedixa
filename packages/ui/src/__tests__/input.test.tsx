import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createRef } from "react";
import { Input } from "../components/input";

describe("Input", () => {
  it("renders an input element", () => {
    render(<Input data-testid="input" />);
    expect(screen.getByTestId("input").tagName).toBe("INPUT");
  });

  it("applies type prop", () => {
    render(<Input data-testid="input" type="email" />);
    expect(screen.getByTestId("input")).toHaveAttribute("type", "email");
  });

  it("applies password type", () => {
    render(<Input data-testid="input" type="password" />);
    expect(screen.getByTestId("input")).toHaveAttribute("type", "password");
  });

  it("handles onChange events", () => {
    const handleChange = vi.fn();
    render(<Input data-testid="input" onChange={handleChange} />);
    fireEvent.change(screen.getByTestId("input"), {
      target: { value: "hello" },
    });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it("renders placeholder text", () => {
    render(<Input placeholder="Enter email" />);
    expect(screen.getByPlaceholderText("Enter email")).toBeInTheDocument();
  });

  it("disabled state", () => {
    render(<Input data-testid="input" disabled />);
    expect(screen.getByTestId("input")).toBeDisabled();
  });

  it("merges custom className", () => {
    render(<Input data-testid="input" className="my-custom" />);
    expect(screen.getByTestId("input")).toHaveClass("my-custom");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("applies error styles when error=true", () => {
    render(<Input data-testid="input" error />);
    expect(screen.getByTestId("input")).toHaveClass("border-destructive");
  });

  it("does not apply error styles when error=false", () => {
    render(<Input data-testid="input" error={false} />);
    expect(screen.getByTestId("input")).not.toHaveClass("border-destructive");
  });

  it("renders with leftAddon", () => {
    render(
      <Input
        data-testid="input"
        leftAddon={<span data-testid="left-addon">@</span>}
      />,
    );
    expect(screen.getByTestId("left-addon")).toBeInTheDocument();
    expect(screen.getByTestId("input")).toHaveClass("pl-10");
  });

  it("renders with rightAddon", () => {
    render(
      <Input
        data-testid="input"
        rightAddon={<span data-testid="right-addon">X</span>}
      />,
    );
    expect(screen.getByTestId("right-addon")).toBeInTheDocument();
    expect(screen.getByTestId("input")).toHaveClass("pr-10");
  });

  it("wraps in relative div when addons are present", () => {
    const { container } = render(
      <Input leftAddon={<span>@</span>} data-testid="input" />,
    );
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("relative");
  });

  it("does not wrap in relative div when no addons", () => {
    const { container } = render(<Input data-testid="input" />);
    expect(container.firstChild?.nodeName).toBe("INPUT");
  });

  it("renders with both leftAddon and rightAddon", () => {
    render(
      <Input
        data-testid="input"
        leftAddon={<span data-testid="left">L</span>}
        rightAddon={<span data-testid="right">R</span>}
      />,
    );
    expect(screen.getByTestId("left")).toBeInTheDocument();
    expect(screen.getByTestId("right")).toBeInTheDocument();
    expect(screen.getByTestId("input")).toHaveClass("pl-10", "pr-10");
  });

  it("applies base input classes", () => {
    render(<Input data-testid="input" />);
    const input = screen.getByTestId("input");
    expect(input).toHaveClass("flex", "h-10", "w-full", "rounded-md");
  });
});
