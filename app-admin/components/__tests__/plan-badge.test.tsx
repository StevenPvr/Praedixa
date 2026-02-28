import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlanBadge, type PlanTier } from "../plan-badge";

vi.mock("@praedixa/ui", () => globalThis.__mocks.createUiMocks());

describe("PlanBadge", () => {
  const plans: { tier: PlanTier; label: string }[] = [
    { tier: "free", label: "Free" },
    { tier: "starter", label: "Starter" },
    { tier: "professional", label: "Pro" },
    { tier: "enterprise", label: "Enterprise" },
  ];

  it.each(plans)("renders $tier plan with label $label", ({ tier, label }) => {
    render(<PlanBadge plan={tier} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("applies correct background class for free plan", () => {
    const { container } = render(<PlanBadge plan="free" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-surface-sunken");
    expect(badge.className).toContain("text-ink-secondary");
  });

  it("applies correct background class for starter plan", () => {
    const { container } = render(<PlanBadge plan="starter" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-info-light");
    expect(badge.className).toContain("text-info-text");
  });

  it("applies correct background class for professional plan", () => {
    const { container } = render(<PlanBadge plan="professional" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-primary-100");
    expect(badge.className).toContain("text-primary-700");
  });

  it("applies correct background class for enterprise plan", () => {
    const { container } = render(<PlanBadge plan="enterprise" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-primary-200");
    expect(badge.className).toContain("text-primary-800");
  });

  it("applies custom className", () => {
    const { container } = render(
      <PlanBadge plan="free" className="my-extra-class" />,
    );
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("my-extra-class");
  });

  it("renders as an inline span", () => {
    const { container } = render(<PlanBadge plan="free" />);
    expect(container.firstChild?.nodeName).toBe("SPAN");
  });

  it("supports legacy pro alias", () => {
    const { container } = render(<PlanBadge plan="pro" />);
    const badge = container.firstChild as HTMLElement;
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(badge.className).toContain("bg-primary-100");
    expect(badge.className).toContain("text-primary-700");
  });

  it("falls back safely for unknown plan values", () => {
    const { container } = render(<PlanBadge plan="legacy_plan" />);
    const badge = container.firstChild as HTMLElement;
    expect(screen.getByText("legacy_plan")).toBeInTheDocument();
    expect(badge.className).toContain("bg-surface-sunken");
    expect(badge.className).toContain("text-ink-secondary");
  });
});
