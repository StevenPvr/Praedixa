import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PraedixaLogo } from "../praedixa-logo";

describe("PraedixaLogo", () => {
  it("renders an SVG element", () => {
    const { container } = render(<PraedixaLogo />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("has aria-hidden for decorative usage", () => {
    const { container } = render(<PraedixaLogo />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("uses default size of 40", () => {
    const { container } = render(<PraedixaLogo />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "40");
    expect(svg).toHaveAttribute("height", "40");
  });

  it("applies custom size", () => {
    const { container } = render(<PraedixaLogo size={48} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "48");
    expect(svg).toHaveAttribute("height", "48");
  });

  it("applies custom color to strokes and fills", () => {
    const { container } = render(<PraedixaLogo color="#ff0000" />);
    const rect = container.querySelector("rect");
    expect(rect).toHaveAttribute("stroke", "#ff0000");
    const circle = container.querySelector("circle");
    expect(circle).toHaveAttribute("fill", "#ff0000");
  });

  it("uses dark oklch default color", () => {
    const { container } = render(<PraedixaLogo />);
    const rect = container.querySelector("rect");
    expect(rect).toHaveAttribute("stroke", "oklch(0.145 0 0)");
  });

  it("applies className to SVG", () => {
    const { container } = render(<PraedixaLogo className="custom-class" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("custom-class");
  });

  it("renders the P letter structure (4 lines)", () => {
    const { container } = render(<PraedixaLogo />);
    const lines = container.querySelectorAll("line");
    expect(lines).toHaveLength(4);
  });

  it("renders the decorative dot (circle)", () => {
    const { container } = render(<PraedixaLogo />);
    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(1);
  });
});
