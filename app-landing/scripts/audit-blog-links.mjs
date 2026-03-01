#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const SITE_BASE_URL = "https://www.praedixa.com";
const CONTENT_CANDIDATES = [
  path.resolve(process.cwd(), "content"),
  path.resolve(process.cwd(), "..", "content"),
];

function resolveContentDirectory() {
  return (
    CONTENT_CANDIDATES.find((candidate) => fs.existsSync(candidate)) ??
    CONTENT_CANDIDATES[0]
  );
}

function normalizePath(pathname) {
  if (pathname === "/") return pathname;
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function normalizeUrl(value) {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const parsed = new URL(trimmed);
    const base = new URL(SITE_BASE_URL);
    if (parsed.host === base.host) {
      return `${normalizePath(parsed.pathname)}${parsed.search}${parsed.hash}`;
    }
    return trimmed;
  }

  if (!trimmed.startsWith("/")) {
    return trimmed;
  }

  const parsed = new URL(trimmed, SITE_BASE_URL);
  return `${normalizePath(parsed.pathname)}${parsed.search}${parsed.hash}`;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createPatternRegex(pattern) {
  const trimmed = pattern.trim();
  if (!trimmed) return null;

  const firstCharacter = trimmed[0] ?? "";
  const lastCharacter = trimmed[trimmed.length - 1] ?? "";
  const startsWithWordCharacter = /[\p{L}\p{N}]/u.test(firstCharacter);
  const endsWithWordCharacter = /[\p{L}\p{N}]/u.test(lastCharacter);
  const leftBoundary = startsWithWordCharacter ? "(?<![\\p{L}\\p{N}])" : "";
  const rightBoundary = endsWithWordCharacter ? "(?![\\p{L}\\p{N}])" : "";

  return new RegExp(`${leftBoundary}(${escapeRegex(trimmed)})${rightBoundary}`, "iu");
}

function sanitizeForAutoLinkScan(raw) {
  return raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/^#{1,6}\s.*$/gm, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, " ");
}

function extractExplicitLinks(raw) {
  const explicit = new Set();

  const markdownLinkRegex = /\[[^\]]+\]\(([^)\s]+)[^)]*\)/g;
  let markdownMatch = markdownLinkRegex.exec(raw);
  while (markdownMatch) {
    const normalized = normalizeUrl(markdownMatch[1]);
    if (normalized) explicit.add(normalized);
    markdownMatch = markdownLinkRegex.exec(raw);
  }

  const htmlLinkRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi;
  let htmlMatch = htmlLinkRegex.exec(raw);
  while (htmlMatch) {
    const normalized = normalizeUrl(htmlMatch[1]);
    if (normalized) explicit.add(normalized);
    htmlMatch = htmlLinkRegex.exec(raw);
  }

  return explicit;
}

function loadRules(contentDir) {
  const configPath = path.join(contentDir, "internal-links.json");
  if (!fs.existsSync(configPath)) return [];

  const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((rule) => rule && typeof rule === "object")
    .map((rule) => {
      const maxPerDoc = Number.isInteger(rule.maxPerDoc) && rule.maxPerDoc > 0 ? rule.maxPerDoc : 1;
      const patterns = Array.isArray(rule.patterns)
        ? rule.patterns.filter((pattern) => typeof pattern === "string" && pattern.trim().length > 0)
        : [];

      return {
        id: typeof rule.id === "string" ? rule.id : "unknown",
        url: normalizeUrl(typeof rule.url === "string" ? rule.url : "") ?? "",
        maxPerDoc,
        patterns,
      };
    })
    .filter((rule) => rule.url.length > 0 && rule.patterns.length > 0);
}

function loadPosts(contentDir) {
  const blogDir = path.join(contentDir, "blog");
  if (!fs.existsSync(blogDir)) return [];

  return fs
    .readdirSync(blogDir)
    .filter((fileName) => fileName.endsWith(".mdx"))
    .map((fileName) => {
      const sourcePath = path.join(blogDir, fileName);
      const source = fs.readFileSync(sourcePath, "utf8");
      const { data, content } = matter(source);

      const locale = data.lang === "en" ? "en" : "fr";
      const slug = fileName.replace(/\.mdx$/, "");

      return {
        slug,
        locale,
        draft: data.draft === true,
        title: typeof data.title === "string" ? data.title : slug,
        content,
      };
    });
}

