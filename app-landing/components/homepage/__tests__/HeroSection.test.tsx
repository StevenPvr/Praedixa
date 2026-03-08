import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { fr } from "../../../lib/i18n/dictionaries/fr";
import { HeroSection } from "../HeroSection";

vi.mock("next/image", () => ({
  default: (rawProps: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
    unoptimized?: boolean;
  }) => {
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
  HeroBackgroundVideo: ({
    mp4Src,
  }: {
    mp4Src: string;
  }) => <div data-mp4-src={mp4Src} data-testid="hero-background-video" />,
}));

describe("HeroSection", () => {
  it("clarifies the French hero value proposition", () => {
    render(<HeroSection locale="fr" dict={fr} />);

    expect(screen.getByText("RH")).toBeInTheDocument();
    expect(screen.getByText("FINANCE")).toBeInTheDocument();
    expect(screen.getByText("OPÉRATIONS")).toBeInTheDocument();
    expect(screen.getByText("Restaurant")).toBeInTheDocument();
    expect(screen.getByText("Hôtel")).toBeInTheDocument();
    expect(screen.getByText("Fast-food")).toBeInTheDocument();
    expect(screen.getByText("Retail")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
    expect(screen.getByText("Logistique")).toBeInTheDocument();
    expect(screen.getByText("Automobile")).toBeInTheDocument();
    expect(screen.getByText("Enseignement supérieur")).toBeInTheDocument();
    expect(screen.getByTestId("hero-background-video")).toHaveAttribute(
      "data-mp4-src",
      "/hero-video/hero-industries-montage.mp4",
    );
    const euratechLogo = screen.getByAltText("Euratechnologies");
    expect(euratechLogo).toBeInTheDocument();
    expect(euratechLogo).toHaveAttribute(
      "src",
      "/logos/euratechnologies-wordmark-white.png",
    );
    expect(screen.getByText("RH").className).toContain(
      "text-[var(--brass-dark-700)]",
    );
    expect(screen.getByText("FINANCE").className).toContain(
      "text-[var(--brass-dark-700)]",
    );
    expect(screen.getByText("OPÉRATIONS").className).toContain(
      "text-[var(--brass-dark-700)]",
    );

    const supplyChainText = screen.getByText("SUPPLY CHAIN");
    expect(supplyChainText).toBeInTheDocument();
    expect(supplyChainText.className).toContain(
      "text-[var(--brass-dark-700)]",
    );
    expect(
      screen.getByLabelText("RH · FINANCE · OPÉRATIONS · SUPPLY CHAIN"),
    ).toBeInTheDocument();

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Réunissez toutes vos données.");
    expect(heading).toHaveTextContent(
      "Anticipez vos besoins. Optimisez vos décisions.",
    );
    expect(within(heading).getByText("données").className).toContain(
      "text-[var(--brass-dark-700)]",
    );
    expect(within(heading).getByText("Anticipez").className).toContain(
      "text-[var(--brass-dark-700)]",
    );
    expect(within(heading).getByText("Optimisez").className).toContain(
      "text-[var(--brass-dark-700)]",
    );
    expect(
      screen.getByText(
        "Praedixa réunit vos données RH, finance, opérations et supply chain au même endroit. Vous obtenez une base claire pour anticiper les besoins, optimiser les décisions et suivre ce qui rapporte vraiment, sans remplacer vos outils. Infrastructure et hébergement des données en France, sur Scaleway.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Réponse en 48h · lecture seule · entreprise française · données hébergées en France sur Scaleway",
      ),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Entreprise française")).toBeInTheDocument();
    expect(screen.queryByText("Fondateurs français")).not.toBeInTheDocument();
    expect(
      screen.getByText("Données hébergées en France sur Scaleway"),
    ).toBeInTheDocument();
    const incubatorClaim = screen.getByLabelText("Incubée à Euratechnologies");
    expect(incubatorClaim).toBeInTheDocument();
    expect(incubatorClaim.className).toContain("px-3");
    expect(incubatorClaim.className).toContain("py-1.5");
    expect(incubatorClaim.className).toContain("w-full");
    const proofRail = screen.getByLabelText("Preuves d'ancrage français");
    expect(proofRail.className).toContain("grid");
    expect(proofRail.className).toContain("grid-cols-3");
    expect(
      proofRail,
    ).toBeInTheDocument();
  });
});
