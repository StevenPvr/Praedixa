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
        "Pour COO, directions des opérations et responsables réseau",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Réseaux multi-sites · arbitrages coûteux · impact relu",
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId("hero-background-video")).toHaveAttribute(
      "data-src",
      "/hero-video/hero-industries-montage.mp4",
    );

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Décidez plus tôt.");
    const heroSubheadline = screen.getByText(
      (_, element) =>
        element?.textContent ===
        "Protégez la marge avant que l’opération ne casse.",
    );
    expect(heroSubheadline).toBeInTheDocument();
    expect(within(heroSubheadline).getByText("marge").className).toContain(
      "text-[var(--brass-400)]",
    );
    expect(
      screen.getByText(
        /Praedixa aide les réseaux multi-sites à repérer plus tôt/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Déploiement Praedixa · lecture seule au départ · NDA possible",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Lecture seule au démarrage")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Voir un exemple concret" }),
    ).toHaveAttribute("href", "/fr/decision-log-preuve-roi");
    expect(
      screen.getByRole("link", { name: "Parler du déploiement" }),
    ).toHaveAttribute("href", "/fr/deploiement");
    expect(
      screen.getByRole("link", { name: "Demander la preuve sur historique" }),
    ).toHaveAttribute("href", "/fr/contact?intent=proof");
  });
});
