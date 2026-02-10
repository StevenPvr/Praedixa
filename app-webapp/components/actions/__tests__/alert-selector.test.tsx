import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { CoverageAlert } from "@praedixa/shared-types";
import { AlertSelector } from "../alert-selector";

vi.mock("@praedixa/ui", () => ({
  SkeletonCard: ({ className }: { className?: string }) => (
    <div data-testid="skeleton-card" className={className} />
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    variant,
  }: {
    children: React.ReactNode;
    variant?: string;
  }) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/detail-card", () => ({
  DetailCard: ({
    children,
    className,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <div className={className} onClick={onClick} {...props}>
      {children}
    </div>
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

const makeAlert = (id: string, severity: string, gapH: number): CoverageAlert =>
  ({
    id,
    siteId: `Site-${id}`,
    alertDate: "2026-02-10",
    shift: "AM",
    severity,
    gapH,
    pRupture: 0.3,
    status: "open",
    driversJson: [],
    horizon: "j7",
  }) as CoverageAlert;

describe("AlertSelector", () => {
  const alerts = [makeAlert("a1", "high", 6), makeAlert("a2", "medium", 3)];

  it("renders loading skeletons when loading", () => {
    render(
      <AlertSelector
        alerts={[]}
        selectedId={null}
        onSelect={vi.fn()}
        loading={true}
      />,
    );
    expect(screen.getAllByTestId("skeleton-card")).toHaveLength(3);
  });

  it("returns null when no alerts and not loading", () => {
    const { container } = render(
      <AlertSelector
        alerts={[]}
        selectedId={null}
        onSelect={vi.fn()}
        loading={false}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders alert cards", () => {
    render(
      <AlertSelector
        alerts={alerts}
        selectedId={null}
        onSelect={vi.fn()}
        loading={false}
      />,
    );
    expect(screen.getByTestId("alert-card-a1")).toBeInTheDocument();
    expect(screen.getByTestId("alert-card-a2")).toBeInTheDocument();
  });

  it("shows site name, date, shift for each alert", () => {
    render(
      <AlertSelector
        alerts={alerts}
        selectedId={null}
        onSelect={vi.fn()}
        loading={false}
      />,
    );
    expect(screen.getByText("Site-a1")).toBeInTheDocument();
    expect(screen.getByText("Site-a2")).toBeInTheDocument();
    expect(screen.getAllByText(/2026-02-10/)).toHaveLength(2);
  });

  it("shows severity badge", () => {
    render(
      <AlertSelector
        alerts={alerts}
        selectedId={null}
        onSelect={vi.fn()}
        loading={false}
      />,
    );
    expect(screen.getByText("Elevee")).toBeInTheDocument();
    expect(screen.getByText("Moderee")).toBeInTheDocument();
  });

  it("shows gap hours", () => {
    render(
      <AlertSelector
        alerts={alerts}
        selectedId={null}
        onSelect={vi.fn()}
        loading={false}
      />,
    );
    expect(screen.getByText("6h")).toBeInTheDocument();
    expect(screen.getByText("3h")).toBeInTheDocument();
  });

  it("highlights selected alert with ring", () => {
    render(
      <AlertSelector
        alerts={alerts}
        selectedId="a1"
        onSelect={vi.fn()}
        loading={false}
      />,
    );
    const card = screen.getByTestId("alert-card-a1");
    expect(card.className).toContain("ring-2 ring-amber-500");
  });

  it("does not highlight unselected alerts", () => {
    render(
      <AlertSelector
        alerts={alerts}
        selectedId="a1"
        onSelect={vi.fn()}
        loading={false}
      />,
    );
    const card = screen.getByTestId("alert-card-a2");
    expect(card.className).not.toContain("ring-2 ring-amber-500");
  });

  it("calls onSelect when clicking an alert card", () => {
    const onSelect = vi.fn();
    render(
      <AlertSelector
        alerts={alerts}
        selectedId={null}
        onSelect={onSelect}
        loading={false}
      />,
    );
    fireEvent.click(screen.getByTestId("alert-card-a2"));
    expect(onSelect).toHaveBeenCalledWith("a2");
  });

  it("uses default badge variant for unknown severities", () => {
    const unknownAlert = [makeAlert("a3", "unknown", 2)];

    render(
      <AlertSelector
        alerts={unknownAlert}
        selectedId={null}
        onSelect={vi.fn()}
        loading={false}
      />,
    );

    expect(screen.getByTestId("badge")).toHaveAttribute(
      "data-variant",
      "default",
    );
  });
});
