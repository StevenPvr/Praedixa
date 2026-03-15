import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { fr } from "../../../lib/i18n/dictionaries/fr";
import { HeroSection } from "../HeroSection";

vi.mock("next/image", () => ({
  default: (
    rawProps: React.ImgHTMLAttributes<HTMLImageElement> & {
      fill?: boolean;
      priority?: boolean;
      unoptimized?: boolean;
    },
  ) => {
    const { alt, ...props } = rawProps;
    delete props.fill;
    delete props.priority;
    delete props.unoptimized;
    return <img alt={alt ?? ""} {...props} />;
  },
}));
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
vi.mock("../HeroBackgroundVideo", () => ({
  HeroBackgroundVideo: ({ src }: { src: string }) => (
    <div data-src={src} data-testid="hero-background-video" />
  ),
}));

describe("HeroSection", () => {
  it("keeps the French hero focused on multi-site trade-offs and proof", () => {
    render(<HeroSection locale="fr" dict={fr} />);

    expect(
      screen.getByLabelText(
        "Pour réseaux multi-sites qui arbitrent sous contrainte",
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId("hero-background-video")).toHaveAttribute(
      "data-src",
      "/hero-video/hero-industries-montage.mp4",
    );

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Arbitrez 3 à 14 jours plus tôt");
    const heroSubheadline = screen.getByText(
      (_, element) =>
        element?.textContent === "les décisions qui protègent la marge.",
    );
    expect(heroSubheadline).toBeInTheDocument();
    expect(within(heroSubheadline).getByText("marge").className).toContain(
      "text-[var(--brass-400)]",
    );
    expect(
      screen.getByText(
        /Praedixa détecte les tensions multi-sites avant l’urgence/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Déploiement Praedixa")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Logiciel + mise en place cadrée sur vos données existantes, avec démarrage possible en lecture seule.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "La preuve sur historique sert de point d’entrée quand il faut d’abord objectiver un premier arbitrage.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Lecture seule au départ").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Données agrégées").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Hébergement France").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("NDA dès le premier échange").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: "Voir la preuve sur historique" }),
    ).toHaveAttribute("href", "/fr/decision-log-preuve-roi");
    expect(
      screen.getByRole("link", { name: "Cadrer un premier périmètre" }),
    ).toHaveAttribute("href", "/fr/contact?intent=deploiement");
  });
});
