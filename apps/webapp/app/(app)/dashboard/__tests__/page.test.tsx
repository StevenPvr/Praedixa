import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "../page";

describe("DashboardPage", () => {
  it("renders the Dashboard heading", () => {
    render(<DashboardPage />);
    expect(
      screen.getByRole("heading", { name: "Dashboard" }),
    ).toBeInTheDocument();
  });

  it("renders the page description", () => {
    render(<DashboardPage />);
    expect(
      screen.getByText("Vue d'ensemble de la capacite operationnelle"),
    ).toBeInTheDocument();
  });

  it("shows the construction placeholder", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Section en construction")).toBeInTheDocument();
  });
});
