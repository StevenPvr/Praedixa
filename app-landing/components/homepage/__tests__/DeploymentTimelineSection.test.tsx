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
      /En production en 30 jours/,
    );
    expect(
      screen.getByText(/Un cadrage resserré, un sponsor opérations/),
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
      screen.getAllByText(/Première lecture/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Décision cadrée/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Revue d.impact/).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText(/Montée en charge/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders notItems", () => {
    render(<DeploymentTimelineSection locale="fr" />);

    expect(screen.getByText(/Pas de refonte SI/)).toBeInTheDocument();
    expect(screen.getByText(/Pas de promesse floue/)).toBeInTheDocument();
    expect(screen.getByText(/Pas de couche de reporting/)).toBeInTheDocument();
    expect(screen.getByText(/Pas de projet à 6 mois/)).toBeInTheDocument();
  });

  it("renders CTA link with deployment intent href", () => {
    render(<DeploymentTimelineSection locale="fr" />);

    const ctaLink = screen.getByRole("link", {
      name: /Cadrer un premier périmètre/,
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
