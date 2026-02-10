import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorFallback } from "../error-fallback";

describe("ErrorFallback", () => {
  describe("default (api) variant", () => {
    it("renders the default api error title and message", () => {
      render(<ErrorFallback />);
      expect(screen.getByText("Erreur de chargement")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Une erreur est survenue lors du chargement des donnees.",
        ),
      ).toBeInTheDocument();
    });

    it("renders custom message", () => {
      render(<ErrorFallback message="Erreur 500" />);
      expect(screen.getByText("Erreur 500")).toBeInTheDocument();
    });

    it("shows retry button when onRetry is provided", () => {
      const onRetry = vi.fn();
      render(<ErrorFallback onRetry={onRetry} />);
      const btn = screen.getByRole("button", { name: "Reessayer" });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("shows support link for api variant", () => {
      render(<ErrorFallback variant="api" />);
      const link = screen.getByText("Contacter le support");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "mailto:support@praedixa.com");
    });
  });

  describe("api variant with detail", () => {
    it("renders technical detail text", () => {
      render(
        <ErrorFallback
          variant="api"
          detail="Error: 500 Internal Server Error"
        />,
      );
      expect(
        screen.getByText("Error: 500 Internal Server Error"),
      ).toBeInTheDocument();
    });

    it("does not render detail when not provided", () => {
      render(<ErrorFallback variant="api" />);
      // Only default message should appear
      expect(screen.queryByText(/Error:/)).not.toBeInTheDocument();
    });
  });

  describe("network variant", () => {
    it("renders network error title", () => {
      render(<ErrorFallback variant="network" />);
      expect(screen.getByText("Connexion perdue")).toBeInTheDocument();
    });

    it("renders default network message", () => {
      render(<ErrorFallback variant="network" />);
      expect(
        screen.getByText(/Verifiez votre connexion internet/),
      ).toBeInTheDocument();
    });

    it("does not show support link", () => {
      render(<ErrorFallback variant="network" />);
      expect(
        screen.queryByText("Contacter le support"),
      ).not.toBeInTheDocument();
    });

    it("shows retry button when onRetry is provided", () => {
      const onRetry = vi.fn();
      render(<ErrorFallback variant="network" onRetry={onRetry} />);
      expect(
        screen.getByRole("button", { name: "Reessayer" }),
      ).toBeInTheDocument();
    });
  });

  describe("empty variant", () => {
    it("renders empty state title", () => {
      render(<ErrorFallback variant="empty" />);
      expect(screen.getByText("Aucune donnee")).toBeInTheDocument();
    });

    it("renders default empty message", () => {
      render(<ErrorFallback variant="empty" />);
      expect(
        screen.getByText("Aucune donnee a afficher pour le moment."),
      ).toBeInTheDocument();
    });

    it("does not show support link", () => {
      render(<ErrorFallback variant="empty" />);
      expect(
        screen.queryByText("Contacter le support"),
      ).not.toBeInTheDocument();
    });

    it("shows CTA button with custom label when onAction is provided", () => {
      const onAction = vi.fn();
      render(
        <ErrorFallback
          variant="empty"
          onAction={onAction}
          ctaLabel="Importer des donnees"
        />,
      );
      const btn = screen.getByRole("button", {
        name: "Importer des donnees",
      });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it("shows default CTA label when ctaLabel is not provided", () => {
      const onAction = vi.fn();
      render(<ErrorFallback variant="empty" onAction={onAction} />);
      expect(
        screen.getByRole("button", { name: "Commencer" }),
      ).toBeInTheDocument();
    });

    it("does not show CTA when onAction is not provided", () => {
      render(<ErrorFallback variant="empty" />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("retry button meets 44px touch target", () => {
      render(<ErrorFallback onRetry={() => {}} />);
      const btn = screen.getByRole("button", { name: "Reessayer" });
      expect(btn).toHaveClass("min-h-[44px]");
    });

    it("empty CTA meets 44px touch target", () => {
      render(<ErrorFallback variant="empty" onAction={() => {}} />);
      const btn = screen.getByRole("button", { name: "Commencer" });
      expect(btn).toHaveClass("min-h-[44px]");
    });

    it("icons are aria-hidden", () => {
      const { container } = render(<ErrorFallback variant="network" />);
      const svgs = container.querySelectorAll("svg");
      svgs.forEach((svg) => {
        expect(svg).toHaveAttribute("aria-hidden", "true");
      });
    });
  });
});
