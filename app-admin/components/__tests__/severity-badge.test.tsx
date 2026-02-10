import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeverityBadge, type Severity } from "../severity-badge";

vi.mock("@/components/ui/status-badge", () => ({
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

describe("SeverityBadge", () => {
  const severities: { severity: Severity; variant: string; label: string }[] = [
    { severity: "INFO", variant: "neutral", label: "Info" },
    { severity: "WARNING", variant: "warning", label: "Attention" },
    { severity: "CRITICAL", variant: "danger", label: "Critique" },
  ];

  it.each(severities)(
    "renders $severity as $variant variant with label $label",
    ({ severity, variant, label }) => {
      render(<SeverityBadge severity={severity} />);
      const badge = screen.getByTestId("status-badge");
      expect(badge).toHaveAttribute("data-variant", variant);
      expect(badge).toHaveTextContent(label);
    },
  );

  it("defaults size to sm", () => {
    render(<SeverityBadge severity="INFO" />);
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-size", "sm");
  });

  it("passes custom size", () => {
    render(<SeverityBadge severity="CRITICAL" size="md" />);
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-size", "md");
  });

  it("handles unknown severity with neutral fallback", () => {
    render(<SeverityBadge severity={"UNKNOWN" as Severity} />);
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-variant", "neutral");
    expect(badge).toHaveTextContent("UNKNOWN");
  });
});
