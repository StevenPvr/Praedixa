import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrgStatusBadge, type OrgStatus } from "../org-status-badge";

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

describe("OrgStatusBadge", () => {
  const statuses: { status: OrgStatus; variant: string; label: string }[] = [
    { status: "active", variant: "success", label: "Actif" },
    { status: "suspended", variant: "warning", label: "Suspendu" },
    { status: "trial", variant: "info", label: "Essai" },
    { status: "churned", variant: "danger", label: "Churne" },
  ];

  it.each(statuses)(
    "renders $status as $variant variant with label $label",
    ({ status, variant, label }) => {
      render(<OrgStatusBadge status={status} />);
      const badge = screen.getByTestId("status-badge");
      expect(badge).toHaveAttribute("data-variant", variant);
      expect(badge).toHaveTextContent(label);
    },
  );

  it("passes custom size prop", () => {
    render(<OrgStatusBadge status="active" size="sm" />);
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-size", "sm");
  });

  it("handles unknown status with neutral fallback", () => {
    render(<OrgStatusBadge status={"unknown" as OrgStatus} />);
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-variant", "neutral");
    expect(badge).toHaveTextContent("unknown");
  });
});
