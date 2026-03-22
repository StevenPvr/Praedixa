import fs from "node:fs";
import path from "node:path";
import type { MetadataRoute } from "next";
import { locales, localizedSlugs } from "../lib/i18n/config";
import {
  listSectorPages,
  getSectorPagePath,
} from "../lib/content/sector-pages";
import { getSerpResourceSlugs } from "../lib/content/serp-resources-fr";
import {
  buildBlogPostPath,
  getBlogPostAlternateLocales,
  getPublishedBlogPosts,
} from "../lib/blog/posts";
import type { BlogPost } from "../lib/blog/types";

const BASE_URL = "https://www.praedixa.com";
const SITEMAP_LAST_MODIFIED_FALLBACK = new Date(
  process.env["SEO_SITEMAP_LASTMOD"] ?? "2026-03-20T00:00:00.000Z",
);

const CONTENT_KEYS = [
  "about",
  "security",
  "resources",
  "productMethod",
  "howItWorksPage",
  "decisionLogProof",
  "integrationData",
] as const;

function collectFiles(candidatePath: string): string[] {
  if (!fs.existsSync(candidatePath)) {
    return [];
  }

  const stats = fs.statSync(candidatePath);
  if (stats.isFile()) {
    return [candidatePath];
  }

  return fs
    .readdirSync(candidatePath)
    .flatMap((entry) => collectFiles(path.join(candidatePath, entry)));
}

function resolveCandidatePath(candidate: string): string {
  return path.isAbsolute(candidate)
    ? candidate
    : path.resolve(process.cwd(), candidate);
}

function resolveLatestTimestamp(candidates: string[]): Date {
  let latestMtimeMs = 0;

  for (const candidate of candidates) {
    for (const filePath of collectFiles(resolveCandidatePath(candidate))) {
      const stats = fs.statSync(filePath);
      latestMtimeMs = Math.max(latestMtimeMs, stats.mtimeMs);
    }
  }

  return latestMtimeMs > 0
    ? new Date(latestMtimeMs)
    : SITEMAP_LAST_MODIFIED_FALLBACK;
}

function resolveBlogPostLastModified(post: BlogPost): Date {
  return resolveLatestTimestamp([
    post.sourcePath,
    "app-landing/components/blog/BlogPostPage.tsx",
    "app-landing/app/[locale]/blog/[slug]/page.tsx",
  ]);
}

const HOME_LAST_MODIFIED = resolveLatestTimestamp([
  "app-landing/app/[locale]/page.tsx",
  "app-landing/components/homepage",
  "app-landing/lib/content/value-prop",
]);
const CONTACT_LAST_MODIFIED = resolveLatestTimestamp([
  "app-landing/app/[locale]/contact",
  "app-landing/components/pages/ContactPageClient.tsx",
  "app-landing/components/pages/ContactPageForm.tsx",
  "app-landing/components/pages/ContactPageAside.tsx",
  "app-landing/components/pages/contact-page.copy.ts",
]);
const SERVICES_LAST_MODIFIED = resolveLatestTimestamp([
  "app-landing/app/[locale]/services",
  "app-landing/components/pages/ServicesPage.tsx",
  "app-landing/lib/content/value-prop",
]);
const LEGAL_LAST_MODIFIED = resolveLatestTimestamp([
  "app-landing/lib/content/legal.ts",
  "app-landing/app/[locale]/mentions-legales",
  "app-landing/app/[locale]/confidentialite",
  "app-landing/app/[locale]/cgu",
  "app-landing/app/[locale]/legal-notice",
  "app-landing/app/[locale]/privacy-policy",
  "app-landing/app/[locale]/terms",
]);
const KNOWLEDGE_LAST_MODIFIED = resolveLatestTimestamp([
  "app-landing/components/pages/KnowledgePage.tsx",
  "app-landing/lib/content/knowledge-pages.ts",
  "app-landing/lib/content/knowledge-pages-shared.ts",
  "app-landing/lib/content/knowledge-pages-fr-a.ts",
  "app-landing/lib/content/knowledge-pages-en-a.ts",
]);
const BLOG_INDEX_LAST_MODIFIED = resolveLatestTimestamp([
  "app-landing/components/blog",
  "app-landing/app/[locale]/blog/page.tsx",
  "marketing/content/blog",
]);
const SECTOR_PAGES_LAST_MODIFIED = resolveLatestTimestamp([
  "app-landing/components/pages/SectorPage.tsx",
  "app-landing/lib/content/sector-pages.ts",
  "app-landing/lib/content/sector-pages-data",
  "app-landing/app/[locale]/secteurs",
  "app-landing/app/[locale]/industries",
]);
const SERP_RESOURCE_LAST_MODIFIED = resolveLatestTimestamp([
  "app-landing/components/pages/SerpResourcePage.tsx",
  "app-landing/app/[locale]/ressources/[slug]/page.tsx",
  "app-landing/lib/content/serp-resources-fr.ts",
  "app-landing/lib/content/serp-resources-fr.core.ts",
  "app-landing/lib/content/serp-resources-fr.mid.ts",
  "app-landing/lib/content/serp-resources-fr.tail.ts",
  "app-landing/lib/content/serp-resources-fr.shared.ts",
]);

