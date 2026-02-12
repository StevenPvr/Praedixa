import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("framer-motion", async () => {
  const { createFramerMotionMock } =
    await import("../../../../testing/utils/mocks/framer-motion");
  return createFramerMotionMock();
});

import { SectionWrapper } from "../SectionWrapper";

describe("SectionWrapper", () => {
  it("renders children inside a section element", () => {
    render(
      <SectionWrapper id="test-section">
        <p>Child content</p>
      </SectionWrapper>,
    );
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("sets section id", () => {
    const { container } = render(
      <SectionWrapper id="my-section">
        <p>Content</p>
      </SectionWrapper>,
    );
    expect(container.querySelector("section")).toHaveAttribute(
      "id",
      "my-section",
    );
  });

  it("uses transparent light style by default", () => {
    const { container } = render(
      <SectionWrapper id="light">
        <p>Content</p>
      </SectionWrapper>,
    );
    const section = container.querySelector("section");
    expect(section).toHaveClass("bg-transparent");
    expect(section).toHaveClass("text-charcoal");
  });

  it("uses charcoal style when dark=true", () => {
    const { container } = render(
      <SectionWrapper id="dark" dark>
        <p>Content</p>
      </SectionWrapper>,
    );
    const section = container.querySelector("section");
    expect(section).toHaveClass("bg-charcoal");
    expect(section).toHaveClass("text-white");
  });

  it("applies custom className", () => {
    const { container } = render(
      <SectionWrapper id="test" className="custom-wrapper">
        <p>Content</p>
      </SectionWrapper>,
    );
    expect(container.querySelector("section")).toHaveClass("custom-wrapper");
  });

  it("wraps children in section-shell container", () => {
    const { container } = render(
      <SectionWrapper id="test">
        <p>Content</p>
      </SectionWrapper>,
    );
    const innerDiv = container.querySelector(".section-shell");
    expect(innerDiv).toBeInTheDocument();
    expect(innerDiv?.textContent).toBe("Content");
  });
});
