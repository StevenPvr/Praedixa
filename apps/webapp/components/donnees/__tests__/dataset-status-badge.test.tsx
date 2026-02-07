import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DatasetStatusBadge } from "../dataset-status-badge";

vi.mock("@praedixa/ui", () => ({
  StatusBadge: ({ variant, label }: { variant: string; label: string }) => (
    <span data-testid="status-badge" data-variant={variant}>
      {label}
    </span>
  ),
}));

describe("DatasetStatusBadge", () => {
  it("renders 'Actif' with success variant for active status", () => {
    render(<DatasetStatusBadge status="active" />);
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveTextContent("Actif");
    expect(badge).toHaveAttribute("data-variant", "success");
  });

  it("renders 'En attente' with warning variant for pending status", () => {
    render(<DatasetStatusBadge status="pending" />);
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveTextContent("En attente");
    expect(badge).toHaveAttribute("data-variant", "warning");
  });

  it("renders 'Migration' with info variant for migrating status", () => {
    render(<DatasetStatusBadge status="migrating" />);
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveTextContent("Migration");
    expect(badge).toHaveAttribute("data-variant", "info");
  });

  it("renders 'Archive' with neutral variant for archived status", () => {
    render(<DatasetStatusBadge status="archived" />);
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveTextContent("Archive");
    expect(badge).toHaveAttribute("data-variant", "neutral");
  });
});
