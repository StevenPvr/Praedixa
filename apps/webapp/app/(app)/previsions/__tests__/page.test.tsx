import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PrevisionsPage from "../page";

describe("PrevisionsPage", () => {
  it("renders the Previsions heading", () => {
    render(<PrevisionsPage />);
    expect(
      screen.getByRole("heading", { name: "Previsions" }),
    ).toBeInTheDocument();
  });

  it("renders the page description", () => {
    render(<PrevisionsPage />);
    expect(
      screen.getByText("Previsions de capacite humaine et marchandise"),
    ).toBeInTheDocument();
  });

  it("shows the construction placeholder", () => {
    render(<PrevisionsPage />);
    expect(screen.getByText("Section en construction")).toBeInTheDocument();
  });
});
