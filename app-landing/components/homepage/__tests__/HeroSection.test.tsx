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
  HeroBackgroundVideo: ({ mp4Src }: { mp4Src: string }) => (
    <div data-mp4-src={mp4Src} data-testid="hero-background-video" />
  ),
}));

describe("HeroSection", () => {
  it("clarifies the French hero value proposition", () => {
    render(<HeroSection locale="fr" dict={fr} />);

    expect(screen.getByText("RH")).toBeInTheDocument();
    expect(screen.getByText("FINANCE")).toBeInTheDocument();
    expect(screen.getByText("OPÉRATIONS")).toBeInTheDocument();
    expect(screen.queryByText("Restaurant")).not.toBeInTheDocument();
    expect(screen.getByTestId("hero-background-video")).toHaveAttribute(
      "data-mp4-src",
      "/hero-video/hero-industries-montage.mp4",
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
    expect(supplyChainText.className).toContain("text-[var(--brass-dark-700)]");
    expect(
      screen.getByLabelText("RH · FINANCE · OPÉRATIONS · SUPPLY CHAIN"),
    ).toBeInTheDocument();

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("DecisionOps");
    const heroSubheadline = screen.getByText(
      (_, element) =>
        element?.textContent ===
        "Anticiper vos besoins. Décidez plus tôt. Prouvez le ROI.",
    );
    expect(heroSubheadline).toBeInTheDocument();
    expect(within(heroSubheadline).getByText("Anticiper").className).toContain(
      "text-[var(--brass-400)]",
    );
    expect(within(heroSubheadline).getByText("Décidez").className).toContain(
      "text-[var(--brass-400)]",
    );
    expect(within(heroSubheadline).getByText("Prouvez").className).toContain(
      "text-[var(--brass-400)]",
    );
    expect(
      screen.getAllByText(
        "Praedixa se branche sur vos systèmes existants, fédère les données critiques sur une infrastructure hébergée en France, transforme vos arbitrages récurrents en décisions calculées, exécutées et auditables, puis prouve le ROI décision par décision en comité Ops / Finance.",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByText(
        "Réponse en 48h · lecture seule · entreprise française · données hébergées en France sur Scaleway",
      ),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Fondateurs français")).not.toBeInTheDocument();
    expect(
      screen.getAllByText(
        "Lecture seule sur l'existant · validation humaine · revue mensuelle Ops / Finance",
      ).length,
    ).toBeGreaterThan(0);
  });
});
