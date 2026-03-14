import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BreadcrumbTrail } from "../BreadcrumbTrail";

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

describe("BreadcrumbTrail", () => {
  it("renders a semantic breadcrumb with links for previous steps and aria-current on the last item", () => {
    render(
      <BreadcrumbTrail
        items={[
          { label: "Accueil", href: "/fr" },
          { label: "Services", href: "/fr/services" },
          { label: "Demande de déploiement" },
        ]}
      />,
    );

    expect(
      screen.getByRole("navigation", { name: "Breadcrumb" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Accueil" })).toHaveAttribute(
      "href",
      "/fr",
    );
    expect(screen.getByRole("link", { name: "Services" })).toHaveAttribute(
      "href",
      "/fr/services",
    );
    expect(screen.getByText("Demande de déploiement")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
