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
      /Voir, comparer, décider, prouver/,
    );
  });

  it("renders the 4 verb labels (product sequence)", () => {
    render(<MethodBlockSection locale="fr" />);

    expect(screen.getAllByText(/Fédérer & voir/).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText(/Calculer & comparer/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Déclencher & décider/).length,
    ).toBeGreaterThanOrEqual(1);
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
      screen.getAllByText(/Tension détectée 8 jours/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/4 options comparées en 12 secondes/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Décision retenue et exécutée en 4h/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/cart recommandé vs réel/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("has section id methode", () => {
    const { container } = render(<MethodBlockSection locale="fr" />);
    expect(container.querySelector("#methode")).toBeInTheDocument();
  });
});
