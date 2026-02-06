import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RapportsPage from "../page";

describe("RapportsPage", () => {
  it("renders the Rapports heading", () => {
    render(<RapportsPage />);
    expect(
      screen.getByRole("heading", { name: "Rapports" }),
    ).toBeInTheDocument();
  });

  it("renders the page description", () => {
    render(<RapportsPage />);
    expect(
      screen.getByText("Exports et rapports de synthese"),
    ).toBeInTheDocument();
  });

  it("shows the construction placeholder", () => {
    render(<RapportsPage />);
    expect(screen.getByText("Section en construction")).toBeInTheDocument();
  });
});
