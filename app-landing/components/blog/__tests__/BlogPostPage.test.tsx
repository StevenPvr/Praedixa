import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { BlogPostPage } from "../BlogPostPage";
import type { BlogPost } from "../../../lib/blog/types";

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

const post: BlogPost = {
  slug: "decision-ops-proof",
  locale: "fr",
  title: "Décision Ops et preuve d'impact",
  description:
    "Comment cadrer un arbitrage Ops/Finance et relire son impact réel.",
  answerSummary:
    "Praedixa aide à comparer les options Ops/Finance avant d'agir puis à relire l'impact réel de la décision retenue.",
  date: new Date("2026-01-02T00:00:00.000Z"),
  dateIso: "2026-01-02",
  rssVersion: 1,
  tags: ["ops-finance", "decision-intelligence"],
  draft: false,
  authors: ["Praedixa"],
  readingTimeMinutes: 6,
  disableAutoLinks: false,
  keyPoints: [
    "Comparer les options avant d'agir évite de déplacer le coût d'une semaine sur l'autre.",
    "Relire l'impact réel permet d'améliorer le prochain arbitrage.",
  ],
  sources: [
    {
      label: "Insee - Productivité",
      url: "https://www.insee.fr/fr/statistiques",
    },
  ],
  body: `# Titre interne

Comparer les options avant d'agir évite de déplacer le coût d'une semaine sur l'autre.

## Comité

Relire l'impact réel permet d'améliorer le prochain arbitrage.`,
  sourcePath: "blog/fr/decision-ops-proof.mdx",
};

function Content(): ReactElement {
  return <p>Corps de l'article</p>;
}

describe("BlogPostPage", () => {
  it("renders a breadcrumb, an answer-first summary, and blog schemas", () => {
    const { container } = render(
      <BlogPostPage
        locale="fr"
        post={post}
        canonicalUrl="https://www.praedixa.com/fr/blog/decision-ops-proof"
        siblingPosts={{ previous: null, next: null }}
        Content={Content}
      />,
    );

    expect(
      screen.getByRole("navigation", { name: "Breadcrumb" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Résumé canonique")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "En bref" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Praedixa aide à comparer les options Ops\/Finance/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Comparer les options avant d'agir/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Sources citees")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Insee - Productivité" }),
    ).toHaveAttribute("href", "https://www.insee.fr/fr/statistiques");
    expect(
      container.querySelectorAll('script[type="application/ld+json"]'),
    ).toHaveLength(2);
  });
});
