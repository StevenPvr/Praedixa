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
      const { variants, initial, animate, whileInView, viewport, transition, ...rest } = props;
      return React.createElement(tag, { ...rest, ref });
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
    expect(heading).toHaveTextContent("L\u2019IA qui anticipe, optimise");
    expect(heading).toHaveTextContent("et prouve votre ROI.");
  });

  it("renders the eyebrow kicker text", () => {
    render(<HeroPulsorSection locale="fr" />);

    expect(
      screen.getByText("Pour les réseaux multi-sites"),
    ).toBeInTheDocument();
  });

  it("renders the blue badge text", () => {
    render(<HeroPulsorSection locale="fr" />);

    expect(screen.getByText("IA DÉCISIONNELLE")).toBeInTheDocument();
  });

  it("renders the subheading paragraph", () => {
    render(<HeroPulsorSection locale="fr" />);

    expect(
      screen.getByText(
        /Praedixa connecte vos données existantes/,
      ),
    ).toBeInTheDocument();
  });

  it("renders CTA links with correct hrefs (swapped per PRD)", () => {
    render(<HeroPulsorSection locale="fr" />);

    // Primary CTA (dark pill) → contact
    const contactCta = screen.getByRole("link", {
      name: /Parler à un expert/,
    });
    expect(contactCta).toHaveAttribute(
      "href",
      "/fr/contact?intent=deploiement",
    );

    // Secondary CTA (glass pill) → proof
    const proofCta = screen.getByRole("link", {
      name: /Voir la preuve sur historique/,
    });
    expect(proofCta).toHaveAttribute("href", "/fr/decision-log-preuve-roi");
  });

  it("renders reassurance trust chips", () => {
    render(<HeroPulsorSection locale="fr" />);

    expect(screen.getByText("Lecture seule")).toBeInTheDocument();
    expect(screen.getByText("Données agrégées")).toBeInTheDocument();
    expect(screen.getByText("Hébergement France")).toBeInTheDocument();
    expect(screen.getByText("NDA sur demande")).toBeInTheDocument();
  });

  it("renders proof block with role chips", () => {
    render(<HeroPulsorSection locale="fr" />);

    expect(screen.getByText("COO")).toBeInTheDocument();
    expect(screen.getByText("DIR. OPS")).toBeInTheDocument();
    expect(screen.getByText("FINANCE")).toBeInTheDocument();
    expect(screen.getByText("DSI")).toBeInTheDocument();
  });

  it("renders the micro-pill", () => {
    render(<HeroPulsorSection locale="fr" />);

    expect(
      screen.getByText(/Décisions tracées/),
    ).toBeInTheDocument();
  });

  it("renders the logo rail caption", () => {
    render(<HeroPulsorSection locale="fr" />);

    expect(
      screen.getByText("Ils nous font confiance"),
    ).toBeInTheDocument();
  });

  it("renders correctly for the English locale", () => {
    render(<HeroPulsorSection locale="en" />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("AI that anticipates, optimizes");
    expect(heading).toHaveTextContent("and proves your ROI.");
    expect(screen.getByText("DECISION AI")).toBeInTheDocument();
    expect(screen.getByText("They trust us")).toBeInTheDocument();
  });
});
