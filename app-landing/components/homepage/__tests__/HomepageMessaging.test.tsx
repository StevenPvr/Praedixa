import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClosedLoopTeaserSection } from "../ClosedLoopTeaserSection";
import { HomeFaqCtaSection } from "../HomeFaqCtaSection";
import { IntegrationTeaserSection } from "../IntegrationTeaserSection";
import { ServicesPilotTeaserSection } from "../ServicesPilotTeaserSection";

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
        <IntegrationTeaserSection locale="fr" />
        <ServicesPilotTeaserSection locale="fr" />
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
        "Praedixa fédère les données utiles sur l'existant, compare les options coût / service / risque, fait valider l'action utile et referme la boucle avec une preuve mensuelle du ROI.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Federer les systemes qui comptent pour une decision.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Praedixa se branche sur l'existant, en lecture seule, pour relier RH, finance, operations et supply chain dans une infrastructure hebergee en France. L'objectif n'est pas de rapatrier toute la donnee: c'est de relier celle qui compte pour arbitrer.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Federation legere via exports et API existants"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Entreprise française, incubée à Euratechnologies"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Infrastructure hebergee en France sur Scaleway"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "La vraie valeur commence quand la decision devient gouvernee.",
      }),
    ).toBeInTheDocument();
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
