import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <a {...props}>{children}</a>,
}));

import CGUPage, { metadata } from "../page";
import { siteConfig } from "../../../lib/config/site";

describe("CGUPage", () => {
  it("exports expected metadata", () => {
    expect(metadata.title).toBe(
      "Conditions Générales d'Utilisation - Praedixa",
    );
    expect(metadata.description).toBe(
      "Conditions générales d'utilisation du site et des services Praedixa.",
    );
    expect(metadata.alternates?.canonical).toBe("/cgu");
  });

  it("renders core legal content and navigation links", () => {
    render(<CGUPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Conditions Générales d'Utilisation",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/dernière mise à jour/i)).toBeInTheDocument();
    expect(screen.getByText("1. Objet")).toBeInTheDocument();
    expect(screen.getByText("16. Contact")).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Retour à l'accueil" }),
    ).toHaveAttribute("href", "/");
    expect(
      screen.getByRole("link", { name: /mentions légales/i }),
    ).toHaveAttribute("href", "/mentions-legales");
    expect(
      screen.getByRole("link", { name: /politique de confidentialité/i }),
    ).toHaveAttribute("href", "/confidentialite");
    expect(
      screen.getByRole("link", { name: siteConfig.contact.email }),
    ).toHaveAttribute("href", `mailto:${siteConfig.contact.email}`);
  });
});
