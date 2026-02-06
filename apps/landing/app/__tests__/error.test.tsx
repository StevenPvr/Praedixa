import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a {...props}>{children}</a>
  ),
}));

import ErrorPage from "../error";

describe("Error Page (app/error.tsx)", () => {
  const mockReset = vi.fn();
  const mockError = new Error("Test error") as Error & { digest?: string };

  it("should render without errors", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(
      screen.getByText("Quelque chose s'est mal passé"),
    ).toBeInTheDocument();
  });

  it("should render the error heading", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(
      screen.getByRole("heading", {
        name: "Quelque chose s'est mal passé",
      }),
    ).toBeInTheDocument();
  });

  it("should render the error description text", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(
      screen.getByText(
        /Nous en avons été informés et travaillons à la résoudre/,
      ),
    ).toBeInTheDocument();
  });

  it('should render the "Réessayer" button', () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(
      screen.getByRole("button", { name: "Réessayer" }),
    ).toBeInTheDocument();
  });

  it("should call reset when the retry button is clicked", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('should render the "Retour à l\'accueil" link', () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    const homeLink = screen.getByText("Retour à l'accueil").closest("a");
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("should render the P logo mark", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(screen.getByText("P")).toBeInTheDocument();
  });
});
