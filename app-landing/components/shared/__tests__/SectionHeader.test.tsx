import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("framer-motion", async () => {
  const { createFramerMotionMock } =
    await import("../../../../testing/utils/mocks/framer-motion");
  return createFramerMotionMock();
});

import { SectionHeader } from "../SectionHeader";

describe("SectionHeader", () => {
  it("should render the heading text", () => {
    render(<SectionHeader heading="Test Heading" />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Test Heading" }),
    ).toBeInTheDocument();
  });

  it("should render the kicker when provided", () => {
    render(<SectionHeader kicker="Kicker Text" heading="Heading" />);
    expect(screen.getByText("Kicker Text")).toBeInTheDocument();
  });

  it("should not render a kicker element when kicker is not provided", () => {
    const { container } = render(<SectionHeader heading="Heading" />);
    const kicker = container.querySelector("span");
    expect(kicker).toBeNull();
  });

  it("should render the subheading when provided", () => {
    render(<SectionHeader heading="Heading" subheading="Sub text here" />);
    expect(screen.getByText("Sub text here")).toBeInTheDocument();
  });

  it("should not render a subheading element when subheading is not provided", () => {
    render(<SectionHeader heading="Heading" />);
    // Only the heading element should be present, no <p> for subheading
    expect(screen.queryByText(/./i, { selector: "p" })).toBeNull();
  });

  it("should apply dark text classes by default (light=false)", () => {
    render(
      <SectionHeader kicker="Kicker" heading="Heading" subheading="Sub" />,
    );
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveClass("text-charcoal");
    const kicker = screen.getByText("Kicker");
    expect(kicker).toHaveClass("text-amber-600");
  });

  it("should apply light text classes when light=true", () => {
    render(
      <SectionHeader
        kicker="Kicker"
        heading="Heading"
        subheading="Sub"
        light
      />,
    );
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveClass("text-white");
    const kicker = screen.getByText("Kicker");
    expect(kicker).toHaveClass("text-amber-400");
  });

  it("should apply custom className", () => {
    const { container } = render(
      <SectionHeader heading="Test" className="custom-header" />,
    );
    expect(container.firstElementChild).toHaveClass("custom-header");
  });
});
