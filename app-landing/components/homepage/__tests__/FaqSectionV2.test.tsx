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

  it("renders all 6 FAQ question items", () => {
    render(<FaqSectionV2 locale="fr" />);

    const questions = [
      /Faut-il remplacer nos outils actuels/,
      /Quel est le délai avant le premier arbitrage objectivé/,
      /Quelles données sont nécessaires au démarrage/,
      /Qui est le sponsor idéal côté client/,
      /Comment Praedixa se distingue d.un outil de BI ou de prévision/,
      /Que se passe-t-il après les 30 premiers jours/,
    ];

    for (const question of questions) {
      expect(screen.getByText(question)).toBeInTheDocument();
    }
  });

  it("renders 6 accordion toggle buttons", () => {
    render(<FaqSectionV2 locale="fr" />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(6);
  });

  it("renders the contact mini card with CTA text", () => {
    render(<FaqSectionV2 locale="fr" />);

    expect(
      screen.getByText(
        "Décrivez votre contexte et nous revenons avec une réponse qualifiée sous 48h ouvrées.",
      ),
    ).toBeInTheDocument();

    const ctaLink = screen.getByRole("link", {
      name: /Une question spécifique/,
    });
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink).toHaveAttribute("href", "/fr/contact");
  });
});
