import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("framer-motion", async () => {
  const { createFramerMotionMock } =
    await import("../../../../testing/utils/mocks/framer-motion");
  return createFramerMotionMock();
});

import { PraedixaLogo } from "../PraedixaLogo";

describe("PraedixaLogo", () => {
  it("should render an SVG element", () => {
    const { container } = render(<PraedixaLogo />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("should render with correct default viewBox (0 0 64 64)", () => {
    const { container } = render(<PraedixaLogo />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("viewBox", "0 0 64 64");
  });

  it("should render with default size of 40", () => {
    const { container } = render(<PraedixaLogo />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "40");
    expect(svg).toHaveAttribute("height", "40");
  });

  it("should render with custom size", () => {
    const { container } = render(<PraedixaLogo size={64} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "64");
    expect(svg).toHaveAttribute("height", "64");
  });

  it("should render the industrial variant by default", () => {
    const { container } = render(<PraedixaLogo />);
    // Industrial variant has a rect frame at x=4, y=4
    const rect = container.querySelector('rect[x="4"][y="4"]');
    expect(rect).toBeInTheDocument();
  });

  it("should render the rounded variant", () => {
    const { container } = render(<PraedixaLogo variant="rounded" />);
    // Rounded variant has a circle with cx=32, cy=32, r=28
    const circle = container.querySelector('circle[cx="32"][cy="32"][r="28"]');
    expect(circle).toBeInTheDocument();
  });

  it("should render the minimal variant", () => {
    const { container } = render(<PraedixaLogo variant="minimal" />);
    // Minimal variant has a specific path and an accent line
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBeGreaterThanOrEqual(1);
  });

  it("should render the geometric variant", () => {
    const { container } = render(<PraedixaLogo variant="geometric" />);
    // Geometric variant has a rotated rect (transform includes rotate)
    const rotatedRect = container.querySelector('rect[transform*="rotate"]');
    expect(rotatedRect).toBeInTheDocument();
  });

  it("should apply custom className to wrapper", () => {
    const { container } = render(<PraedixaLogo className="my-logo" />);
    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass("my-logo");
  });

  it("should use custom color prop", () => {
    const { container } = render(<PraedixaLogo color="red" />);
    // The industrial variant uses color for stroke/fill attributes
    const rect = container.querySelector('rect[stroke="red"]');
    expect(rect).toBeInTheDocument();
  });

  it("should use custom strokeWidth prop", () => {
    const { container } = render(<PraedixaLogo strokeWidth={3} />);
    // The frame rect uses the base strokeWidth
    const rect = container.querySelector('rect[stroke-width="3"]');
    expect(rect).toBeInTheDocument();
  });
});
