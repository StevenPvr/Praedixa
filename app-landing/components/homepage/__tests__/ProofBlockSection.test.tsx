import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProofBlockSection } from "../ProofBlockSection";

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

vi.mock("next/image", () => ({
  default: ({
    fill: _fill,
    priority: _priority,
    unoptimized: _unoptimized,
    ...props
  }: Record<string, unknown>) => <img {...props} />,
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
vi.mock("framer-motion", () => {
  const React = require("react");
  const forwardMotion = (tag: string) =>
    React.forwardRef((props: any, ref: any) => {
      const passthroughProps = { ...props };
      delete passthroughProps.variants;
      delete passthroughProps.initial;
      delete passthroughProps.animate;
      delete passthroughProps.exit;
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
    AnimatePresence: ({ children }: any) => children,
    useReducedMotion: () => false,
  };
});

describe("ProofBlockSection", () => {
  it("renders the section with id='preuve'", () => {
    const { container } = render(<ProofBlockSection locale="fr" />);

    const section = container.querySelector("#preuve");
    expect(section).toBeInTheDocument();
    expect(section?.tagName).toBe("SECTION");
  });

  it("applies the dark variant class on the section", () => {
    const { container } = render(<ProofBlockSection locale="fr" />);

    const section = container.querySelector("#preuve");
    expect(section).toHaveClass("section-dark");
  });

  it("renders the kicker, heading, and body text", () => {
    render(<ProofBlockSection locale="fr" />);

    expect(screen.getByText("Preuve de ROI")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Des résultats concrets, pas des moyennes.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Chaque décision est tracée, reliée à son impact économique/,
      ),
    ).toBeInTheDocument();
  });

  it("renders 3 tabs from the proofPreview content", () => {
    render(<ProofBlockSection locale="fr" />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);

    expect(screen.getByRole("tab", { name: "Situation" })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Options comparées" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Impact mesuré" }),
    ).toBeInTheDocument();
  });

  it("shows the first tab content by default", () => {
    render(<ProofBlockSection locale="fr" />);

    expect(
      screen.getByText(/Trois sites font face à un pic d.activité/),
    ).toBeInTheDocument();
  });

  it("switches tab content when a different tab is clicked", async () => {
    const user = userEvent.setup();
    render(<ProofBlockSection locale="fr" />);

    await user.click(screen.getByRole("tab", { name: "Options comparées" }));

    expect(
      screen.getByText(/Chaque option est évaluée sur la même base/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Impact mesuré" }));

    expect(
      screen.getByText(
        /La réallocation entre sites a réduit les coûts d.urgence/,
      ),
    ).toBeInTheDocument();
  });

  it("renders 3 metrics", () => {
    render(<ProofBlockSection locale="fr" />);

    // "3" appears in both step indicator and metric — check metric via font-mono class
    const threeElements = screen.getAllByText("3");
    expect(threeElements.length).toBeGreaterThanOrEqual(2);

    // "Options comparées" appears as both a tab label and a metric label
    expect(
      screen.getAllByText("Options comparées").length,
    ).toBeGreaterThanOrEqual(2);

    expect(screen.getByText(/−12/)).toBeInTheDocument();
    expect(screen.getByText(/Coûts d.urgence/)).toBeInTheDocument();

    expect(screen.getByText("8j")).toBeInTheDocument();
    expect(screen.getByText("Anticipation")).toBeInTheDocument();
  });

  it("renders the CTA link pointing to the proof page", () => {
    render(<ProofBlockSection locale="fr" />);

    const ctaLink = screen.getByRole("link", {
      name: /Voir la preuve de ROI/,
    });
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink).toHaveAttribute("href", "/fr/decision-log-preuve-roi");
  });

  it("marks the first tab as selected by default", () => {
    render(<ProofBlockSection locale="fr" />);

    const firstTab = screen.getByRole("tab", {
      name: "Situation",
    });
    expect(firstTab).toHaveAttribute("aria-selected", "true");

    const secondTab = screen.getByRole("tab", {
      name: "Options comparées",
    });
    expect(secondTab).toHaveAttribute("aria-selected", "false");
  });
});
