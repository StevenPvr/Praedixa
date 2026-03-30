import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MethodBlockSection } from "../MethodBlockSection";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span {...props}>{children}</span>
    ),
  },
  useReducedMotion: () => false,
  useScroll: () => ({
    scrollYProgress: { get: () => 0, on: () => () => {} },
  }),
  useMotionValueEvent: () => {},
}));

describe("MethodBlockSection", () => {
  it("renders kicker and heading", () => {
    render(<MethodBlockSection locale="fr" />);

    expect(screen.getByText(/Comment ça marche/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      /Quatre étapes pour prévoir et décider avant le rush/,
    );
  });

  it("renders the 4 verb labels (product sequence)", () => {
    render(<MethodBlockSection locale="fr" />);

    expect(screen.getAllByText(/Anticiper/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Comparer/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Décider/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Prouver/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders step numbers 01-04", () => {
    render(<MethodBlockSection locale="fr" />);

    expect(screen.getAllByText("01").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("02").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("03").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("04").length).toBeGreaterThanOrEqual(1);
  });

  it("renders microproof text for each step", () => {
    render(<MethodBlockSection locale="fr" />);

    expect(
      screen.getAllByText(/Rush détecté 5/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/3 scénarios comparés en 17/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Décision prise le matin pour le service du soir/)
        .length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/7,4.*heures d.urgence/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("has section id methode", () => {
    const { container } = render(<MethodBlockSection locale="fr" />);
    expect(container.querySelector("#methode")).toBeInTheDocument();
  });
});
