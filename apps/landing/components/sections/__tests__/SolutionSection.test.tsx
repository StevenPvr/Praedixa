import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("framer-motion", async () => {
  const { createFramerMotionMock } =
    await import("../../../../../test-utils/mocks/framer-motion");
  return createFramerMotionMock();
});

import { SolutionSection } from "../SolutionSection";

describe("SolutionSection", () => {
  it("should render without errors", () => {
    const { container } = render(<SolutionSection />);
    expect(container.querySelector("#solution")).toBeInTheDocument();
  });

  it("should have id=solution for anchor navigation", () => {
    const { container } = render(<SolutionSection />);
    expect(container.querySelector("section")).toHaveAttribute(
      "id",
      "solution",
    );
  });

  it("should render the kicker text", () => {
    render(<SolutionSection />);
    expect(screen.getByText("Votre point de départ")).toBeInTheDocument();
  });

  it("should render the section heading", () => {
    render(<SolutionSection />);
    expect(
      screen.getByText("Votre diagnostic de couverture en 48h"),
    ).toBeInTheDocument();
  });

  it("should render the section description", () => {
    render(<SolutionSection />);
    expect(
      screen.getByText(/Avant de construire un système complet/),
    ).toBeInTheDocument();
  });

  it("should render all three solution step titles", () => {
    render(<SolutionSection />);
    expect(
      screen.getByText("Envoyez vos exports existants"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("On détecte la sous-couverture"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Vous recevez votre carte des risques"),
    ).toBeInTheDocument();
  });

  it("should render step subtitles", () => {
    render(<SolutionSection />);
    expect(screen.getByText("10 min, aucune intégration")).toBeInTheDocument();
    expect(
      screen.getByText("Analyse capacité vs charge en 48h"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Risques + coûts + playbook d'actions"),
    ).toBeInTheDocument();
  });

  it("should render step descriptions", () => {
    render(<SolutionSection />);
    expect(
      screen.getByText(
        /Capacité, charge, absences : des fichiers que vous avez déjà/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/On prédit les trous à venir par site/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Une carte de sous-couverture par site/),
    ).toBeInTheDocument();
  });

  it("should render step numbers 1, 2, 3", () => {
    render(<SolutionSection />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("should render the bridge-to-pipeline paragraph", () => {
    render(<SolutionSection />);
    expect(
      screen.getByText(/Ce diagnostic est votre point d'entrée/),
    ).toBeInTheDocument();
  });

  it("should render the link to #pipeline", () => {
    render(<SolutionSection />);
    const link = screen.getByText("Découvrir le pilotage continu");
    expect(link.closest("a")).toHaveAttribute("href", "#pipeline");
  });

  it("should accept a custom className", () => {
    const { container } = render(<SolutionSection className="my-class" />);
    expect(container.querySelector("section")).toHaveClass("my-class");
  });
});
