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
        name: "Une base commune, puis des décisions plus claires.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Praedixa relie d'abord les données utiles. Ensuite, les besoins, les écarts et les priorités deviennent plus faciles à lire site par site.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Réunir vos données sans remplacer vos outils.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Praedixa part de l'existant, en lecture seule, pour créer une base commune entre RH, finance, opérations et supply chain. Les données restent hébergées en France sur Scaleway, avec un ancrage français assumé.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Connexion légère via exports et API existants"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Entreprise française, incubée à Euratechnologies"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Données hébergées en France sur Scaleway"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Une fois les données réunies, Praedixa aide à agir.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Les questions avant de démarrer",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Praedixa relie les données RH, finance, opérations et supply chain pour rendre les besoins visibles plus tôt, prioriser les actions et suivre le ROI.",
      ),
    ).toBeInTheDocument();
  });
});
