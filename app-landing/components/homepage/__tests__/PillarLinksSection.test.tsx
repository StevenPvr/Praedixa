import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PillarLinksSection } from "../PillarLinksSection";
import { fr } from "../../../lib/i18n/dictionaries/fr";

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

describe("PillarLinksSection", () => {
  it("renders the core pillar links that help Google understand the landing hierarchy", () => {
    render(<PillarLinksSection locale="fr" dict={fr} />);

    expect(
      screen.getByRole("heading", {
        name: "Les pages à parcourir pour comprendre Praedixa rapidement.",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /Produit & méthode/i }),
    ).toHaveAttribute("href", "/fr/produit-methode");
    expect(
      screen.getByRole("link", { name: /Comment ça marche/i }),
    ).toHaveAttribute("href", "/fr/comment-ca-marche");
    expect(screen.getByRole("link", { name: /Dossier ROI/i })).toHaveAttribute(
      "href",
      "/fr/decision-log-preuve-roi",
    );
    expect(
      screen.getByRole("link", { name: /Intégration & données/i }),
    ).toHaveAttribute("href", "/fr/integration-donnees");
    expect(screen.getByRole("link", { name: /Offre/i })).toHaveAttribute(
      "href",
      "/fr/services",
    );
    expect(screen.getByRole("link", { name: /À propos/i })).toHaveAttribute(
      "href",
      "/fr/a-propos",
    );
  });
});