function localizedEntry(
  locale: (typeof locales)[number],
  frPath: string,
  enPath: string,
  lastModified: Date,
  priority: number,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
): MetadataRoute.Sitemap[number] {
  const currentPath = locale === "fr" ? frPath : enPath;

  return {
    url: `${BASE_URL}${currentPath}`,
    lastModified,
    changeFrequency,
    priority,
    alternates: {
      languages: {
        "fr-FR": `${BASE_URL}${frPath}`,
        en: `${BASE_URL}${enPath}`,
        "x-default": `${BASE_URL}${frPath}`,
      },
    },
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  const serpSlugs = getSerpResourceSlugs();
  const publishedBlogPosts = getPublishedBlogPosts();

  function buildBlogAlternates(post: BlogPost): Record<string, string> {
    const alternates = getBlogPostAlternateLocales(post);
    const frPost = alternates["fr"];
    const enPost = alternates["en"];
    const fallbackPath = `${BASE_URL}${buildBlogPostPath(post.locale, post.slug)}`;

    const languages: Record<string, string> = {
      "x-default": frPost
        ? `${BASE_URL}${buildBlogPostPath("fr", frPost.slug)}`
        : fallbackPath,
    };

    if (frPost) {
      languages["fr-FR"] = `${BASE_URL}${buildBlogPostPath("fr", frPost.slug)}`;
    }

    if (enPost) {
      languages["en"] = `${BASE_URL}${buildBlogPostPath("en", enPost.slug)}`;
    }

    return languages;
  }

  for (const locale of locales) {
    entries.push(
      localizedEntry(locale, "/fr", "/en", HOME_LAST_MODIFIED, 1, "weekly"),
    );

    entries.push(
      localizedEntry(
        locale,
        `/fr/${localizedSlugs.contact.fr}`,
        `/en/${localizedSlugs.contact.en}`,
        CONTACT_LAST_MODIFIED,
        0.7,
        "weekly",
      ),
    );

    entries.push(
      localizedEntry(
        locale,
        `/fr/${localizedSlugs.services.fr}`,
        `/en/${localizedSlugs.services.en}`,
        SERVICES_LAST_MODIFIED,
        0.8,
        "weekly",
      ),
    );

    for (const key of ["legal", "privacy", "terms"] as const) {
      entries.push(
        localizedEntry(
          locale,
          `/fr/${localizedSlugs[key].fr}`,
          `/en/${localizedSlugs[key].en}`,
          LEGAL_LAST_MODIFIED,
          0.3,
          "yearly",
        ),
      );
    }

    for (const key of CONTENT_KEYS) {
      entries.push(
        localizedEntry(
          locale,
          `/fr/${localizedSlugs[key].fr}`,
          `/en/${localizedSlugs[key].en}`,
          KNOWLEDGE_LAST_MODIFIED,
          key === "resources" ||
            key.startsWith("pillar") ||
            key === "productMethod"
            ? 0.8
            : key.startsWith("bofu") || key.startsWith("icp")
              ? 0.75
              : 0.6,
          "weekly",
        ),
      );
    }
    entries.push(
      localizedEntry(
        locale,
        "/fr/blog",
        "/en/blog",
        BLOG_INDEX_LAST_MODIFIED,
        0.8,
        "weekly",
      ),
    );

    for (const sector of listSectorPages(locale)) {
      entries.push(
        localizedEntry(
          locale,
          getSectorPagePath("fr", sector.id),
          getSectorPagePath("en", sector.id),
          SECTOR_PAGES_LAST_MODIFIED,
          0.78,
          "weekly",
        ),
      );
    }
  }

  for (const slug of serpSlugs) {
    const url = `${BASE_URL}/fr/ressources/${slug}`;
    entries.push({
      url,
      lastModified: SERP_RESOURCE_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: {
        languages: {
          "fr-FR": url,
          "x-default": url,
        },
      },
    });
  }

  for (const post of publishedBlogPosts) {
    const path = buildBlogPostPath(post.locale, post.slug);
    entries.push({
      url: `${BASE_URL}${path}`,
      lastModified: resolveBlogPostLastModified(post),
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: {
        languages: buildBlogAlternates(post),
      },
    });
  }

  return entries;
}
