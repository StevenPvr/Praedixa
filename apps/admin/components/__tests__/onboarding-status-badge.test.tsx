import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  OnboardingStatusBadge,
  type OnboardingStatus,
} from "../onboarding-status-badge";

vi.mock("@praedixa/ui", () => ({
  StatusBadge: ({
    variant,
    label,
    size,
  }: {
    variant: string;
    label: string;
    size?: string;
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

describe("OnboardingStatusBadge", () => {
  const statuses: {
    status: OnboardingStatus;
    variant: string;
    label: string;
  }[] = [
    { status: "in_progress", variant: "info", label: "En cours" },
    { status: "completed", variant: "success", label: "Termine" },
    { status: "abandoned", variant: "danger", label: "Abandonne" },
  ];

  it.each(statuses)(
    "renders $status as $variant variant with label $label",
    ({ status, variant, label }) => {
      render(<OnboardingStatusBadge status={status} />);
      const badge = screen.getByTestId("status-badge");
      expect(badge).toHaveAttribute("data-variant", variant);
      expect(badge).toHaveTextContent(label);
    },
  );

  it("passes custom size prop", () => {
    render(<OnboardingStatusBadge status="completed" size="sm" />);
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-size", "sm");
  });

  it("handles unknown status with neutral fallback", () => {
    render(
      <OnboardingStatusBadge status={"unknown" as OnboardingStatus} />,
    );
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-variant", "neutral");
    expect(badge).toHaveTextContent("unknown");
  });
});
