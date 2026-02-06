import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OptionsComparison } from "../options-comparison";

vi.mock("@praedixa/ui", () => ({
  SkeletonCard: ({ className }: { className?: string }) => (
    <div data-testid="skeleton-card" className={className} />
  ),
}));

vi.mock("../option-card", () => ({
  OptionCard: ({
    option,
    index,
    isRecommended,
    isSelected,
    validating,
    disabled,
  }: {
    option: { label: string; type: string };
    index: number;
    isRecommended: boolean;
    isSelected: boolean;
    validating: boolean;
    disabled?: boolean;
  }) => (
    <div
      data-testid={`option-card-${index}`}
      data-recommended={isRecommended}
      data-selected={isSelected}
      data-validating={validating}
      data-disabled={disabled}
    >
      {option.label}
    </div>
  ),
}));

function makeOption(type: string, label: string) {
  return {
    type,
    label,
    cost: 1000,
    delayDays: 1,
    coverageImpactPct: 5,
    riskLevel: "low" as const,
    riskDetails: "Test",
    pros: [],
    cons: [],
  };
}

describe("OptionsComparison", () => {
  it("renders 4 skeleton cards when loading", () => {
    render(
      <OptionsComparison
        options={[]}
        recommendationIndex={0}
        loading={true}
        onValidate={vi.fn()}
        validatingIndex={-1}
        selectedIndex={-1}
      />,
    );
    expect(screen.getAllByTestId("skeleton-card")).toHaveLength(4);
  });

  it("renders option cards for each option", () => {
    const options = [
      makeOption("overtime", "Heures sup"),
      makeOption("external", "Externe"),
    ];

    render(
      <OptionsComparison
        options={options}
        recommendationIndex={1}
        loading={false}
        onValidate={vi.fn()}
        validatingIndex={-1}
        selectedIndex={-1}
      />,
    );

    expect(screen.getByTestId("option-card-0")).toHaveTextContent("Heures sup");
    expect(screen.getByTestId("option-card-1")).toHaveTextContent("Externe");
  });

  it("marks the recommended option", () => {
    const options = [
      makeOption("overtime", "Heures sup"),
      makeOption("external", "Externe"),
    ];

    render(
      <OptionsComparison
        options={options}
        recommendationIndex={1}
        loading={false}
        onValidate={vi.fn()}
        validatingIndex={-1}
        selectedIndex={-1}
      />,
    );

    expect(screen.getByTestId("option-card-0")).toHaveAttribute(
      "data-recommended",
      "false",
    );
    expect(screen.getByTestId("option-card-1")).toHaveAttribute(
      "data-recommended",
      "true",
    );
  });

  it("marks the validating option and disables others", () => {
    const options = [
      makeOption("overtime", "Heures sup"),
      makeOption("external", "Externe"),
    ];

    render(
      <OptionsComparison
        options={options}
        recommendationIndex={0}
        loading={false}
        onValidate={vi.fn()}
        validatingIndex={0}
        selectedIndex={0}
      />,
    );

    expect(screen.getByTestId("option-card-0")).toHaveAttribute(
      "data-validating",
      "true",
    );
    expect(screen.getByTestId("option-card-0")).toHaveAttribute(
      "data-disabled",
      "false",
    );
    expect(screen.getByTestId("option-card-1")).toHaveAttribute(
      "data-validating",
      "false",
    );
    expect(screen.getByTestId("option-card-1")).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });

  it("marks the selected option", () => {
    const options = [makeOption("overtime", "A"), makeOption("external", "B")];

    render(
      <OptionsComparison
        options={options}
        recommendationIndex={0}
        loading={false}
        onValidate={vi.fn()}
        validatingIndex={-1}
        selectedIndex={1}
      />,
    );

    expect(screen.getByTestId("option-card-0")).toHaveAttribute(
      "data-selected",
      "false",
    );
    expect(screen.getByTestId("option-card-1")).toHaveAttribute(
      "data-selected",
      "true",
    );
  });
});
