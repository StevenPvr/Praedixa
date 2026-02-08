import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorFallback } from "../error-fallback";

vi.mock("lucide-react", () => ({
  AlertTriangle: ({ className }: { className?: string }) => (
    <span data-testid="icon-alert" className={className} />
  ),
  RefreshCw: ({ className }: { className?: string }) => (
    <span data-testid="icon-refresh" className={className} />
  ),
  WifiOff: ({ className }: { className?: string }) => (
    <span data-testid="icon-wifi-off" className={className} />
  ),
  Inbox: ({ className }: { className?: string }) => (
    <span data-testid="icon-inbox" className={className} />
  ),
}));

describe("ErrorFallback", () => {
  it("renders API variant by default", () => {
    render(<ErrorFallback />);
    expect(screen.getByText("Erreur de chargement")).toBeInTheDocument();
    expect(screen.getByTestId("icon-alert")).toBeInTheDocument();
  });

  it("renders custom message instead of default", () => {
    render(<ErrorFallback message="Erreur personnalisee" />);
    expect(screen.getByText("Erreur personnalisee")).toBeInTheDocument();
  });

  it("renders network variant with WifiOff icon", () => {
    render(<ErrorFallback variant="network" />);
    expect(screen.getByText("Connexion perdue")).toBeInTheDocument();
    expect(screen.getByTestId("icon-wifi-off")).toBeInTheDocument();
  });

  it("renders empty variant with Inbox icon", () => {
    render(<ErrorFallback variant="empty" />);
    expect(screen.getByText("Aucune donnee")).toBeInTheDocument();
    expect(screen.getByTestId("icon-inbox")).toBeInTheDocument();
  });

  it("renders retry button when onRetry is provided", () => {
    const onRetry = vi.fn();
    render(<ErrorFallback onRetry={onRetry} />);
    const button = screen.getByText("Reessayer");
    expect(button).toBeInTheDocument();
    button.click();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("does not render retry button when onRetry is undefined", () => {
    render(<ErrorFallback />);
    expect(screen.queryByText("Reessayer")).not.toBeInTheDocument();
  });

  it("renders detail block for API variant", () => {
    render(<ErrorFallback variant="api" detail="ID: abc-123" />);
    expect(screen.getByText("ID: abc-123")).toBeInTheDocument();
  });

  it("does not render detail block when detail is undefined", () => {
    const { container } = render(<ErrorFallback variant="api" />);
    expect(container.querySelector(".font-mono")).not.toBeInTheDocument();
  });

  it("renders CTA button for empty variant with onAction", () => {
    const onAction = vi.fn();
    render(<ErrorFallback variant="empty" onAction={onAction} ctaLabel="Ajouter" />);
    const button = screen.getByText("Ajouter");
    expect(button).toBeInTheDocument();
    button.click();
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("renders default CTA label when ctaLabel is not provided", () => {
    const onAction = vi.fn();
    render(<ErrorFallback variant="empty" onAction={onAction} />);
    expect(screen.getByText("Commencer")).toBeInTheDocument();
  });

  it("does not render CTA button when onAction is undefined for empty variant", () => {
    render(<ErrorFallback variant="empty" />);
    expect(screen.queryByText("Commencer")).not.toBeInTheDocument();
  });

  it("retry button has min-h-[44px] for touch target compliance", () => {
    render(<ErrorFallback onRetry={() => {}} />);
    const button = screen.getByText("Reessayer").closest("button");
    expect(button?.className).toContain("min-h-[44px]");
  });
});
