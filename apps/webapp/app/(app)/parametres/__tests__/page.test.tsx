import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ParametresPage from "../page";

describe("ParametresPage", () => {
  it("renders the Parametres heading", () => {
    render(<ParametresPage />);
    expect(
      screen.getByRole("heading", { name: "Parametres" }),
    ).toBeInTheDocument();
  });

  it("renders the page description", () => {
    render(<ParametresPage />);
    expect(
      screen.getByText("Configuration de l'organisation et preferences"),
    ).toBeInTheDocument();
  });

  it("shows the construction placeholder", () => {
    render(<ParametresPage />);
    expect(screen.getByText("Section en construction")).toBeInTheDocument();
  });
});
