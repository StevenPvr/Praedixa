import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClosedLoopTeaserSection } from "../ClosedLoopTeaserSection";
import { HomeFaqCtaSection } from "../HomeFaqCtaSection";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("Homepage FR messaging", () => {
  it("keeps teaser sections aligned with the simplified value proposition", () => {
    render(
      <>
        <ClosedLoopTeaserSection locale="fr" />
        <HomeFaqCtaSection locale="fr" />
      </>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Du risque détecté à l'action priorisée.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Praedixa fédère les signaux utiles, anticipe les écarts business à court terme, calcule les arbitrages coût / service / risque, prépare la première action validée et relit l'impact obtenu.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Prédire")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Les questions avant de démarrer",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Praedixa détecte les risques business qui menacent la performance et recommande les meilleures décisions pour les réduire sur les effectifs, la demande, les stocks, les approvisionnements et la rétention client. En pratique, nous commençons par le risque le plus coûteux sur votre périmètre.",
      ),
    ).toBeInTheDocument();
  });
});
