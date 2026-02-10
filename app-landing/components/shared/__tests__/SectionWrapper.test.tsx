import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("framer-motion", async () => {
  const { createFramerMotionMock } =
    await import("../../../../testing/utils/mocks/framer-motion");
  return createFramerMotionMock();
});

import { SectionWrapper } from "../SectionWrapper";

describe("SectionWrapper", () => {
  it("should render children inside a section element", () => {
    render(
      <SectionWrapper id="test-section">
        <p>Child content</p>
      </SectionWrapper>,
    );
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("should set the id attribute on the section", () => {
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

  it("should apply light background by default (dark=false)", () => {
    const { container } = render(
      <SectionWrapper id="light">
        <p>Content</p>
      </SectionWrapper>,
    );
    const section = container.querySelector("section");
    expect(section).toHaveClass("bg-cream");
    expect(section).toHaveClass("text-charcoal");
  });

  it("should apply dark background when dark=true", () => {
    const { container } = render(
      <SectionWrapper id="dark" dark>
        <p>Content</p>
      </SectionWrapper>,
    );
    const section = container.querySelector("section");
    expect(section).toHaveClass("bg-charcoal");
    expect(section).toHaveClass("text-white");
  });

  it("should apply custom className", () => {
    const { container } = render(
      <SectionWrapper id="test" className="custom-wrapper">
        <p>Content</p>
      </SectionWrapper>,
    );
    expect(container.querySelector("section")).toHaveClass("custom-wrapper");
  });

  it("should wrap children in a max-w-6xl container", () => {
    const { container } = render(
      <SectionWrapper id="test">
        <p>Content</p>
      </SectionWrapper>,
    );
    const innerDiv = container.querySelector(".max-w-6xl");
    expect(innerDiv).toBeInTheDocument();
    expect(innerDiv?.textContent).toBe("Content");
  });
});
