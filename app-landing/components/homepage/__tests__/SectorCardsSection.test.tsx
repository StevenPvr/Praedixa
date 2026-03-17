import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SectorCardsSection } from "../SectorCardsSection";

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

vi.mock("next/image", () => ({
  default: ({
    fill: _fill,
    priority: _priority,
    unoptimized: _unoptimized,
    ...props
  }: Record<string, unknown>) => <img {...props} />,
}));

// Mock phosphor icons to avoid SSR import issues in test environment
vi.mock("@phosphor-icons/react/dist/ssr", () => ({
  ArrowRight: (props: Record<string, unknown>) => (
    <svg data-testid="arrow-right-icon" {...props} />
  ),
}));

describe("SectorCardsSection", () => {
  it("renders the section with id='secteurs'", () => {
    const { container } = render(<SectorCardsSection locale="fr" />);

    const section = container.querySelector("#secteurs");
    expect(section).toBeInTheDocument();
    expect(section?.tagName).toBe("SECTION");
  });

  it("renders the French kicker and heading", () => {
    render(<SectorCardsSection locale="fr" />);

    expect(screen.getByText("Secteurs")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Une solution adaptée à votre secteur.",
      }),
    ).toBeInTheDocument();
  });

  it("renders 4 sector cards (first 4 from listSectorPages)", () => {
    render(<SectorCardsSection locale="fr" />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);
  });

  it("renders the correct sector card titles", () => {
    render(<SectorCardsSection locale="fr" />);

    // shortLabel for each of the first 4 sectors
    expect(screen.getByRole("heading", { name: "HCR" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Enseignement supérieur",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Logistique / Transport / Retail",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Automobile / concessions / ateliers",
      }),
    ).toBeInTheDocument();
  });

  it("renders the homepageHook text for each card", () => {
    render(<SectorCardsSection locale="fr" />);

    expect(
      screen.getByText(
        /Anticipez les pics d.activité et optimisez vos ressources/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Anticipez la charge campus et sécurisez la continuité de service/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Optimisez vos flux et tenez votre promesse client en temps réel/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Anticipez la charge atelier et réduisez les délais clients/,
      ),
    ).toBeInTheDocument();
  });

  it("renders each card with the correct sector page href", () => {
    render(<SectorCardsSection locale="fr" />);

    const links = screen.getAllByRole("link");

    expect(links[0]).toHaveAttribute("href", "/fr/secteurs/hcr");
    expect(links[1]).toHaveAttribute(
      "href",
      "/fr/secteurs/enseignement-superieur",
    );
    expect(links[2]).toHaveAttribute(
      "href",
      "/fr/secteurs/logistique-transport-retail",
    );
    expect(links[3]).toHaveAttribute(
      "href",
      "/fr/secteurs/automobile-concessions-ateliers",
    );
  });

  it("renders the homepageStat when available", () => {
    render(<SectorCardsSection locale="fr" />);

    // All 4 sectors have homepageStat defined
    expect(
      screen.getByText(/336 850 projets de recrutement/),
    ).toBeInTheDocument();
    expect(screen.getByText(/3,04 M d.étudiants/)).toBeInTheDocument();
    expect(screen.getByText(/175,3 Md€ e-commerce/)).toBeInTheDocument();
    expect(
      screen.getByText(/33 900 recrutements projetés/),
    ).toBeInTheDocument();
  });

  it("renders the 'Explorer' label on each card for French locale", () => {
    render(<SectorCardsSection locale="fr" />);

    const explorLabels = screen.getAllByText("Explorer");
    expect(explorLabels).toHaveLength(4);
  });
});
