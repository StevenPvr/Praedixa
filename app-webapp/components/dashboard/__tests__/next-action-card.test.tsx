import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextActionCard } from "../next-action-card";

/* ─── Mocks ──────────────────────────────────────────── */

vi.mock("@praedixa/ui", () => ({
  SkeletonCard: () => <div data-testid="skeleton-card" />,
}));

vi.mock("@/components/ui/detail-card", () => ({
  DetailCard: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="detail-card" className={className}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <span data-testid="badge" className={className}>
      {children}
    </span>
  ),
}));

vi.mock("@/lib/formatters", () => ({
  formatSeverity: (s: string) => {
    const m: Record<string, string> = {
      critical: "Critique",
      high: "Elevee",
      medium: "Moderee",
      low: "Faible",
    };
    return m[s] ?? s;
  },
}));

vi.mock("lucide-react", () => ({
  CheckCircle2: () => <svg data-testid="icon-check" />,
}));

/* ─── Mock data ──────────────────────────────────────── */

const makeAlert = (overrides: Record<string, unknown> = {}) => ({
  id: "a1",
  siteId: "Lyon",
  alertDate: "2026-02-10",
  shift: "AM",
  severity: "high",
  gapH: 4,
  pRupture: 0.3,
  status: "open",
  driversJson: ["absence_rate", "seasonal_peak"],
  ...overrides,
});

/* ─── Tests ──────────────────────────────────────────── */

