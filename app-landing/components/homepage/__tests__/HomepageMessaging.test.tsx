import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { fr } from "../../../lib/i18n/dictionaries/fr";
import { HowItWorksSection } from "../HowItWorksSection";
import { UseCasesSection } from "../UseCasesSection";
import { ContactCtaSection } from "../ContactCtaSection";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("Homepage FR messaging", () => {
  it("keeps the homepage sections aligned with the French positioning", () => {
    render(
      <>
        <HowItWorksSection locale="fr" dict={fr} />
        <UseCasesSection locale="fr" dict={fr} />
        <ContactCtaSection locale="fr" dict={fr} />
      </>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Un cycle simple, orienté décision. Pas un dashboard de plus.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Praedixa lit les signaux utiles, compare les arbitrages, cadre la décision et relit l’impact dans le temps, à partir d’un conflit économique concret.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /optimisation sous contrainte adaptés au contexte métier/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /modèles économétriques pour distinguer plus proprement/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Arbitrages inter-sites")).toBeInTheDocument();
    expect(screen.getAllByText("Signal").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", {
        name: "Vous savez déjà où la marge se fragilise. Voyons quelle décision couvrir en premier.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Parlez-nous du réseau, des arbitrages qui reviennent le plus souvent et du prochain pas utile. Déploiement Praedixa d’abord, preuve sur historique si elle aide à objectiver le point de départ.",
      ),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: "Parler du déploiement" })
        .every((link) => link.getAttribute("href") === "/fr/deploiement"),
    ).toBe(true);
    expect(
      screen.getByRole("link", { name: "Demander la preuve sur historique" }),
    ).toHaveAttribute("href", "/fr/decision-log-preuve-roi");
  });
});
