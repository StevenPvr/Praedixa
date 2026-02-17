import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AppNotFound from "../not-found";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("AppNotFound ((app) layout)", () => {
  it('renders "404"', () => {
    render(<AppNotFound />);
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it('renders "Page introuvable" text', () => {
    render(<AppNotFound />);
    expect(screen.getByText("Page introuvable")).toBeInTheDocument();
  });

  it('renders link with text "Retour au tableau de bord"', () => {
    render(<AppNotFound />);
    expect(
      screen.getByRole("link", { name: "Retour au tableau de bord" }),
    ).toBeInTheDocument();
  });

  it("link points to /dashboard", () => {
    render(<AppNotFound />);
    const link = screen.getByRole("link", {
      name: "Retour au tableau de bord",
    });
    expect(link).toHaveAttribute("href", "/dashboard");
  });
});
