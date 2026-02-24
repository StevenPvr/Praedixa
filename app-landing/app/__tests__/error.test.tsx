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
      screen.getByText("Une erreur est survenue"),
    ).toBeInTheDocument();
  });

  it("should render the error heading", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(
      screen.getByRole("heading", {
        name: "Une erreur est survenue",
      }),
    ).toBeInTheDocument();
  });

  it("should render the error description text", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(
      screen.getByText(
        /Le chargement de cette page a échoué/,
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

  it("should render the Erreur label", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(screen.getByText("Erreur")).toBeInTheDocument();
  });
});
