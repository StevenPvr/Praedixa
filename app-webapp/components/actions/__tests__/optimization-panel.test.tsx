import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ScenarioOption } from "@praedixa/shared-types";
import { OptimizationPanel } from "../optimization-panel";

vi.mock("@praedixa/ui", () => ({
  SkeletonCard: () => <div data-testid="skeleton-card" />,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    variant,
    className,
  }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
  }) => (
    <span data-testid="badge" data-variant={variant} className={className}>
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

vi.mock("@/lib/scenario-utils", () => ({
  getOptionLabel: (t: string) => {
    const m: Record<string, string> = {
      hs: "Heures supplementaires",
      interim: "Interim",
    };
    return m[t] ?? t;
  },
  simulateCostCI: (cost: number) => ({
    lower: cost * 0.8,
    upper: cost * 1.2,
    mid: cost,
  }),
  simulateServiceCI: (s: number) => ({
    lower: Math.max(0, s - 5),
    upper: Math.min(100, s + 3),
    mid: s,
  }),
  formatCostRange: (ci: { lower: number; upper: number; mid: number }) =>
    `${ci.mid} EUR (${ci.lower} — ${ci.upper} EUR)`,
}));

const makeOption = (
  id: string,
  type: string,
  cost: number,
  service: number,
  overrides?: Partial<ScenarioOption>,
): ScenarioOption =>
  ({
    id,
    coverageAlertId: "alert-1",
    costParameterId: "cp-1",
    optionType: type,
    label: type,
    coutTotalEur: cost,
    serviceAttenduPct: service,
    heuresCouvertes: 4,
    isParetoOptimal: false,
    isRecommended: false,
    contraintesJson: {},
    ...overrides,
  }) as ScenarioOption;

describe("OptimizationPanel", () => {
  const options = [
    makeOption("o1", "hs", 500, 85),
    makeOption("o2", "interim", 800, 95, {
      isParetoOptimal: true,
      isRecommended: true,
    }),
  ];

  it("renders loading skeletons when loading", () => {
    render(
      <OptimizationPanel
        options={[]}
        selectedOptionId={null}
        onSelectOption={vi.fn()}
        loading={true}
      />,
    );
    expect(screen.getAllByTestId("skeleton-card")).toHaveLength(3);
  });

  it("renders empty state when no options and not loading", () => {
    const { container } = render(
      <OptimizationPanel
        options={[]}
        selectedOptionId={null}
        onSelectOption={vi.fn()}
        loading={false}
      />,
    );
    expect(container).toHaveTextContent(
      "Aucun scenario exploitable pour cette alerte.",
    );
  });

  it("renders option cards", () => {
    render(
      <OptimizationPanel
        options={options}
        selectedOptionId={null}
        onSelectOption={vi.fn()}
        loading={false}
      />,
    );
    expect(screen.getByTestId("option-card-o1")).toBeInTheDocument();
    expect(screen.getByTestId("option-card-o2")).toBeInTheDocument();
  });

  it("shows option type labels", () => {
    render(
      <OptimizationPanel
        options={options}
        selectedOptionId={null}
        onSelectOption={vi.fn()}
        loading={false}
      />,
    );
    expect(screen.getByText("Heures supplementaires")).toBeInTheDocument();
    expect(screen.getByText("Interim")).toBeInTheDocument();
  });

  it("shows cost range with confidence interval", () => {
    render(
      <OptimizationPanel
        options={options}
        selectedOptionId={null}
        onSelectOption={vi.fn()}
        loading={false}
      />,
    );
    expect(screen.getByText(/500 EUR \(400 — 600 EUR\)/)).toBeInTheDocument();
  });

  it("shows service coverage with confidence interval", () => {
    render(
      <OptimizationPanel
        options={options}
        selectedOptionId={null}
        onSelectOption={vi.fn()}
        loading={false}
      />,
    );
    expect(screen.getByTestId("option-card-o1")).toHaveTextContent(
      "85% (80% - 88%)",
    );
  });

  it("shows hours covered", () => {
    render(
      <OptimizationPanel
        options={options}
        selectedOptionId={null}
        onSelectOption={vi.fn()}
        loading={false}
      />,
    );
    const hourElements = screen.getAllByText(/Heures couvertes/);
    expect(hourElements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows Pareto badge for Pareto optimal option", () => {
    render(
      <OptimizationPanel
        options={options}
        selectedOptionId={null}
        onSelectOption={vi.fn()}
        loading={false}
      />,
    );
    expect(screen.getByText("Pareto")).toBeInTheDocument();
  });

  it("shows Recommande badge for recommended option", () => {
    render(
      <OptimizationPanel
        options={options}
        selectedOptionId={null}
        onSelectOption={vi.fn()}
        loading={false}
      />,
    );
    expect(screen.getByText("Recommande")).toBeInTheDocument();
  });

  it("highlights recommended option with amber bg", () => {
    render(
      <OptimizationPanel
        options={options}
        selectedOptionId={null}
        onSelectOption={vi.fn()}
        loading={false}
      />,
    );
    const card = screen.getByTestId("option-card-o2");
    expect(card.className).toContain("ring-1 ring-amber-200");
  });

  it("does not highlight non-recommended option with amber bg", () => {
    render(
      <OptimizationPanel
        options={options}
        selectedOptionId={null}
        onSelectOption={vi.fn()}
        loading={false}
      />,
    );
    const card = screen.getByTestId("option-card-o1");
    expect(card.className).not.toContain("bg-amber-50/50");
  });

  it("highlights selected option with ring", () => {
    render(
      <OptimizationPanel
        options={options}
        selectedOptionId="o1"
        onSelectOption={vi.fn()}
        loading={false}
      />,
    );
    const card = screen.getByTestId("option-card-o1");
    expect(card.className).toContain("border-primary");
    expect(card.className).toContain("bg-primary/[0.06]");
  });

  it("calls onSelectOption when clicking an option card", () => {
    const onSelect = vi.fn();
    render(
      <OptimizationPanel
        options={options}
        selectedOptionId={null}
        onSelectOption={onSelect}
        loading={false}
      />,
    );
    fireEvent.click(screen.getByTestId("option-card-o1"));
    expect(onSelect).toHaveBeenCalledWith("o1");
  });
});
