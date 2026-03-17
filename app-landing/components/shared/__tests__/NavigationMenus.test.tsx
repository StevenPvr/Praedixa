import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DesktopNav } from "../DesktopNav";
import { MobileNav } from "../MobileNav";

let mockPathname = "/fr";

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

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      children: React.ReactNode;
    }) => <div {...props}>{children}</div>,
    nav: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLElement> & { children: React.ReactNode }) => (
      <nav {...props}>{children}</nav>
    ),
  },
}));

describe("navigation menus", () => {
  beforeEach(() => {
    mockPathname = "/fr";
  });

  it("keeps direct links while exposing sector ICP pages in a dropdown", async () => {
    render(<DesktopNav locale="fr" />);

    expect(screen.getByRole("link", { name: "Méthode" })).toHaveAttribute(
      "href",
      "/fr/produit-methode",
    );
    expect(screen.getByRole("link", { name: "Preuve" })).toHaveAttribute(
      "href",
      "/fr/decision-log-preuve-roi",
    );
    expect(screen.getByRole("link", { name: "Intégration" })).toHaveAttribute(
      "href",
      "/fr/integration-donnees",
    );
    expect(screen.getByRole("link", { name: "Offre" })).toHaveAttribute(
      "href",
      "/fr/services",
    );
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute(
      "href",
      "/fr/contact",
    );

    const sectorsButton = screen.getByRole("button", { name: /secteurs/i });
    fireEvent.focus(sectorsButton);

    expect(screen.getByRole("link", { name: /HCR/i })).toHaveAttribute(
      "href",
      "/fr/secteurs/hcr",
    );
    expect(
      screen.getByRole("link", { name: /Enseignement supérieur/i }),
    ).toHaveAttribute("href", "/fr/secteurs/enseignement-superieur");
    expect(
      screen.getByRole("link", { name: /Logistique \/ Transport \/ Retail/i }),
    ).toHaveAttribute("href", "/fr/secteurs/logistique-transport-retail");
    expect(
      screen.getByRole("link", {
        name: /Automobile \/ concessions \/ ateliers/i,
      }),
    ).toHaveAttribute("href", "/fr/secteurs/automobile-concessions-ateliers");
    expect(screen.getByRole("link", { name: /Fitness/i })).toHaveAttribute(
      "href",
      "/fr/secteurs/fitness-reseaux-clubs",
    );
    expect(
      screen.getByRole("link", { name: /Voir la page ressources/i }),
    ).toHaveAttribute("href", "/fr/ressources");
  });

  it("exposes sector ICP pages in the mobile navigation and closes after a route change", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <MobileNav
        locale="fr"
        primaryCtaHref="/fr/decision-log-preuve-roi"
        primaryCtaLabel="Voir un exemple concret"
        secondaryCtaHref="/fr/deploiement"
        secondaryCtaLabel="Parler du déploiement"
      />,
    );

    await user.click(screen.getByRole("button", { name: /ouvrir le menu/i }));

    expect(screen.getByRole("link", { name: "Méthode" })).toHaveAttribute(
      "href",
      "/fr/produit-methode",
    );
    expect(screen.getByRole("link", { name: "Preuve" })).toHaveAttribute(
      "href",
      "/fr/decision-log-preuve-roi",
    );

    await user.click(screen.getByRole("button", { name: /^Secteurs$/i }));

    expect(screen.getByRole("link", { name: /HCR/i })).toHaveAttribute(
      "href",
      "/fr/secteurs/hcr",
    );
    expect(
      screen.getByRole("link", { name: /Logistique \/ Transport \/ Retail/i }),
    ).toHaveAttribute("href", "/fr/secteurs/logistique-transport-retail");
    expect(
      screen.getByRole("link", {
        name: /Automobile \/ concessions \/ ateliers/i,
      }),
    ).toHaveAttribute("href", "/fr/secteurs/automobile-concessions-ateliers");
    expect(screen.getByRole("link", { name: /Fitness/i })).toHaveAttribute(
      "href",
      "/fr/secteurs/fitness-reseaux-clubs",
    );

    mockPathname = "/fr/produit-methode";
    rerender(
      <MobileNav
        locale="fr"
        primaryCtaHref="/fr/decision-log-preuve-roi"
        primaryCtaLabel="Voir un exemple concret"
        secondaryCtaHref="/fr/deploiement"
        secondaryCtaLabel="Parler du déploiement"
      />,
    );

    expect(
      screen.queryByRole("link", { name: "Méthode" }),
    ).not.toBeInTheDocument();
  });
});
