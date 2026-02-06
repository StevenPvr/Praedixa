import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DecisionsPage from "../page";

describe("DecisionsPage", () => {
  it("renders the Decisions heading", () => {
    render(<DecisionsPage />);
    expect(
      screen.getByRole("heading", { name: "Decisions" }),
    ).toBeInTheDocument();
  });

  it("renders the page description", () => {
    render(<DecisionsPage />);
    expect(
      screen.getByText("Suivi et audit trail des decisions operationnelles"),
    ).toBeInTheDocument();
  });

  it("shows the construction placeholder", () => {
    render(<DecisionsPage />);
    expect(screen.getByText("Section en construction")).toBeInTheDocument();
  });
});
