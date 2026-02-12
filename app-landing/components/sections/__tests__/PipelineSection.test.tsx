import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("framer-motion", async () => {
  const { createFramerMotionMock } =
    await import("../../../../testing/utils/mocks/framer-motion");
  return createFramerMotionMock();
});

import { PipelineSection } from "../PipelineSection";
import { pipelinePhases } from "../../../lib/content/pipeline-phases";

describe("PipelineSection", () => {
  it("renders with id=pipeline", () => {
    const { container } = render(<PipelineSection />);
    expect(container.querySelector("section")).toHaveAttribute(
      "id",
      "pipeline",
    );
  });

  it("renders all phase blocks from content", () => {
    render(<PipelineSection />);

    for (const phase of pipelinePhases) {
      expect(screen.getByText(phase.title)).toBeInTheDocument();
      expect(screen.getByText(phase.description)).toBeInTheDocument();

      for (const capability of phase.capabilities) {
        expect(screen.getByText(capability)).toBeInTheDocument();
      }

      if (phase.callout) {
        expect(screen.getByText(phase.callout)).toBeInTheDocument();
      }
    }
  });

  it("renders loop flow markers", () => {
    render(<PipelineSection />);
    expect(screen.getByText("Signal")).toBeInTheDocument();
    expect(screen.getByText("Arbitrage")).toBeInTheDocument();
    expect(screen.getByText("Action")).toBeInTheDocument();
    expect(screen.getByText("Mesure")).toBeInTheDocument();
  });
});
