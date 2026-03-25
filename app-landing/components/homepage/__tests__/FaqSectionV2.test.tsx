import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FaqSectionV2 } from "../FaqSectionV2";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span {...props}>{children}</span>
    ),
  },
  useReducedMotion: () => false,
}));

describe("FaqSectionV2", () => {
  it("renders with id='faq'", () => {
    const { container } = render(<FaqSectionV2 locale="fr" />);

    const section = container.querySelector("#faq");
    expect(section).toBeInTheDocument();
  });

  it("renders the section heading", () => {
    render(<FaqSectionV2 locale="fr" />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Questions fréquentes",
      }),
    ).toBeInTheDocument();
  });

  it("renders all FAQ question items", () => {
    render(<FaqSectionV2 locale="fr" />);

    const questions = [
      /Faut-il changer de POS ou de planning/,
      /À partir de combien de restaurants cela devient pertinent/,
      /Est-ce que cela couvre drive, salle et delivery/,
      /Quelles données faut-il au démarrage/,
      /Qui doit porter le sujet côté client/,
      /Quelle est la différence avec la BI ou le WFM/,
      /Que se passe-t-il après les 30 premiers jours/,
    ];

    for (const question of questions) {
      expect(screen.getByText(question)).toBeInTheDocument();
    }
  });

  it("renders accordion toggle buttons for every FAQ item", () => {
    render(<FaqSectionV2 locale="fr" />);

    const faqButtons = [
      /Faut-il changer de POS ou de planning/,
      /À partir de combien de restaurants cela devient pertinent/,
      /Est-ce que cela couvre drive, salle et delivery/,
      /Quelles données faut-il au démarrage/,
      /Qui doit porter le sujet côté client/,
      /Quelle est la différence avec la BI ou le WFM/,
      /Que se passe-t-il après les 30 premiers jours/,
    ];

    for (const label of faqButtons) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("renders the contact mini card with CTA text", () => {
    render(<FaqSectionV2 locale="fr" />);

    expect(
      screen.getByText(
        "Décrivez votre réseau et le prochain rush à traiter, nous revenons avec une réponse qualifiée sous 48h ouvrées.",
      ),
    ).toBeInTheDocument();

    const ctaLink = screen.getByRole("link", {
      name: /Une question spécifique/,
    });
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink).toHaveAttribute("href", "/fr/contact");
  });
});
