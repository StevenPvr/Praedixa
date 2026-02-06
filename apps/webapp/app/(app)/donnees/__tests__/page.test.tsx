import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DonneesPage from "../page";

describe("DonneesPage", () => {
  it("renders the Donnees heading", () => {
    render(<DonneesPage />);
    expect(
      screen.getByRole("heading", { name: "Donnees" }),
    ).toBeInTheDocument();
  });

  it("renders the page description", () => {
    render(<DonneesPage />);
    expect(
      screen.getByText("Consultation des donnees importees (lecture seule)"),
    ).toBeInTheDocument();
  });

  it("shows the construction placeholder", () => {
    render(<DonneesPage />);
    expect(screen.getByText("Section en construction")).toBeInTheDocument();
  });
});
