import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HeroPulsorSection } from "../HeroPulsorSection";

/* eslint-disable @typescript-eslint/no-explicit-any */
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
vi.mock("framer-motion", () => {
  const React = require("react");
  const forwardMotion = (tag: string) =>
    React.forwardRef((props: any, ref: any) => {
      const passthroughProps = { ...props };
      delete passthroughProps.variants;
      delete passthroughProps.initial;
      delete passthroughProps.animate;
      delete passthroughProps.whileInView;
      delete passthroughProps.viewport;
      delete passthroughProps.transition;
      return React.createElement(tag, { ...passthroughProps, ref });
    });
  return {
    motion: new Proxy(
      {},
      { get: (_t: any, prop: string) => forwardMotion(prop) },
    ),
    useReducedMotion: () => false,
    AnimatePresence: ({ children }: any) => children,
  };
});

describe("HeroPulsorSection", () => {
  it("renders the French hero heading with the highlight span", () => {
    render(<HeroPulsorSection locale="fr" />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Prévoyez la demande,");
    expect(heading).toHaveTextContent("anticipez stock et effectifs.");
  });

  it("renders the eyebrow kicker text", () => {
    render(<HeroPulsorSection locale="fr" />);

    expect(
      screen.getByText("Pour les franchisés de restauration rapide multi-sites"),
    ).toBeInTheDocument();
  });

  it("removes the extra hero micro-pills", () => {
    render(<HeroPulsorSection locale="fr" />);

    expect(screen.queryByText("QSR OPS")).not.toBeInTheDocument();
    expect(screen.queryByText("30j")).not.toBeInTheDocument();
  });

  it("renders the subheading paragraph", () => {
    render(<HeroPulsorSection locale="fr" />);

    expect(
      screen.getByText(
        /Praedixa relie vos caisses, plannings, apps de livraison, promotions, signaux stock et terrain/,
      ),
    ).toBeInTheDocument();
  });

  it("renders CTA links with correct hrefs (swapped per PRD)", () => {
    render(<HeroPulsorSection locale="fr" />);

    // Primary CTA (dark pill) → contact
    const contactCta = screen.getByRole("link", {
      name: /Cadrer mon réseau/,
    });
    expect(contactCta).toHaveAttribute(
      "href",
      "/fr/contact?intent=deploiement",
    );

    // Secondary CTA (glass pill) → proof
    const proofCta = screen.getByRole("link", {
      name: /Voir la preuve de ROI/,
    });
    expect(proofCta).toHaveAttribute("href", "/fr/decision-log-preuve-roi");
  });

  it("renders reassurance trust chips", () => {
    render(<HeroPulsorSection locale="fr" />);

    expect(screen.getByText("Lecture seule")).toBeInTheDocument();
    expect(screen.getByText("POS + planning + stock + delivery")).toBeInTheDocument();
    expect(screen.getByText("Hébergement France")).toBeInTheDocument();
    expect(screen.getByText("NDA sur demande")).toBeInTheDocument();
  });

  it("renders a background hero video montage", () => {
    render(<HeroPulsorSection locale="fr" />);

    const video = screen.getByTestId(
      "hero-background-video",
    ) as HTMLVideoElement;
    expect(video).toHaveAttribute("autoplay");
    expect(video).toHaveAttribute("loop");
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute(
      "poster",
      "/hero-video/restaurant-hero-poster.jpg",
    );
    expect(screen.getByTestId("hero-video-overlay-base")).toHaveClass(
      "bg-[rgba(7,12,17,0.3)]",
    );
    expect(screen.getByTestId("hero-video-overlay-gradient")).toHaveClass(
      "bg-[linear-gradient(90deg,rgba(7,12,17,0.64)_0%,rgba(7,12,17,0.54)_36%,rgba(7,12,17,0.22)_62%,rgba(7,12,17,0.44)_100%)]",
    );
  });

  it("removes the old signal board and logo rail from the hero", () => {
    render(<HeroPulsorSection locale="fr" />);

    expect(
      screen.queryByText("Projection demande + effectifs"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Ils nous font confiance"),
    ).not.toBeInTheDocument();
  });

  it("renders correctly for the English locale", () => {
    render(<HeroPulsorSection locale="en" />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Forecast demand,");
    expect(heading).toHaveTextContent("inventory and staffing.");
    expect(screen.queryByText("QSR OPS")).not.toBeInTheDocument();
    expect(screen.queryByText("30d")).not.toBeInTheDocument();
    expect(screen.getByTestId("hero-background-video")).toBeInTheDocument();
  });
});
