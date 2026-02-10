import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// We need to control useReducedMotion from the app hooks
const mockUseReducedMotion = vi.fn(() => false);

vi.mock("framer-motion", async () => {
  const { createFramerMotionMock } =
    await import("../../../../testing/utils/mocks/framer-motion");
  return createFramerMotionMock();
});

vi.mock("../../../hooks/useScrollReveal", () => ({
  useScrollReveal: () => ({
    ref: { current: null },
    isRevealed: true,
    progress: { get: () => 0, set: vi.fn(), onChange: vi.fn() },
  }),
}));

vi.mock("../../../hooks/useReducedMotion", () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

import { ScrollReveal } from "../ScrollReveal";

describe("ScrollReveal", () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false);
  });

  it("should render children", () => {
    render(
      <ScrollReveal>
        <p>Test content</p>
      </ScrollReveal>,
    );
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("should render with default variant (fadeUp)", () => {
    const { container } = render(
      <ScrollReveal>
        <p>Content</p>
      </ScrollReveal>,
    );
    // Default renders as a div
    expect(container.querySelector("div")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(
      <ScrollReveal className="custom-reveal">
        <p>Content</p>
      </ScrollReveal>,
    );
    expect(container.firstElementChild).toHaveClass("custom-reveal");
  });

  it("should render as a different element when 'as' prop is provided", () => {
    const { container } = render(
      <ScrollReveal as="section">
        <p>Content</p>
      </ScrollReveal>,
    );
    expect(container.querySelector("section")).toBeInTheDocument();
  });

  it("should render without animation when reduced motion is preferred", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = render(
      <ScrollReveal className="test-rm">
        <p>Reduced motion content</p>
      </ScrollReveal>,
    );
    expect(screen.getByText("Reduced motion content")).toBeInTheDocument();
    // When reduced motion is true, it renders with createElement (plain element)
    expect(container.firstElementChild).toHaveClass("test-rm");
  });

  it("should render children in reduced motion mode with 'as' element", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = render(
      <ScrollReveal as="article">
        <p>Article content</p>
      </ScrollReveal>,
    );
    expect(container.querySelector("article")).toBeInTheDocument();
    expect(screen.getByText("Article content")).toBeInTheDocument();
  });

  it("should accept all variant types without errors", () => {
    const variants = [
      "fadeUp",
      "fadeIn",
      "scaleIn",
      "slideLeft",
      "slideRight",
    ] as const;
    for (const variant of variants) {
      const { unmount } = render(
        <ScrollReveal variant={variant}>
          <p>{variant}</p>
        </ScrollReveal>,
      );
      expect(screen.getByText(variant)).toBeInTheDocument();
      unmount();
    }
  });
});
