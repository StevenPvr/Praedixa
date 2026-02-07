import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DecisionStatusFilter } from "../decision-status-filter";

describe("DecisionStatusFilter", () => {
  it("renders all status tabs", () => {
    render(<DecisionStatusFilter value="all" onChange={vi.fn()} />);
    expect(screen.getByText("Toutes")).toBeInTheDocument();
    expect(screen.getByText("Suggerees")).toBeInTheDocument();
    expect(screen.getByText("En attente")).toBeInTheDocument();
    expect(screen.getByText("Approuvees")).toBeInTheDocument();
    expect(screen.getByText("Rejetees")).toBeInTheDocument();
    expect(screen.getByText("Implementees")).toBeInTheDocument();
  });

  it("marks active tab with aria-selected=true", () => {
    render(<DecisionStatusFilter value="approved" onChange={vi.fn()} />);
    expect(screen.getByText("Approuvees")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Toutes")).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("calls onChange with status when tab clicked", () => {
    const onChange = vi.fn();
    render(<DecisionStatusFilter value="all" onChange={onChange} />);
    fireEvent.click(screen.getByText("En attente"));
    expect(onChange).toHaveBeenCalledWith("pending_review");
  });

  it("calls onChange with 'all' when Toutes clicked", () => {
    const onChange = vi.fn();
    render(<DecisionStatusFilter value="approved" onChange={onChange} />);
    fireEvent.click(screen.getByText("Toutes"));
    expect(onChange).toHaveBeenCalledWith("all");
  });

  it("has tablist role with correct aria-label", () => {
    render(<DecisionStatusFilter value="all" onChange={vi.fn()} />);
    expect(
      screen.getByRole("tablist", { name: "Filtrer par statut" }),
    ).toBeInTheDocument();
  });

  it("renders 6 tabs", () => {
    render(<DecisionStatusFilter value="all" onChange={vi.fn()} />);
    expect(screen.getAllByRole("tab")).toHaveLength(6);
  });
});
