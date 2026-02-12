import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("framer-motion", async () => {
  const { createFramerMotionMock } =
    await import("../../../../testing/utils/mocks/framer-motion");
  return createFramerMotionMock();
});

import { SectionHeader } from "../SectionHeader";

describe("SectionHeader", () => {
  it("renders heading", () => {
    render(<SectionHeader heading="Test Heading" />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Test Heading" }),
    ).toBeInTheDocument();
  });

  it("renders kicker and subheading when provided", () => {
    render(
      <SectionHeader
        kicker="Kicker Text"
        heading="Heading"
        subheading="Sub text here"
      />,
    );

    expect(screen.getByText("Kicker Text")).toBeInTheDocument();
    expect(screen.getByText("Sub text here")).toBeInTheDocument();
  });

  it("does not render optional elements when omitted", () => {
    const { container } = render(<SectionHeader heading="Heading" />);
    expect(container.querySelector("span")).toBeNull();
    expect(container.querySelector("p")).toBeNull();
  });

  it("applies light and default color classes", () => {
    const { rerender } = render(
      <SectionHeader kicker="Kicker" heading="Heading" subheading="Sub" />,
    );

    expect(screen.getByRole("heading", { level: 2 })).toHaveClass(
      "text-charcoal",
    );
    expect(screen.getByText("Kicker")).toHaveClass("text-amber-700");

    rerender(
      <SectionHeader
        kicker="Kicker"
        heading="Heading"
        subheading="Sub"
        light
      />,
    );

    expect(screen.getByRole("heading", { level: 2 })).toHaveClass("text-white");
    expect(screen.getByText("Kicker")).toHaveClass("text-amber-300");
  });

  it("accepts custom className", () => {
    const { container } = render(
      <SectionHeader heading="Test" className="custom-header" />,
    );
    expect(container.firstElementChild).toHaveClass("custom-header");
  });
});
