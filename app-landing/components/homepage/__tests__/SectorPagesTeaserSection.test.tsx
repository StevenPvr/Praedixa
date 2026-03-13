import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SectorPagesTeaserSection } from "../SectorPagesTeaserSection";

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

describe("SectorPagesTeaserSection", () => {
  it("links the homepage to the four dedicated French sector pages", () => {
    render(<SectorPagesTeaserSection locale="fr" />);

    const hrefs = screen
      .getAllByRole("link", { name: /Voir le cas sectoriel/i })
      .map((link) => link.getAttribute("href"));

    expect(hrefs).toContain("/fr/secteurs/hcr");
    expect(hrefs).toContain("/fr/secteurs/enseignement-superieur");
    expect(hrefs).toContain("/fr/secteurs/logistique-transport-retail");
    expect(hrefs).toContain("/fr/secteurs/automobile-concessions-ateliers");
  });
});
