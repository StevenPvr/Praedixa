import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("framer-motion", async () => {
  const { createFramerMotionMock } =
    await import("../../../../testing/utils/mocks/framer-motion");
  return createFramerMotionMock();
});

import { ProblemSection } from "../ProblemSection";
import { PAIN_POINTS } from "../../../lib/content/problem-content";

describe("ProblemSection", () => {
  it("renders with expected anchor id", () => {
    const { container } = render(<ProblemSection />);
    expect(container.querySelector("section")).toHaveAttribute("id", "problem");
  });

  it("renders all configured pain points", () => {
    render(<ProblemSection />);

    for (const point of PAIN_POINTS) {
      expect(screen.getByText(point.title)).toBeInTheDocument();
      expect(screen.getByText(point.description)).toBeInTheDocument();
      expect(screen.getByText(point.consequence)).toBeInTheDocument();
    }
  });

  it("accepts custom className", () => {
    const { container } = render(<ProblemSection className="problem-test" />);
    expect(container.querySelector("section")).toHaveClass("problem-test");
  });
});