describe("NextActionCard", () => {
  /* ── Loading state ──────────────────────── */

  it("shows SkeletonCard when loading", () => {
    render(<NextActionCard alerts={null} loading={true} />);
    expect(screen.getByTestId("skeleton-card")).toBeInTheDocument();
  });

  /* ── Empty state ────────────────────────── */

  it("shows success message when no alerts", () => {
    render(<NextActionCard alerts={[]} loading={false} />);
    expect(
      screen.getByText("Tous vos sites sont couverts pour les prochains jours"),
    ).toBeInTheDocument();
  });

  it("shows success message when alerts is null", () => {
    render(<NextActionCard alerts={null} loading={false} />);
    expect(
      screen.getByText("Tous vos sites sont couverts pour les prochains jours"),
    ).toBeInTheDocument();
  });

  it("renders success card with green border", () => {
    render(<NextActionCard alerts={[]} loading={false} />);
    const card = screen.getByTestId("detail-card");
    expect(card.className).toContain("border-l-green-400");
  });

  /* ── Single alert ───────────────────────── */

  it("renders the top alert site and date", () => {
    const alerts = [makeAlert()];
    render(<NextActionCard alerts={alerts} loading={false} />);
    expect(screen.getByText(/Lyon/)).toBeInTheDocument();
  });

  it("renders the shift", () => {
    const alerts = [makeAlert()];
    render(<NextActionCard alerts={alerts} loading={false} />);
    expect(screen.getByText(/Poste : AM/)).toBeInTheDocument();
  });

  it("renders the severity badge", () => {
    const alerts = [makeAlert()];
    render(<NextActionCard alerts={alerts} loading={false} />);
    expect(screen.getByTestId("badge")).toHaveTextContent("Elevee");
  });

  it("renders the gap hours", () => {
    const alerts = [makeAlert()];
    render(<NextActionCard alerts={alerts} loading={false} />);
    expect(screen.getByText("4h")).toBeInTheDocument();
    expect(screen.getByText("manquantes")).toBeInTheDocument();
  });

  it("renders driver labels", () => {
    const alerts = [makeAlert()];
    render(<NextActionCard alerts={alerts} loading={false} />);
    expect(screen.getByText("Taux d'absence eleve")).toBeInTheDocument();
    expect(screen.getByText("Pic saisonnier")).toBeInTheDocument();
  });

  it("renders CTA link to /actions", () => {
    const alerts = [makeAlert()];
    render(<NextActionCard alerts={alerts} loading={false} />);
    const link = screen.getByText("Voir les solutions");
    expect(link).toHaveAttribute("href", "/actions");
  });

  /* ── Sorting logic ─────────────────────── */

  it("picks critical alert over high alert", () => {
    const alerts = [
      makeAlert({ id: "a1", severity: "high", gapH: 10, siteId: "Lyon" }),
      makeAlert({
        id: "a2",
        severity: "critical",
        gapH: 2,
        siteId: "Paris",
      }),
    ];
    render(<NextActionCard alerts={alerts} loading={false} />);
    expect(screen.getByText(/Paris/)).toBeInTheDocument();
    expect(screen.getByTestId("badge")).toHaveTextContent("Critique");
  });

  it("picks higher gapH when same severity", () => {
    const alerts = [
      makeAlert({ id: "a1", severity: "high", gapH: 3, siteId: "Lyon" }),
      makeAlert({ id: "a2", severity: "high", gapH: 8, siteId: "Paris" }),
    ];
    render(<NextActionCard alerts={alerts} loading={false} />);
    expect(screen.getByText("8h")).toBeInTheDocument();
    expect(screen.getByText(/Paris/)).toBeInTheDocument();
  });

  /* ── Driver formatting ─────────────────── */

  it("formats unknown drivers with underscore replacement", () => {
    const alerts = [makeAlert({ driversJson: ["custom_driver_name"] })];
    render(<NextActionCard alerts={alerts} loading={false} />);
    expect(screen.getByText("custom driver name")).toBeInTheDocument();
  });

  it("does not render drivers section when driversJson is empty", () => {
    const alerts = [makeAlert({ driversJson: [] })];
    render(<NextActionCard alerts={alerts} loading={false} />);
    expect(screen.queryByText("Taux d'absence eleve")).not.toBeInTheDocument();
  });

  /* ── Severity badge colors ─────────────── */

  it("applies correct badge color for critical", () => {
    const alerts = [makeAlert({ severity: "critical" })];
    render(<NextActionCard alerts={alerts} loading={false} />);
    expect(screen.getByTestId("badge").className).toContain("text-red-600");
  });

  it("applies correct badge color for medium", () => {
    const alerts = [makeAlert({ severity: "medium" })];
    render(<NextActionCard alerts={alerts} loading={false} />);
    expect(screen.getByTestId("badge").className).toContain("text-amber-600");
  });

  it("applies correct badge color for low", () => {
    const alerts = [makeAlert({ severity: "low" })];
    render(<NextActionCard alerts={alerts} loading={false} />);
    expect(screen.getByTestId("badge").className).toContain("text-gray-600");
  });

  /* ── Unknown severity fallback ─────────── */

  it("handles unknown severity with fallback sort order and empty color", () => {
    const alerts = [
      makeAlert({
        id: "a1",
        severity: "unknown" as string,
        gapH: 5,
        siteId: "Marseille",
      }),
    ];
    render(<NextActionCard alerts={alerts} loading={false} />);
    expect(screen.getByText(/Marseille/)).toBeInTheDocument();
    expect(screen.getByText("5h")).toBeInTheDocument();
  });

  it("sorts unknown severity below all known severities", () => {
    const alerts = [
      makeAlert({
        id: "a1",
        severity: "unknown" as string,
        gapH: 10,
        siteId: "Marseille",
      }),
      makeAlert({ id: "a2", severity: "low", gapH: 1, siteId: "Lyon" }),
    ];
    render(<NextActionCard alerts={alerts} loading={false} />);
    // low (order 3) < unknown (order 4), so Lyon should be picked
    expect(screen.getByText(/Lyon/)).toBeInTheDocument();
  });

  it("sorts by gapH when both alerts have unknown severity", () => {
    const alerts = [
      makeAlert({ id: "a1", severity: "x" as string, gapH: 3, siteId: "Nice" }),
      makeAlert({
        id: "a2",
        severity: "y" as string,
        gapH: 7,
        siteId: "Lille",
      }),
    ];
    render(<NextActionCard alerts={alerts} loading={false} />);
    // Same fallback order (4), so gapH desc → Lille (7h)
    expect(screen.getByText("7h")).toBeInTheDocument();
    expect(screen.getByText(/Lille/)).toBeInTheDocument();
  });
});
