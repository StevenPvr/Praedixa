import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a {...props}>{children}</a>
  ),
}));

import NotFound from "../not-found";

describe("NotFound Page (app/not-found.tsx)", () => {
  it("should render without errors", () => {
    render(<NotFound />);
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("should render the 404 text", () => {
    render(<NotFound />);
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("should render the page heading", () => {
    render(<NotFound />);
    expect(
      screen.getByRole("heading", { name: "Page introuvable" }),
    ).toBeInTheDocument();
  });

  it("should render the description text", () => {
    render(<NotFound />);
    expect(
      screen.getByText(
        "La page que vous recherchez n'existe pas ou a été déplacée.",
      ),
    ).toBeInTheDocument();
  });

  it('should render the "Retour à l\'accueil" link', () => {
    render(<NotFound />);
    const homeLink = screen.getByText("Retour à l'accueil").closest("a");
    expect(homeLink).toHaveAttribute("href", "/");
  });
});
