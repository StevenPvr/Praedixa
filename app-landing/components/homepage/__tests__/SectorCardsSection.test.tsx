import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SectorCardsSection } from "../SectorCardsSection";

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

vi.mock("@phosphor-icons/react/dist/ssr", () => ({
  ArrowRight: (props: Record<string, unknown>) => (
    <svg data-testid="arrow-right-icon" {...props} />
  ),
}));

describe("SectorCardsSection", () => {
  it("renders the section with id='secteurs'", () => {
    const { container } = render(<SectorCardsSection locale="fr" />);

    const section = container.querySelector("#secteurs");
    expect(section).toBeInTheDocument();
    expect(section?.tagName).toBe("SECTION");
  });

  it("renders the French kicker and heading", () => {
    render(<SectorCardsSection locale="fr" />);

    expect(screen.getByText("Cas d\u2019usage réseau")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Les arbitrages qui reviennent chaque semaine dans un réseau QSR.",
      }),
    ).toBeInTheDocument();
  });

  it("renders the 4 QSR use-case cards", () => {
    render(<SectorCardsSection locale="fr" />);

    const cardHeadings = screen.getAllByRole("heading", { level: 3 });
    expect(cardHeadings).toHaveLength(4);
  });

  it("renders the expected card titles", () => {
    render(<SectorCardsSection locale="fr" />);

    expect(
      screen.getByRole("heading", {
        name: "Arbitrer le staffing avant les rushs service par service",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Choisir quand ralentir un canal plutôt que brûler la marge",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Réallouer intelligemment entre restaurants proches",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Relire les temps forts avant qu\u2019ils n\u2019abîment vos équipes",
      }),
    ).toBeInTheDocument();
  });

  it("renders the supporting stat labels", () => {
    render(<SectorCardsSection locale="fr" />);

    expect(screen.getByText("Midi / soir")).toBeInTheDocument();
    expect(screen.getByText("Drive + delivery")).toBeInTheDocument();
    expect(screen.getByText("Multi-sites")).toBeInTheDocument();
    expect(screen.getByText("Promo + météo")).toBeInTheDocument();
  });

  it("renders the CTA link to scope a deployment conversation", () => {
    render(<SectorCardsSection locale="fr" />);

    const link = screen.getByRole("link", {
      name: /Cadrer un premier cas réseau/,
    });
    expect(link).toHaveAttribute("href", "/fr/contact?intent=deploiement");
  });
});