function buildBlogPath(locale, slug) {
  return `/${locale}/blog/${slug}`;
}

function auditLinks() {
  const contentDir = resolveContentDirectory();
  const rules = loadRules(contentDir);
  const publishedPosts = loadPosts(contentDir).filter((post) => !post.draft);

  const postOutgoingLinks = new Map();
  const generatedByPost = new Map();
  const blogUrls = new Set(publishedPosts.map((post) => buildBlogPath(post.locale, post.slug)));

  for (const post of publishedPosts) {
    const explicitLinks = extractExplicitLinks(post.content);
    const generatedLinks = new Set();
    const usageByUrl = new Map();

    for (const url of explicitLinks) {
      usageByUrl.set(url, (usageByUrl.get(url) ?? 0) + 1);
    }

    const scanText = sanitizeForAutoLinkScan(post.content);

    for (const rule of rules) {
      const localePrefix = rule.url.match(/^\/(fr|en)(?:\/|$)/)?.[1] ?? null;
      if (localePrefix && localePrefix !== post.locale) {
        continue;
      }

      const alreadyUsed = usageByUrl.get(rule.url) ?? 0;
      if (alreadyUsed >= rule.maxPerDoc) {
        continue;
      }

      for (const pattern of rule.patterns) {
        const regex = createPatternRegex(pattern);
        if (!regex) continue;

        if (regex.test(scanText)) {
          usageByUrl.set(rule.url, alreadyUsed + 1);
          generatedLinks.add(rule.url);
          break;
        }
      }
    }

    const outgoing = new Set([...explicitLinks, ...generatedLinks]);

    postOutgoingLinks.set(post.slug, outgoing);
    generatedByPost.set(post.slug, generatedLinks);
  }

  const incomingByUrl = new Map();
  for (const blogUrl of blogUrls) {
    incomingByUrl.set(blogUrl, 0);
  }

  for (const post of publishedPosts) {
    const sourceUrl = buildBlogPath(post.locale, post.slug);
    const outgoing = postOutgoingLinks.get(post.slug) ?? new Set();

    for (const target of outgoing) {
      if (!blogUrls.has(target) || target === sourceUrl) {
        continue;
      }

      incomingByUrl.set(target, (incomingByUrl.get(target) ?? 0) + 1);
    }
  }

  const orphanPages = [...incomingByUrl.entries()]
    .filter(([, incoming]) => incoming === 0)
    .map(([url]) => url)
    .sort((left, right) => left.localeCompare(right));

  const linkedUrls = new Set();
  for (const outgoing of postOutgoingLinks.values()) {
    for (const url of outgoing) {
      linkedUrls.add(url);
    }
  }

  const neverLinkedRuleUrls = rules
    .map((rule) => rule.url)
    .filter((url, index, all) => all.indexOf(url) === index)
    .filter((url) => !linkedUrls.has(url))
    .sort((left, right) => left.localeCompare(right));

  console.log("[blog-audit] Generated internal links per post");
  for (const post of publishedPosts) {
    const generated = [...(generatedByPost.get(post.slug) ?? new Set())].sort((a, b) =>
      a.localeCompare(b),
    );

    console.log(`- ${post.slug} (${post.title})`);
    if (generated.length === 0) {
      console.log("  - none");
    } else {
      for (const url of generated) {
        console.log(`  - ${url}`);
      }
    }
  }

  console.log("\n[blog-audit] Orphan blog pages (0 incoming internal links)");
  if (orphanPages.length === 0) {
    console.log("- none");
  } else {
    for (const orphan of orphanPages) {
      console.log(`- ${orphan}`);
    }
  }

  console.log("\n[blog-audit] Rule URLs never linked");
  if (neverLinkedRuleUrls.length === 0) {
    console.log("- none");
  } else {
    for (const url of neverLinkedRuleUrls) {
      console.log(`- ${url}`);
    }
  }
}

auditLinks();
