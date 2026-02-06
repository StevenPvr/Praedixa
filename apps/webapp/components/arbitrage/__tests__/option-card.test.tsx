import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OptionCard } from "../option-card";

vi.mock("@praedixa/ui", () => ({
  StatusBadge: ({ variant, label }: { variant: string; label: string }) => (
    <span data-testid="status-badge" data-variant={variant}>
      {label}
    </span>
  ),
}));

vi.mock("lucide-react", () => ({
  Clock: () => <svg data-testid="icon-clock" />,
  UserPlus: () => <svg data-testid="icon-userplus" />,
  ArrowLeftRight: () => <svg data-testid="icon-arrowleftright" />,
  ShieldAlert: () => <svg data-testid="icon-shieldalert" />,
  GraduationCap: () => <svg data-testid="icon-graduationcap" />,
  CalendarClock: () => <svg data-testid="icon-calendarclock" />,
  Check: () => <svg data-testid="icon-check" />,
  Loader2: () => <svg data-testid="icon-loader" />,
}));

function makeOption(
  overrides: Partial<{
    type: string;
    label: string;
    cost: number;
    delayDays: number;
    coverageImpactPct: number;
    riskLevel: "low" | "medium" | "high";
    riskDetails: string;
    pros: string[];
    cons: string[];
  }> = {},
) {
  return {
    type: overrides.type ?? "overtime",
    label: overrides.label ?? "Heures supplementaires",
    cost: overrides.cost ?? 5000,
    delayDays: overrides.delayDays ?? 1,
    coverageImpactPct: overrides.coverageImpactPct ?? 10,
    riskLevel: overrides.riskLevel ?? "low",
    riskDetails: overrides.riskDetails ?? "Risque faible",
    pros: overrides.pros ?? ["Rapide"],
    cons: overrides.cons ?? ["Couteux"],
  };
}

const defaultProps = {
  option: makeOption(),
  index: 0,
  isRecommended: false,
  isSelected: false,
  onValidate: vi.fn(),
  validating: false,
};

describe("OptionCard", () => {
  it("renders option label", () => {
    render(<OptionCard {...defaultProps} />);
    expect(screen.getByText("Heures supplementaires")).toBeInTheDocument();
  });

  it("renders cost in EUR format", () => {
    render(<OptionCard {...defaultProps} />);
    // Intl.NumberFormat with fr-FR and EUR
    expect(screen.getByText(/5[\s\u202f]000/)).toBeInTheDocument();
  });

  it("renders delay days", () => {
    render(<OptionCard {...defaultProps} />);
    expect(screen.getByText("1 jour")).toBeInTheDocument();
  });

  it("renders plural days", () => {
    render(
      <OptionCard {...defaultProps} option={makeOption({ delayDays: 3 })} />,
    );
    expect(screen.getByText("3 jours")).toBeInTheDocument();
  });

  it("renders coverage impact with + prefix for positive", () => {
    render(<OptionCard {...defaultProps} />);
    expect(screen.getByText("+10%")).toBeInTheDocument();
  });

  it("renders risk badge", () => {
    render(<OptionCard {...defaultProps} />);
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-variant", "success");
    expect(badge).toHaveTextContent("Faible");
  });

  it("renders risk details", () => {
    render(<OptionCard {...defaultProps} />);
    expect(screen.getByText("Risque faible")).toBeInTheDocument();
  });

  it("renders pros and cons lists", () => {
    render(<OptionCard {...defaultProps} />);
    expect(screen.getByText("Rapide")).toBeInTheDocument();
    expect(screen.getByText("Couteux")).toBeInTheDocument();
    expect(screen.getByText("Avantages")).toBeInTheDocument();
    expect(screen.getByText("Inconvenients")).toBeInTheDocument();
  });

  it("shows 'Recommande' badge when isRecommended", () => {
    render(<OptionCard {...defaultProps} isRecommended={true} />);
    expect(screen.getByText("Recommande")).toBeInTheDocument();
  });

  it("does not show 'Recommande' badge when not recommended", () => {
    render(<OptionCard {...defaultProps} isRecommended={false} />);
    expect(screen.queryByText("Recommande")).not.toBeInTheDocument();
  });

  it("calls onValidate with index when button clicked", () => {
    const onValidate = vi.fn();
    render(<OptionCard {...defaultProps} index={2} onValidate={onValidate} />);
    fireEvent.click(screen.getByText("Valider cette option"));
    expect(onValidate).toHaveBeenCalledWith(2);
  });

  it("shows 'Validation...' when validating", () => {
    render(<OptionCard {...defaultProps} validating={true} />);
    expect(screen.getByText("Validation...")).toBeInTheDocument();
    expect(screen.queryByText("Valider cette option")).not.toBeInTheDocument();
  });

  it("disables button when validating", () => {
    render(<OptionCard {...defaultProps} validating={true} />);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
  });

  it("disables button when disabled prop is true", () => {
    render(<OptionCard {...defaultProps} disabled={true} />);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
  });

  it("renders article with aria-label", () => {
    render(<OptionCard {...defaultProps} />);
    expect(
      screen.getByRole("article", {
        name: "Option : Heures supplementaires",
      }),
    ).toBeInTheDocument();
  });

  it("does not render pros/cons when empty", () => {
    render(
      <OptionCard
        {...defaultProps}
        option={makeOption({ pros: [], cons: [] })}
      />,
    );
    expect(screen.queryByText("Avantages")).not.toBeInTheDocument();
    expect(screen.queryByText("Inconvenients")).not.toBeInTheDocument();
  });

  it("maps medium risk to warning variant", () => {
    render(
      <OptionCard
        {...defaultProps}
        option={makeOption({ riskLevel: "medium" })}
      />,
    );
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-variant", "warning");
    expect(badge).toHaveTextContent("Moyen");
  });

  it("maps high risk to danger variant", () => {
    render(
      <OptionCard
        {...defaultProps}
        option={makeOption({ riskLevel: "high" })}
      />,
    );
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-variant", "danger");
    expect(badge).toHaveTextContent("Eleve");
  });

  it("renders negative coverageImpactPct with danger-600 class and no + prefix", () => {
    render(
      <OptionCard
        {...defaultProps}
        option={makeOption({ coverageImpactPct: -5 })}
      />,
    );
    const coverageSpan = screen.getByText("-5%");
    expect(coverageSpan).toBeInTheDocument();
    expect(coverageSpan.className).toContain("text-danger-600");
  });

  it("renders zero coverageImpactPct with charcoal class and no + prefix", () => {
    render(
      <OptionCard
        {...defaultProps}
        option={makeOption({ coverageImpactPct: 0 })}
      />,
    );
    const coverageSpan = screen.getByText("0%");
    expect(coverageSpan).toBeInTheDocument();
    expect(coverageSpan.className).toContain("text-charcoal");
  });
});
