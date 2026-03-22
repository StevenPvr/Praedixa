import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getCompiledBlogMdx } from "../mdx";
import type { BlogPost } from "../types";

const post: BlogPost = {
  slug: "demo-post",
  locale: "fr",
  title: "Titre principal",
  description: "Description",
  date: new Date("2026-03-21T00:00:00.000Z"),
  dateIso: "2026-03-21",
  rssVersion: 1,
  tags: ["ops-finance"],
  draft: false,
  authors: ["Praedixa"],
  readingTimeMinutes: 3,
  disableAutoLinks: false,
  answerSummary: "Resume court",
  keyPoints: [],
  sources: [],
  body: `## Sous-titre

Paragraphe.

# Titre dans le corps`,
  sourcePath: "/tmp/demo-post.mdx",
};

describe("blog mdx compilation", () => {
  it("demotes body h1 headings so the page keeps a single top-level heading", async () => {
    const { Content } = await getCompiledBlogMdx(post);
    render(<Content />);

    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /Titre dans le corps/i }),
    ).toBeInTheDocument();
  });
});
