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
        name: "Cadrons votre première prévision réseau.",
      }),
    ).toBeInTheDocument();
  });

  it("renders the label kicker", () => {
    render(<FinalCtaSection locale="fr" />);

    expect(screen.getByText(/Réseau restauration rapide/)).toBeInTheDocument();
  });

  it("renders all 3 promise items", () => {
    render(<FinalCtaSection locale="fr" />);

    const promiseItems = [
      "Retour en 48h",
      "Premier signal à objectiver",
      "Plan d\u2019action réseau concret",
    ];

    for (const item of promiseItems) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });

  it("renders step 1 form fields (Nombre de restaurants, Principal enjeu, Horizon projet)", () => {
    render(<FinalCtaSection locale="fr" />);

    expect(
      screen.getByRole("combobox", { name: "Nombre de restaurants" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Principal enjeu" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Horizon projet" }),
    ).toBeInTheDocument();
  });

  it("renders a select for 'Nombre de restaurants' with correct options", () => {
    render(<FinalCtaSection locale="fr" />);

    const selects = screen.getAllByRole("combobox");
    // Two selects: "Nombre de restaurants" and "Horizon projet"
    expect(selects).toHaveLength(2);

    const options = ["2\u20135", "6\u201315", "16\u201340", "41\u2013100", "100+"];
    for (const opt of options) {
      expect(screen.getByRole("option", { name: opt })).toBeInTheDocument();
    }
  });

  it("renders step indicators for steps 1 and 2", () => {
    render(<FinalCtaSection locale="fr" />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders Calendly microcopy and expert booking link", () => {
    render(<FinalCtaSection locale="fr" />);

    expect(
      screen.getByText(/Vous préférez réserver un créneau de 30/i),
    ).toBeInTheDocument();
    const calendly = screen.getByRole("link", {
      name: /Parler avec le CEO/i,
    });
    expect(calendly).toHaveAttribute(
      "href",
      "https://calendly.com/steven-poivre-praedixa/30min",
    );
  });

  it("renders the 'Continuer' button for step 1", () => {
    render(<FinalCtaSection locale="fr" />);

    expect(
      screen.getByRole("button", { name: "Continuer" }),
    ).toBeInTheDocument();
  });
});
