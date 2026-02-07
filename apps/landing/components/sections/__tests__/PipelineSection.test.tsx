import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("framer-motion", async () => {
  const { createFramerMotionMock } =
    await import("../../../../../test-utils/mocks/framer-motion");
  return createFramerMotionMock();
});

import { PipelineSection } from "../PipelineSection";
import { pipelinePhases } from "../../../lib/content/pipeline-phases";

describe("PipelineSection", () => {
  it("should render without errors", () => {
    const { container } = render(<PipelineSection />);
    expect(container.querySelector("#pipeline")).toBeInTheDocument();
  });

  it("should have id=pipeline for anchor navigation", () => {
    const { container } = render(<PipelineSection />);
    expect(container.querySelector("section")).toHaveAttribute(
      "id",
      "pipeline",
    );
  });

  it("should render the kicker text", () => {
    render(<PipelineSection />);
    expect(screen.getByText("La vision complète")).toBeInTheDocument();
  });

  it("should render the section heading", () => {
    render(<PipelineSection />);
    expect(
      screen.getByText(
        "Du diagnostic ponctuel au pilotage continu de la couverture",
      ),
    ).toBeInTheDocument();
  });

  it("should render the subheading", () => {
    render(<PipelineSection />);
    expect(
      screen.getByText(/Quatre phases interconnectées forment une boucle/),
    ).toBeInTheDocument();
  });

  it("should render all phase titles", () => {
    render(<PipelineSection />);
    for (const phase of pipelinePhases) {
      expect(screen.getByText(phase.title)).toBeInTheDocument();
    }
  });

  it("should render all phase descriptions", () => {
    render(<PipelineSection />);
    for (const phase of pipelinePhases) {
      expect(screen.getByText(phase.description)).toBeInTheDocument();
    }
  });

  it("should render phase capabilities", () => {
    render(<PipelineSection />);
    // Check a few capabilities from different phases
    expect(
      screen.getByText("Imports multi-formats (CSV, Excel, exports métier)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Risque de sous-couverture par site et compétence"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Décision traçable avec audit trail"),
    ).toBeInTheDocument();
  });

  it("should render callout texts for phases that have them", () => {
    render(<PipelineSection />);
    // Predictions phase callout
    expect(
      screen.getByText(
        /Toutes les prédictions sont agrégées au niveau équipe ou site/,
      ),
    ).toBeInTheDocument();
    // Notifications phase callout
    expect(
      screen.getByText(/Praedixa ne donne pas de conseil/),
    ).toBeInTheDocument();
  });

  it("should render the flow diagram steps", () => {
    render(<PipelineSection />);
    expect(screen.getByText("Données")).toBeInTheDocument();
    expect(screen.getByText("Prédictions")).toBeInTheDocument();
    expect(screen.getByText("Arbitrage")).toBeInTheDocument();
    expect(screen.getByText("Preuve")).toBeInTheDocument();
  });

  it("should render the flow diagram description", () => {
    render(<PipelineSection />);
    expect(
      screen.getByText(
        /Une boucle vertueuse : chaque cycle améliore les données/,
      ),
    ).toBeInTheDocument();
  });

  it("should render phase numbers 1-4", () => {
    render(<PipelineSection />);
    // Phase numbers in timeline dots
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("should accept a custom className", () => {
    const { container } = render(<PipelineSection className="my-pipeline" />);
    expect(container.querySelector("section")).toHaveClass("my-pipeline");
  });
});
