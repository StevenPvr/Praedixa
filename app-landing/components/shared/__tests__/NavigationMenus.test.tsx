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

  it("keeps the desktop Resources links navigable and closes after a route change", async () => {
    const { rerender } = render(<DesktopNav locale="fr" />);

    const resourcesButton = screen.getByRole("button", { name: /ressources/i });
    fireEvent.focus(resourcesButton);

    const resourcesLink = screen.getByRole("link", {
      name: /Ressources essentielles/i,
    });

    expect(resourcesLink).toHaveAttribute("href", "/fr/ressources");
    expect(screen.getByRole("link", { name: /HCR/i })).toHaveAttribute(
      "href",
      "/fr/secteurs/hcr",
    );
    expect(
      screen.getByRole("link", { name: /Enseignement supérieur/i }),
    ).toHaveAttribute("href", "/fr/secteurs/enseignement-superieur");

    mockPathname = "/fr/ressources";
    rerender(<DesktopNav locale="fr" />);

    expect(
      screen.queryByRole("link", { name: /Ressources essentielles/i }),
    ).not.toBeInTheDocument();
  });

  it("closes the mobile menu after a route change", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <MobileNav
        locale="fr"
        primaryCtaHref="/fr/contact?intent=proof"
        primaryCtaLabel="Demander la preuve sur historique"
        secondaryCtaHref="/fr/devenir-pilote"
        secondaryCtaLabel="Parler du déploiement"
      />,
    );

    await user.click(screen.getByRole("button", { name: /ouvrir le menu/i }));
    await user.click(screen.getByRole("button", { name: /ressources/i }));

    expect(
      screen.getByRole("link", { name: /Ressources essentielles/i }),
    ).toHaveAttribute("href", "/fr/ressources");
    expect(screen.getByRole("link", { name: /HCR/i })).toHaveAttribute(
      "href",
      "/fr/secteurs/hcr",
    );
    expect(
      screen.getByRole("link", { name: /Enseignement supérieur/i }),
    ).toHaveAttribute("href", "/fr/secteurs/enseignement-superieur");

    mockPathname = "/fr/ressources";
    rerender(
      <MobileNav
        locale="fr"
        primaryCtaHref="/fr/contact?intent=proof"
        primaryCtaLabel="Demander la preuve sur historique"
        secondaryCtaHref="/fr/devenir-pilote"
        secondaryCtaLabel="Parler du déploiement"
      />,
    );

    expect(
      screen.queryByRole("link", { name: /Ressources essentielles/i }),
    ).not.toBeInTheDocument();
  });
});
