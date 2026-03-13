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
  it("keeps the French hero broad while stating the priority-risk entry point", () => {
    render(<HeroSection locale="fr" dict={fr} />);

    expect(
      screen.getByLabelText("Pour COO, DAF et directions réseau"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Effectifs · demande · stocks · rétention"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("hero-background-video")).toHaveAttribute(
      "data-src",
      "/hero-video/hero-industries-montage.mp4",
    );

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Anticipez");
    const heroSubheadline = screen.getByText(
      (_, element) =>
        element?.textContent ===
        "les risques business qui détruisent la marge.",
    );
    expect(heroSubheadline).toBeInTheDocument();
    expect(within(heroSubheadline).getByText("risques").className).toContain(
      "text-[var(--brass-400)]",
    );
    expect(within(heroSubheadline).getByText("marge").className).toContain(
      "text-[var(--brass-400)]",
    );
    expect(
      screen.getAllByText(
        "Praedixa détecte les écarts qui menacent votre activité et recommande les meilleures décisions à prendre sur les effectifs, la demande, les stocks, les approvisionnements et la rétention client. Nous commençons par le risque le plus coûteux sur votre périmètre.",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("5 jours ouvrés · lecture seule · validation humaine")
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "Effectifs, demande, stocks, approvisionnements, rétention",
      ),
    ).toBeInTheDocument();
  });
});
