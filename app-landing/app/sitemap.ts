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
const DEFAULT_LAST_MODIFIED = new Date().toISOString();
const SITE_LAST_MODIFIED = new Date(
  process.env.SEO_SITEMAP_LASTMOD ?? DEFAULT_LAST_MODIFIED,
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

function localizedEntry(
  locale: (typeof locales)[number],
  frPath: string,
  enPath: string,
  priority: number,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
): MetadataRoute.Sitemap[number] {
  const currentPath = locale === "fr" ? frPath : enPath;

  return {
    url: `${BASE_URL}${currentPath}`,
    lastModified: SITE_LAST_MODIFIED,
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
    const frPost = alternates.fr;
    const enPost = alternates.en;
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
      languages.en = `${BASE_URL}${buildBlogPostPath("en", enPost.slug)}`;
    }

    return languages;
  }

  for (const locale of locales) {
    entries.push(localizedEntry(locale, "/fr", "/en", 1, "weekly"));

    entries.push(
      localizedEntry(
        locale,
        `/fr/${localizedSlugs.pilot.fr}`,
        `/en/${localizedSlugs.pilot.en}`,
        0.9,
        "weekly",
      ),
    );

    entries.push(
      localizedEntry(
        locale,
        `/fr/${localizedSlugs.contact.fr}`,
        `/en/${localizedSlugs.contact.en}`,
        0.7,
        "weekly",
      ),
    );

    entries.push(
      localizedEntry(
        locale,
        `/fr/${localizedSlugs.services.fr}`,
        `/en/${localizedSlugs.services.en}`,
        0.8,
        "weekly",
      ),
    );

    entries.push(
      localizedEntry(
        locale,
        "/fr/pilot-protocol",
        "/en/pilot-protocol",
        0.5,
        "monthly",
      ),
    );

    for (const key of ["legal", "privacy", "terms"] as const) {
      entries.push(
        localizedEntry(
          locale,
          `/fr/${localizedSlugs[key].fr}`,
          `/en/${localizedSlugs[key].en}`,
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
    entries.push(localizedEntry(locale, "/fr/blog", "/en/blog", 0.8, "weekly"));

    for (const sector of listSectorPages(locale)) {
      entries.push(
        localizedEntry(
          locale,
          getSectorPagePath("fr", sector.id),
          getSectorPagePath("en", sector.id),
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
      lastModified: SITE_LAST_MODIFIED,
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
      lastModified: post.date,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: {
        languages: buildBlogAlternates(post),
      },
    });
  }

  return entries;
}
