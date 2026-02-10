import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("framer-motion", async () => {
  const { createFramerMotionMock } =
    await import("../../../../testing/utils/mocks/framer-motion");
  return createFramerMotionMock();
});

import { DeliverablesSection } from "../DeliverablesSection";

describe("DeliverablesSection", () => {
  it("should render without errors", () => {
    const { container } = render(<DeliverablesSection />);
    expect(container.querySelector("#deliverables")).toBeInTheDocument();
  });

  it("should have id=deliverables for anchor navigation", () => {
    const { container } = render(<DeliverablesSection />);
    expect(container.querySelector("section")).toHaveAttribute(
      "id",
      "deliverables",
    );
  });

  it("should render the kicker text", () => {
    render(<DeliverablesSection />);
    expect(screen.getByText("Les livrables")).toBeInTheDocument();
  });

  it("should render the section heading", () => {
    render(<DeliverablesSection />);
    expect(screen.getByText("Ce que vous recevez")).toBeInTheDocument();
  });

  it("should render the first deliverable subheading", () => {
    render(<DeliverablesSection />);
    expect(
      screen.getByText("Diagnostic de couverture : votre point de départ"),
    ).toBeInTheDocument();
  });

  it("should render all checklist items", () => {
    render(<DeliverablesSection />);
    const items = [
      "Carte de sous-couverture par site et compétence",
      "Coût de l'inaction estimé en euros",
      "Playbook d'actions prioritaires chiffrées",
      "Hypothèses explicites et auditables",
      "Facteurs explicatifs de chaque risque identifié",
    ];
    for (const item of items) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });

  it("should render the PDF mockup header", () => {
    render(<DeliverablesSection />);
    expect(screen.getByText("Rapport de couverture")).toBeInTheDocument();
  });

  it("should render the cost avoidance figure", () => {
    render(<DeliverablesSection />);
    expect(screen.getByText("47 000 €")).toBeInTheDocument();
  });

  it("should render priority actions", () => {
    render(<DeliverablesSection />);
    expect(
      screen.getByText("Renforcer Lille S+3 (intérim ciblé)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Réorganiser Nantes S+5 (rotation)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Former 2 polyvalents Marseille"),
    ).toBeInTheDocument();
  });

  it("should render the continuous monitoring subheading", () => {
    render(<DeliverablesSection />);
    expect(
      screen.getByText("Pilotage continu de la couverture"),
    ).toBeInTheDocument();
  });

  it("should render ongoing checklist items", () => {
    render(<DeliverablesSection />);
    expect(
      screen.getByText("Early-warning sous-couverture à 3, 7 et 14 jours"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Amélioration continue : les causes identifiées nourrissent vos processus",
      ),
    ).toBeInTheDocument();
  });

  it("should render the dashboard SVG with aria label", () => {
    render(<DeliverablesSection />);
    expect(
      screen.getByLabelText("Aperçu du tableau de bord de pilotage continu"),
    ).toBeInTheDocument();
  });

  it("should render all trust signal titles", () => {
    render(<DeliverablesSection />);
    expect(screen.getByText("Crédibilité fondateur")).toBeInTheDocument();
    expect(screen.getByText("Transparence méthodologique")).toBeInTheDocument();
    expect(screen.getByText("RGPD by design")).toBeInTheDocument();
    expect(screen.getByText("Interprétabilité native")).toBeInTheDocument();
  });

  it("should render trust signal descriptions", () => {
    render(<DeliverablesSection />);
    expect(
      screen.getByText(/Expertise en data science, séries temporelles/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Chaque chiffre est accompagné de ses hypothèses/),
    ).toBeInTheDocument();
  });

  it("should render the disclaimer text", () => {
    render(<DeliverablesSection />);
    // Text appears in both the PDF mockup and the dashboard SVG
    const disclaimers = screen.getAllByText(
      "Aperçu schématique — données fictives",
    );
    expect(disclaimers.length).toBe(2);
  });

  it("should accept a custom className", () => {
    const { container } = render(
      <DeliverablesSection className="test-class" />,
    );
    expect(container.querySelector("section")).toHaveClass("test-class");
  });
});
