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
        "Praedixa lit les signaux utiles, compare les arbitrages, cadre la décision et relit l’impact dans le temps.",
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
        name: "Vos équipes décident déjà tous les jours sous contrainte.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "La question est simple: vos arbitrages sont-ils encore pilotés à vue ? Qualification rapide, lecture seule au départ, NDA possible dès le premier échange.",
      ),
    ).toBeInTheDocument();
  });
});
