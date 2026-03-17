import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeploymentTimelineSection } from "../DeploymentTimelineSection";

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

describe("DeploymentTimelineSection", () => {
  it("has section id deploiement", () => {
    const { container } = render(<DeploymentTimelineSection locale="fr" />);
    expect(container.querySelector("#deploiement")).toBeInTheDocument();
  });

  it("renders kicker, heading and subheading", () => {
    render(<DeploymentTimelineSection locale="fr" />);

    expect(screen.getByText(/Déploiement/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      /Opérationnel en 30/,
    );
    expect(
      screen.getByText(/Un démarrage simple, un sponsor opérations/),
    ).toBeInTheDocument();
  });

  it("renders 5 timeline step markers", () => {
    render(<DeploymentTimelineSection locale="fr" />);

    expect(screen.getAllByText("S1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("S2").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("S3").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("S4").length).toBeGreaterThanOrEqual(1);
  });

  it("renders step titles", () => {
    render(<DeploymentTimelineSection locale="fr" />);

    expect(screen.getAllByText("Cadrage").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Première analyse/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Décision/).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Mesure d.impact/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Extension/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders notItems", () => {
    render(<DeploymentTimelineSection locale="fr" />);

    expect(
      screen.getByText(/Pas de remplacement de vos outils/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Pas de projet IT lourd/)).toBeInTheDocument();
    expect(
      screen.getByText(/Pas de reporting supplémentaire/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Pas de promesse sans preuve/)).toBeInTheDocument();
  });

  it("renders CTA link with deployment intent href", () => {
    render(<DeploymentTimelineSection locale="fr" />);

    const ctaLink = screen.getByRole("link", {
      name: /Parler à un expert/,
    });
    expect(ctaLink).toHaveAttribute("href", "/fr/contact?intent=deploiement");
  });

  it("renders CTA microcopy", () => {
    render(<DeploymentTimelineSection locale="fr" />);

    expect(
      screen.getByText(/Retour qualifié sous 48h ouvrées/),
    ).toBeInTheDocument();
  });
});
