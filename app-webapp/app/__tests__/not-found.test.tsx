import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "../not-found";

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

describe("NotFound (root)", () => {
  it('renders "404" text', () => {
    render(<NotFound />);
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it('renders "Page introuvable" text', () => {
    render(<NotFound />);
    expect(screen.getByText("Page introuvable")).toBeInTheDocument();
  });

  it('renders link with text "Retour au tableau de bord"', () => {
    render(<NotFound />);
    expect(
      screen.getByRole("link", { name: "Retour au tableau de bord" }),
    ).toBeInTheDocument();
  });

  it("link points to /dashboard", () => {
    render(<NotFound />);
    const link = screen.getByRole("link", {
      name: "Retour au tableau de bord",
    });
    expect(link).toHaveAttribute("href", "/dashboard");
  });
});
