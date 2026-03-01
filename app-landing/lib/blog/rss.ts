import { absoluteUrl } from "../seo/metadata";
import { buildBlogPostPath } from "./posts";
import type { BlogPost } from "./types";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildBlogRssXml(posts: BlogPost[]): string {
  const feedUrl = absoluteUrl("/rss.xml");
  const publicationDate = posts[0]?.date ?? new Date();

  const itemsXml = posts
    .map((post) => {
      const postUrl = absoluteUrl(buildBlogPostPath(post.locale, post.slug));
      return [
        "<item>",
        `<title>${escapeXml(post.title)}</title>`,
        `<link>${escapeXml(postUrl)}</link>`,
        `<guid>${escapeXml(postUrl)}</guid>`,
        `<pubDate>${post.date.toUTCString()}</pubDate>`,
        `<description>${escapeXml(post.description)}</description>`,
        `<category>${escapeXml(post.locale)}</category>`,
        ...post.tags.map((tag) => `<category>${escapeXml(tag)}</category>`),
        "</item>",
      ].join("");
    })
    .join("");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "<channel>",
    "<title>Praedixa Blog</title>",
    `<link>${escapeXml(absoluteUrl("/fr/blog"))}</link>`,
    "<description>Articles SEO et operationnels de Praedixa.</description>",
    "<language>fr-FR</language>",
    `<lastBuildDate>${publicationDate.toUTCString()}</lastBuildDate>`,
    `<atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />`,
    itemsXml,
    "</channel>",
    "</rss>",
  ].join("");
}
