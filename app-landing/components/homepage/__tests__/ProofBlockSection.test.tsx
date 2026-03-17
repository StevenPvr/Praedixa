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

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
}));

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

    expect(screen.getByText("Preuve en action")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Un dossier de preuve, pas un dashboard de plus.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Chaque décision génère un dossier structuré/),
    ).toBeInTheDocument();
  });

  it("renders 3 tabs from the proofPreview content", () => {
    render(<ProofBlockSection locale="fr" />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);

    expect(
      screen.getByRole("tab", { name: "Situation initiale" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Options comparées" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Impact relu" }),
    ).toBeInTheDocument();
  });

  it("shows the first tab content by default", () => {
    render(<ProofBlockSection locale="fr" />);

    expect(
      screen.getByText(/Trois sites logistiques absorbent un pic de charge/),
    ).toBeInTheDocument();
  });

  it("switches tab content when a different tab is clicked", async () => {
    const user = userEvent.setup();
    render(<ProofBlockSection locale="fr" />);

    await user.click(screen.getByRole("tab", { name: "Options comparées" }));

    expect(
      screen.getByText(/Heures supplémentaires locales \(base 100\)/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Impact relu" }));

    expect(
      screen.getByText(
        /La réallocation inter-sites a réduit le coût d.urgence/,
      ),
    ).toBeInTheDocument();
  });

  it("renders 3 metrics", () => {
    render(<ProofBlockSection locale="fr" />);

    expect(screen.getByText("3")).toBeInTheDocument();
    // "Options comparées" appears as both a tab label and a metric label
    expect(
      screen.getAllByText("Options comparées").length,
    ).toBeGreaterThanOrEqual(2);

    expect(screen.getByText("−12%")).toBeInTheDocument();
    expect(screen.getByText(/Coût d.urgence/)).toBeInTheDocument();

    expect(screen.getByText("8j")).toBeInTheDocument();
    expect(screen.getByText("Anticipation")).toBeInTheDocument();
  });

  it("renders the CTA link pointing to the proof page", () => {
    render(<ProofBlockSection locale="fr" />);

    const ctaLink = screen.getByRole("link", {
      name: /Voir la preuve sur historique/,
    });
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink).toHaveAttribute("href", "/fr/decision-log-preuve-roi");
  });

  it("marks the first tab as selected by default", () => {
    render(<ProofBlockSection locale="fr" />);

    const firstTab = screen.getByRole("tab", {
      name: "Situation initiale",
    });
    expect(firstTab).toHaveAttribute("aria-selected", "true");

    const secondTab = screen.getByRole("tab", {
      name: "Options comparées",
    });
    expect(secondTab).toHaveAttribute("aria-selected", "false");
  });
});
