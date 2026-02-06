import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  DecisionStatusBadge,
  statusVariant,
  statusLabel,
} from "../decision-status-badge";
import type { DecisionStatus } from "@praedixa/shared-types";

vi.mock("@praedixa/ui", () => ({
  StatusBadge: ({
    variant,
    label,
    size,
  }: {
    variant: string;
    label: string;
    size: string;
  }) => (
    <span
      data-testid="status-badge"
      data-variant={variant}
      data-label={label}
      data-size={size}
    >
      {label}
    </span>
  ),
}));

describe("DecisionStatusBadge", () => {
  it("renders 'suggested' as info variant with label 'Suggeree'", () => {
    render(<DecisionStatusBadge status="suggested" />);
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-variant", "info");
    expect(badge).toHaveTextContent("Suggeree");
  });

  it("renders 'pending_review' as warning variant with label 'En attente'", () => {
    render(<DecisionStatusBadge status="pending_review" />);
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-variant", "warning");
    expect(badge).toHaveTextContent("En attente");
  });

  it("renders 'approved' as success variant with label 'Approuvee'", () => {
    render(<DecisionStatusBadge status="approved" />);
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-variant", "success");
    expect(badge).toHaveTextContent("Approuvee");
  });

  it("renders 'rejected' as danger variant with label 'Rejetee'", () => {
    render(<DecisionStatusBadge status="rejected" />);
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-variant", "danger");
    expect(badge).toHaveTextContent("Rejetee");
  });

  it("renders 'implemented' as success variant with label 'Implementee'", () => {
    render(<DecisionStatusBadge status="implemented" />);
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-variant", "success");
    expect(badge).toHaveTextContent("Implementee");
  });

  it("renders 'expired' as neutral variant with label 'Expiree'", () => {
    render(<DecisionStatusBadge status="expired" />);
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-variant", "neutral");
    expect(badge).toHaveTextContent("Expiree");
  });

  it("defaults size to 'sm'", () => {
    render(<DecisionStatusBadge status="suggested" />);
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-size", "sm");
  });

  it("passes custom size 'md'", () => {
    render(<DecisionStatusBadge status="approved" size="md" />);
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-size", "md");
  });
});

describe("statusVariant export", () => {
  it("maps all 6 DecisionStatus values to correct variants", () => {
    const expected: Record<DecisionStatus, string> = {
      suggested: "info",
      pending_review: "warning",
      approved: "success",
      rejected: "danger",
      implemented: "success",
      expired: "neutral",
    };
    expect(statusVariant).toEqual(expected);
  });
});

describe("statusLabel export", () => {
  it("maps all 6 DecisionStatus values to French labels", () => {
    const expected: Record<DecisionStatus, string> = {
      suggested: "Suggeree",
      pending_review: "En attente",
      approved: "Approuvee",
      rejected: "Rejetee",
      implemented: "Implementee",
      expired: "Expiree",
    };
    expect(statusLabel).toEqual(expected);
  });
});
