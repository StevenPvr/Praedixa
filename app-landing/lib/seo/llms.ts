import { getPublishedBlogPosts, buildBlogPostPath } from "../blog/posts";
import {
  getKnowledgePage,
  type KnowledgePageKey,
} from "../content/knowledge-pages";
import { listSectorPages, getSectorPagePath } from "../content/sector-pages";
import { serpResourceTargetsFr } from "../content/serp-resources-fr";
import { localizedSlugs } from "../i18n/config";

const BASE_URL = "https://www.praedixa.com";

const knowledgePageKeys = [
  "about",
  "security",
  "resources",
  "productMethod",
  "howItWorksPage",
  "decisionLogProof",
  "integrationData",
] as const satisfies readonly KnowledgePageKey[];

function absolute(path: string): string {
  return `${BASE_URL}${path}`;
}

function link(label: string, path: string, description: string): string {
  return `- [${label}](${absolute(path)}): ${description}`;
}

function section(title: string, lines: string[]): string {
  return [`## ${title}`, ...lines, ""].join("\n");
}

function buildPrimaryLinks() {
  return [
    link(
      "Homepage FR",
      "/fr",
      "Canonical French overview: AI-powered operational decisions with measurable ROI for multi-site networks.",
    ),
    link(
      "Homepage EN",
      "/en",
      "Canonical English overview: AI-powered operational decisions with measurable ROI for multi-site networks.",
    ),
    link(
      "Deployment FR",
      `/fr/${localizedSlugs.deployment.fr}`,
      "French page to frame Praedixa deployment.",
    ),
    link(
      "Deployment EN",
      `/en/${localizedSlugs.deployment.en}`,
      "English page to frame Praedixa deployment.",
    ),
    link(
      "Contact FR",
      `/fr/${localizedSlugs.contact.fr}`,
      "French contact path to request historical proof or discuss deployment.",
    ),
    link(
      "Contact EN",
      `/en/${localizedSlugs.contact.en}`,
      "English contact path to request historical proof or discuss deployment.",
    ),
    link(
      "llms-full.txt",
      "/llms-full.txt",
      "Expanded inventory of canonical pages, resources, and blog content.",
    ),
  ];
}

function buildCoreKnowledgeLinks() {
  return [
    link(
      "Resources FR",
      `/fr/${localizedSlugs.resources.fr}`,
      "French canonical hub for resource pages and GEO-oriented content.",
    ),
    link(
      "Resources EN",
      `/en/${localizedSlugs.resources.en}`,
      "English canonical hub for product knowledge and trust content.",
    ),
    link(
      "About FR",
      `/fr/${localizedSlugs.about.fr}`,
      "French company context, positioning, and what Praedixa is building.",
    ),
    link(
      "About EN",
      `/en/${localizedSlugs.about.en}`,
      "English company context, positioning, and what Praedixa is building.",
    ),
    link(
      "Security FR",
      `/fr/${localizedSlugs.security.fr}`,
      "French security and governance summary for buyers and operators.",
    ),
    link(
      "Security EN",
      `/en/${localizedSlugs.security.en}`,
      "English security and governance summary for buyers and operators.",
    ),
    ...listSectorPages("fr").map((entry) =>
      link(
        `Sector FR: ${entry.title}`,
        getSectorPagePath("fr", entry.id),
        entry.metaDescription,
      ),
    ),
    ...listSectorPages("en").map((entry) =>
      link(
        `Industry EN: ${entry.title}`,
        getSectorPagePath("en", entry.id),
        entry.metaDescription,
      ),
    ),
  ];
}

function buildKnowledgeLinks(locale: "fr" | "en") {
  return knowledgePageKeys.map((key) => {
    const page = getKnowledgePage(locale, key);
    const path = `/${locale}/${localizedSlugs[key][locale]}`;
    return link(page.title, path, page.description);
  });
}

function buildFrenchResourceLinks() {
  return serpResourceTargetsFr.map((entry) =>
    link(entry.title, `/fr/ressources/${entry.slug}`, entry.description),
  );
}

