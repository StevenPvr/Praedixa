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

  it("applies custom color to logo strokes", () => {
    const { container } = render(<PraedixaLogo color="#ff0000" />);
    const group = container.querySelector("g");
    expect(group).toHaveAttribute("stroke", "#ff0000");
  });

  it("uses tokenized default color", () => {
    const { container } = render(<PraedixaLogo />);
    const group = container.querySelector("g");
    expect(group).toHaveAttribute("stroke", "var(--warm-ink)");
  });

  it("applies className to SVG", () => {
    const { container } = render(<PraedixaLogo className="custom-class" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("custom-class");
  });

  it("renders the monogram structure", () => {
    const { container } = render(<PraedixaLogo />);
    const lines = container.querySelectorAll("line");
    expect(lines).toHaveLength(1);
    const paths = container.querySelectorAll("path");
    expect(paths).toHaveLength(1);
  });

  it("does not render the legacy decorative dot", () => {
    const { container } = render(<PraedixaLogo />);
    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(0);
  });
});
