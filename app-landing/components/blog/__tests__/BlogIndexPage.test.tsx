import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BlogIndexPage } from "../BlogIndexPage";
import type { PaginatedBlogPosts } from "../../../lib/blog/types";

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

const result: PaginatedBlogPosts = {
  posts: [
    {
      slug: "decision-ops-proof",
      locale: "fr",
      title: "Décision Ops et preuve d'impact",
      description:
        "Comment cadrer un arbitrage Ops/Finance et relire son impact.",
      date: new Date("2026-01-02T00:00:00.000Z"),
      dateIso: "2026-01-02T00:00:00.000Z",
      rssVersion: 1,
      tags: ["ops-finance"],
      draft: false,
      authors: ["Praedixa"],
      readingTimeMinutes: 6,
      disableAutoLinks: false,
      keyPoints: [],
      sources: [],
      body: "",
      sourcePath: "blog/fr/decision-ops-proof.mdx",
    },
  ],
  totalPosts: 1,
  totalPages: 1,
  currentPage: 1,
  availableTags: ["ops-finance"],
};

describe("BlogIndexPage", () => {
  it("renders a breadcrumb, a GEO summary, and page schemas on the main hub", () => {
    const { container } = render(
      <BlogIndexPage locale="fr" search={{ page: 1 }} result={result} />,
    );

    expect(
      screen.getByRole("navigation", { name: "Breadcrumb" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Résumé canonique")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "En bref" }),
    ).toBeInTheDocument();
    expect(
      container.querySelectorAll('script[type="application/ld+json"]'),
    ).toHaveLength(2);
  });
});
