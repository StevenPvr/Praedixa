import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import GlobalError from "../global-error";

// Suppress jsdom warning: <html> cannot be a child of <div>
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("cannot be a child of"))
      return;
    originalError(...args);
  };
});
afterAll(() => {
  console.error = originalError;
});

describe("GlobalError Page (app/global-error.tsx)", () => {
  const mockReset = vi.fn();
  const mockError = new Error("Global error") as Error & { digest?: string };

  it("should render without errors", () => {
    render(<GlobalError error={mockError} reset={mockReset} />);
    expect(
      screen.getByText("Une erreur inattendue est survenue"),
    ).toBeInTheDocument();
  });

  it("should render the error heading", () => {
    render(<GlobalError error={mockError} reset={mockReset} />);
    expect(
      screen.getByRole("heading", {
        name: "Une erreur inattendue est survenue",
      }),
    ).toBeInTheDocument();
  });

  it("should render the error description", () => {
    render(<GlobalError error={mockError} reset={mockReset} />);
    expect(
      screen.getByText(
        /Nous en avons été informés et travaillons à la résoudre/,
      ),
    ).toBeInTheDocument();
  });

  it('should render the "Réessayer" button', () => {
    render(<GlobalError error={mockError} reset={mockReset} />);
    expect(
      screen.getByRole("button", { name: "Réessayer" }),
    ).toBeInTheDocument();
  });

  it("should call reset when the retry button is clicked", () => {
    render(<GlobalError error={mockError} reset={mockReset} />);
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('should render the "Retour à l\'accueil" link', () => {
    render(<GlobalError error={mockError} reset={mockReset} />);
    const homeLink = screen.getByText("Retour à l'accueil");
    expect(homeLink.closest("a")).toHaveAttribute("href", "/");
  });

  it("should render the P logo mark", () => {
    render(<GlobalError error={mockError} reset={mockReset} />);
    expect(screen.getByText("P")).toBeInTheDocument();
  });

  it("should render as a standalone page with inline styles", () => {
    const { container } = render(
      <GlobalError error={mockError} reset={mockReset} />,
    );
    // GlobalError renders <html lang="fr"><body>...</body></html>
    // When rendered inside jsdom's existing document, the <html>/<body>
    // tags are collapsed, but the content and inline styles still render.
    // Verify the styled content wrapper exists
    const styledDiv =
      container.querySelector('[style*="textAlign"]') ||
      container.querySelector('[style*="text-align"]');
    expect(styledDiv).toBeInTheDocument();
  });
});
