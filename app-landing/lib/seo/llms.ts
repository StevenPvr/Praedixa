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
      "Canonical French overview of the closed-loop decision product and pilot entry points.",
    ),
    link(
      "Homepage EN",
      "/en",
      "Canonical English overview of the closed-loop decision product and pilot entry points.",
    ),
    link(
      "Pilot Protocol FR",
      "/fr/pilot-protocol",
      "French method, governance, proof model, and how the 3-month pilot is framed.",
    ),
    link(
      "Pilot Protocol EN",
      "/en/pilot-protocol",
      "English method, governance, proof model, and how the 3-month pilot is framed.",
    ),
    link(
      "Pilot Application FR",
      `/fr/${localizedSlugs.pilot.fr}`,
      "French pilot entry page for the 3-month engagement.",
    ),
    link(
      "Pilot Application EN",
      `/en/${localizedSlugs.pilot.en}`,
      "English pilot entry page for the 3-month engagement.",
    ),
    link(
      "Contact FR",
      `/fr/${localizedSlugs.contact.fr}`,
      "French contact path to request the historical audit or discuss a pilot.",
    ),
    link(
      "Contact EN",
      `/en/${localizedSlugs.contact.en}`,
      "English contact path to request the historical audit or discuss a pilot.",
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
    "> Praedixa is a French DecisionOps platform for multi-site operations: connect the systems that matter to a decision, compare cost/service/risk options, trigger the validated first action, and prove ROI decision by decision.",
    "",
    "Canonical domain: https://www.praedixa.com",
    "Primary market language: French, with English parity on core product pages.",
    "",
    section("Canonical Positioning", [
      "- DecisionOps workflow: federate the useful systems, calculate options, trigger the validated action, and prove ROI decision by decision.",
      "- Read-only overlay on existing exports and APIs before any deeper integration.",
      "- Human in the loop: managers remain decision-makers.",
      "- Not a scheduling, WFM, ERP, BI, or generic data-platform replacement project.",
      "- Best fit: multi-site networks that need auditable operational trade-offs.",
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
