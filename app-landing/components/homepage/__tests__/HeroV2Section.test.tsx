import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HeroV2Section } from "../HeroV2Section";

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
vi.mock("../HeroV2Client", () => ({
  HeroV2Client: ({
    poster,
    videoSrc,
  }: {
    poster: string;
    videoSrc: string;
  }) => (
    <div
      data-testid="hero-v2-client"
      data-poster={poster}
      data-video-src={videoSrc}
    />
  ),
}));

describe("HeroV2Section", () => {
  it("renders the French hero heading with the highlight span", () => {
    render(<HeroV2Section locale="fr" />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Prévoyez la demande,");
    expect(heading).toHaveTextContent("anticipez stock et effectifs.");
  });

  it("renders the kicker eyebrow text", () => {
    render(<HeroV2Section locale="fr" />);

    expect(
      screen.getByText("Pour les franchisés de restauration rapide multi-sites"),
    ).toBeInTheDocument();
  });

  it("renders the subheading paragraph", () => {
    render(<HeroV2Section locale="fr" />);

    expect(
      screen.getByText(
        /Praedixa relie vos caisses, plannings, apps de livraison, promotions, signaux stock et terrain/,
      ),
    ).toBeInTheDocument();
  });

  it("renders two CTA links with correct hrefs", () => {
    render(<HeroV2Section locale="fr" />);

    const primaryCta = screen.getByRole("link", {
      name: "Voir la preuve de ROI",
    });
    expect(primaryCta).toHaveAttribute("href", "/fr/decision-log-preuve-roi");

    const secondaryCta = screen.getByRole("link", {
      name: "Cadrer mon réseau",
    });
    expect(secondaryCta).toHaveAttribute(
      "href",
      "/fr/contact?intent=deploiement",
    );
  });

  it("renders reassurance proof chips", () => {
    render(<HeroV2Section locale="fr" />);

    expect(screen.getByText("Lecture seule")).toBeInTheDocument();
    expect(screen.getByText("POS + planning + stock + delivery")).toBeInTheDocument();
    expect(screen.getByText("Hébergement France")).toBeInTheDocument();
    expect(screen.getByText("NDA sur demande")).toBeInTheDocument();
  });

  it("renders the HeroV2Client mock with poster and video src", () => {
    render(<HeroV2Section locale="fr" />);

    const clientMock = screen.getByTestId("hero-v2-client");
    expect(clientMock).toHaveAttribute(
      "data-poster",
      "/hero-video/hero-industries-montage.jpg",
    );
    expect(clientMock).toHaveAttribute(
      "data-video-src",
      "/hero-video/hero-industries-montage.mp4",
    );
  });

  it("does not render fake metric cards (DecisionConsole / FloatingProof)", () => {
    render(<HeroV2Section locale="fr" />);

    expect(screen.queryByText("Signal actif")).not.toBeInTheDocument();
    expect(screen.queryByText("Marge protegee")).not.toBeInTheDocument();
  });
});
