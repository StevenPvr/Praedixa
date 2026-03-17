import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FinalCtaSection } from "../FinalCtaSection";

describe("FinalCtaSection", () => {
  it("renders with id='contact'", () => {
    const { container } = render(<FinalCtaSection locale="fr" />);

    const section = container.querySelector("#contact");
    expect(section).toBeInTheDocument();
  });

  it("renders the heading", () => {
    render(<FinalCtaSection locale="fr" />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Cadrons le premier arbitrage à objectiver.",
      }),
    ).toBeInTheDocument();
  });

  it("renders the label kicker", () => {
    render(<FinalCtaSection locale="fr" />);

    expect(screen.getByText("Prêt à objectiver")).toBeInTheDocument();
  });

  it("renders all 3 promise items", () => {
    render(<FinalCtaSection locale="fr" />);

    const promiseItems = [
      "Retour qualifié sous 48h ouvrées",
      "Orientation preuve sur historique ou cadrage déploiement",
      "Prochain pas concret, adapté à votre périmètre",
    ];

    for (const item of promiseItems) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });

  it("renders step 1 form fields (Type de réseau, Arbitrage prioritaire, Horizon projet)", () => {
    render(<FinalCtaSection locale="fr" />);

    expect(screen.getByText("Type de réseau")).toBeInTheDocument();
    expect(screen.getByText("Arbitrage prioritaire")).toBeInTheDocument();
    expect(screen.getByText("Horizon projet")).toBeInTheDocument();
  });

  it("renders a select for 'Type de réseau' with correct options", () => {
    render(<FinalCtaSection locale="fr" />);

    const selects = screen.getAllByRole("combobox");
    // Two selects: "Type de réseau" and "Horizon projet"
    expect(selects).toHaveLength(2);

    const options = [
      "Logistique",
      "Distribution",
      "Restauration",
      "Retail",
      "Services",
      "Industrie",
      "Autre",
    ];
    for (const opt of options) {
      expect(screen.getByRole("option", { name: opt })).toBeInTheDocument();
    }
  });

  it("renders step indicators for steps 1 and 2", () => {
    render(<FinalCtaSection locale="fr" />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders the 'Continuer' button for step 1", () => {
    render(<FinalCtaSection locale="fr" />);

    expect(
      screen.getByRole("button", { name: "Continuer" }),
    ).toBeInTheDocument();
  });
});
