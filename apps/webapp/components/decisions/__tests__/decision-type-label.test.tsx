import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DecisionTypeLabel, typeLabel } from "../decision-type-label";
import type { DecisionType } from "@praedixa/shared-types";

const allTypes: Array<{ type: DecisionType; label: string }> = [
  { type: "replacement", label: "Remplacement" },
  { type: "redistribution", label: "Redistribution" },
  { type: "postponement", label: "Report" },
  { type: "overtime", label: "Heures sup" },
  { type: "external", label: "Externe" },
  { type: "training", label: "Formation" },
  { type: "no_action", label: "Sans action" },
];

describe("DecisionTypeLabel", () => {
  it.each(allTypes)("renders '$label' for type '$type'", ({ type, label }) => {
    render(<DecisionTypeLabel type={type} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("renders a span element", () => {
    const { container } = render(<DecisionTypeLabel type="overtime" />);
    const span = container.firstElementChild as HTMLElement;
    expect(span.tagName).toBe("SPAN");
  });

  it("applies text-sm and text-gray-600 CSS classes", () => {
    const { container } = render(<DecisionTypeLabel type="overtime" />);
    const span = container.firstElementChild as HTMLElement;
    expect(span.className).toContain("text-sm");
    expect(span.className).toContain("text-gray-600");
  });
});

describe("typeLabel export", () => {
  it("maps all 7 DecisionType values to French labels", () => {
    const expected: Record<DecisionType, string> = {
      replacement: "Remplacement",
      redistribution: "Redistribution",
      postponement: "Report",
      overtime: "Heures sup",
      external: "Externe",
      training: "Formation",
      no_action: "Sans action",
    };
    expect(typeLabel).toEqual(expected);
  });
});
