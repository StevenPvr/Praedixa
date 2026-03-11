import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClosedLoopTeaserSection } from "../ClosedLoopTeaserSection";
import { HomeFaqCtaSection } from "../HomeFaqCtaSection";

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
  it("keeps teaser sections aligned with the simplified value proposition", () => {
    render(
      <>
        <ClosedLoopTeaserSection locale="fr" />
        <HomeFaqCtaSection locale="fr" />
      </>,
    );

    expect(
      screen.getByRole("heading", {
        name: "DecisionOps: transformer l'arbitrage en action gouvernée.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Praedixa fédère les données utiles sur l'existant, anticipe les besoins, compare les options coût / service / risque, fait valider l'action utile et referme la boucle avec une preuve mensuelle du ROI.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Prédire")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Les questions avant de démarrer",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Praedixa est la plateforme française de DecisionOps. Elle se branche sur vos outils existants pour transformer des arbitrages récurrents en décisions calculées, exécutées et auditables.",
      ),
    ).toBeInTheDocument();
  });
});