function buildBlogLinks() {
  const posts = getPublishedBlogPosts();
  if (posts.length === 0) {
    return [
      link(
        "Blog FR",
        "/fr/blog",
        "French editorial hub for decision intelligence, operational governance, and ROI proof.",
      ),
      link(
        "Blog EN",
        "/en/blog",
        "English editorial hub for decision intelligence, operational governance, and ROI proof.",
      ),
      "- No published blog articles are currently indexed in the repository snapshot.",
    ];
  }

  const hubs = [
    link(
      "Blog FR",
      "/fr/blog",
      "French editorial hub for decision intelligence, operational governance, and ROI proof.",
    ),
    link(
      "Blog EN",
      "/en/blog",
      "English editorial hub for decision intelligence, operational governance, and ROI proof.",
    ),
  ];

  const postLinks = posts.map((post) =>
    link(
      `${post.locale.toUpperCase()} blog: ${post.title}`,
      buildBlogPostPath(post.locale, post.slug),
      post.description,
    ),
  );

  return [...hubs, ...postLinks];
}

export function buildLlmsTxt(): string {
  return [
    "# Praedixa",
    "",
    "> Praedixa anticipates operational needs, optimizes decisions, and proves ROI for multi-site networks. Operational in 30 days.",
    "",
    "Canonical domain: https://www.praedixa.com",
    "Primary market language: French, with English parity on core product pages.",
    "",
    section("Canonical Positioning", [
      "- Primary audience: COO, operations leaders, and network managers in multi-site organizations.",
      "- Praedixa anticipates operational needs, compares options, and proves ROI on every decision.",
      "- Read-only overlay on existing data and tools before any deeper integration.",
      "- Human in the loop: managers remain decision-makers.",
      "- Not a scheduling, WFM, ERP, BI, or generic data-platform replacement project.",
      "- Best fit: multi-site networks that need AI-powered anticipation, option comparison, and measurable ROI.",
    ]),
    section("Primary Entry Points", buildPrimaryLinks()),
    section("Core Knowledge", buildCoreKnowledgeLinks()),
    section("Optional", [
      link("Sitemap", "/sitemap.xml", "XML index of canonical public URLs."),
      link(
        "RSS feed",
        "/rss.xml",
        "Editorial feed when blog content is published.",
      ),
    ]),
  ].join("\n");
}

export function buildLlmsFullTxt(): string {
  return [
    "# Praedixa full content index",
    "",
    "> Expanded index of canonical Praedixa pages for AI retrieval systems. Prefer the URLs below over retired legacy slugs and redirected knowledge pages.",
    "",
    "Canonical domain: https://www.praedixa.com",
    "",
    section("Primary Pages", buildPrimaryLinks()),
    section("Core FR", buildKnowledgeLinks("fr")),
    section("Core EN", buildKnowledgeLinks("en")),
    section("Sector Pages", [
      ...listSectorPages("fr").map((entry) =>
        link(
          `Sector FR: ${entry.title}`,
          getSectorPagePath("fr", entry.id),
          entry.metaDescription,
        ),
      ),
      ...listSectorPages("en").map((entry) =>
        link(
          `Industry EN: ${entry.title}`,
          getSectorPagePath("en", entry.id),
          entry.metaDescription,
        ),
      ),
    ]),
    section("French SERP Resource Library", buildFrenchResourceLinks()),
    section("Blog and Editorial Surfaces", buildBlogLinks()),
    section("Legal and Trust", [
      link(
        "Legal Notice FR",
        `/fr/${localizedSlugs.legal.fr}`,
        "French legal notice.",
      ),
      link(
        "Privacy Policy FR",
        `/fr/${localizedSlugs.privacy.fr}`,
        "French privacy policy.",
      ),
      link(
        "Terms FR",
        `/fr/${localizedSlugs.terms.fr}`,
        "French terms and conditions.",
      ),
      link(
        "Legal Notice EN",
        `/en/${localizedSlugs.legal.en}`,
        "English legal notice.",
      ),
      link(
        "Privacy Policy EN",
        `/en/${localizedSlugs.privacy.en}`,
        "English privacy policy.",
      ),
      link(
        "Terms EN",
        `/en/${localizedSlugs.terms.en}`,
        "English terms and conditions.",
      ),
    ]),
  ].join("\n");
}
