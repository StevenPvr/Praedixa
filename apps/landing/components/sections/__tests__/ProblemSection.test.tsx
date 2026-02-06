import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("framer-motion", async () => {
  const { createFramerMotionMock } =
    await import("../../../../../test-utils/mocks/framer-motion");
  return createFramerMotionMock();
});

import { ProblemSection } from "../ProblemSection";

describe("ProblemSection", () => {
  it("should render without errors", () => {
    const { container } = render(<ProblemSection />);
    expect(container.querySelector("#problem")).toBeInTheDocument();
  });

  it("should have id=problem for anchor navigation", () => {
    const { container } = render(<ProblemSection />);
    expect(container.querySelector("section")).toHaveAttribute("id", "problem");
  });

  it("should render the kicker text", () => {
    render(<ProblemSection />);
    expect(screen.getByText("Le problème")).toBeInTheDocument();
  });

  it("should render the section heading", () => {
    render(<ProblemSection />);
    expect(
      screen.getByText("Le vrai coût de la sous-couverture"),
    ).toBeInTheDocument();
  });

  it("should render the section description", () => {
    render(<ProblemSection />);
    expect(
      screen.getByText(/Quand la capacité terrain ne suit pas la charge/),
    ).toBeInTheDocument();
  });

  it("should render all three pain point titles", () => {
    render(<ProblemSection />);
    expect(
      screen.getByText("La sous-couverture se révèle trop tard"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Le coût de l'inaction est invisible"),
    ).toBeInTheDocument();
    expect(screen.getByText("Aucune preuve pour le CODIR")).toBeInTheDocument();
  });

  it("should render all pain point descriptions", () => {
    render(<ProblemSection />);
    expect(
      screen.getByText(/Aucun early-warning : l'écart capacité vs charge/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Heures sup, intérim, dégradation de service/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sans données consolidées, impossible de prouver/),
    ).toBeInTheDocument();
  });

  it("should render all pain point consequences", () => {
    render(<ProblemSection />);
    expect(
      screen.getByText("Surcoût intérim urgence : +40 à +80 % vs anticipé"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Pas de visibilité financière pour arbitrer"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Pas d'audit trail pour le DAF"),
    ).toBeInTheDocument();
  });

  it("should render the transition paragraph to solution", () => {
    render(<ProblemSection />);
    expect(
      screen.getByText(/Praedixa est cette couche d'intelligence/),
    ).toBeInTheDocument();
  });

  it("should accept a custom className", () => {
    const { container } = render(<ProblemSection className="test-class" />);
    expect(container.querySelector("section")).toHaveClass("test-class");
  });
});
