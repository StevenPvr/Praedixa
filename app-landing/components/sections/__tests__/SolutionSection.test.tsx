import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("framer-motion", async () => {
  const { createFramerMotionMock } =
    await import("../../../../testing/utils/mocks/framer-motion");
  return createFramerMotionMock();
});

import { SolutionSection } from "../SolutionSection";
import { SOLUTION_STEPS } from "../../../lib/content/solution-content";

describe("SolutionSection", () => {
  it("renders with id=solution", () => {
    const { container } = render(<SolutionSection />);
    expect(container.querySelector("section")).toHaveAttribute("id", "solution");
  });

  it("renders all steps from content", () => {
    render(<SolutionSection />);

    for (const step of SOLUTION_STEPS) {
      expect(screen.getByText(step.title)).toBeInTheDocument();
      expect(screen.getByText(step.subtitle)).toBeInTheDocument();
      expect(screen.getByText(step.description)).toBeInTheDocument();
    }
  });

  it("renders link to pipeline section", () => {
    render(<SolutionSection />);
    const link = screen.getByText(/Voir les cas d'usage opérationnels/i).closest("a");
    expect(link).toHaveAttribute("href", "#pipeline");
  });

  it("accepts custom className", () => {
    const { container } = render(<SolutionSection className="solution-test" />);
    expect(container.querySelector("section")).toHaveClass("solution-test");
  });
});
