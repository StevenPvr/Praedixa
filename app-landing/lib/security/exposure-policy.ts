export type LandingExposureClassification = "P0" | "P1" | "P2" | "P3";
export type LandingExposureSurface =
  | "page"
  | "api"
  | "asset"
  | "feed"
  | "metadata";
export type LandingExposureAudience =
  | "anonymous"
  | "browser"
  | "internal"
  | "internal_automation";
export type LandingExposureAccess =
  | "public"
  | "same_origin"
  | "signed"
  | "deny";

type LandingMatcher =
  | { type: "exact"; value: string }
  | { type: "prefix"; value: string }
  | { type: "template"; value: string };

export interface LandingExposurePolicyRule {
  id: string;
  matcher: LandingMatcher;
  surface: LandingExposureSurface;
  classification: LandingExposureClassification;
  audience: LandingExposureAudience;
  access: LandingExposureAccess;
  indexable: boolean;
  aiCrawlerAllowed: boolean;
  requestBudget: string;
  ownerBusiness: string;
  ownerTechnical: string;
}

const KNOWLEDGE_LOCALIZED_P2_PATHS = [
  "/:locale",
  "/:locale/contact",
  "/:locale/services",
  "/:locale/ressources",
  "/:locale/resources",
  "/:locale/blog",
  "/:locale/comment-ca-marche",
  "/:locale/how-it-works",
  "/:locale/product-method",
  "/:locale/produit-methode",
  "/:locale/decision-log-preuve-roi",
  "/:locale/decision-log-roi-proof",
  "/:locale/integration-data",
  "/:locale/integration-donnees",
  "/:locale/deploiement",
  "/:locale/deployment",
  "/:locale/protocole-deploiement",
  "/:locale/deployment-protocol",
] as const;

const CORPORATE_LOCALIZED_P3_PATHS = [
  "/:locale/a-propos",
  "/:locale/about",
  "/:locale/securite",
  "/:locale/security",
  "/:locale/mentions-legales",
  "/:locale/legal-notice",
  "/:locale/confidentialite",
  "/:locale/privacy-policy",
  "/:locale/cgu",
  "/:locale/terms",
] as const;

export const KNOWN_AI_CRAWLER_TOKENS = [
  "googlebot",
  "googleother",
  "google-extended",
  "google-cloudvertexbot",
  "oai-searchbot",
  "gptbot",
  "chatgpt-user",
  "claudebot",
  "claude-searchbot",
  "claude-user",
  "perplexitybot",
  "perplexity-user",
  "mistralai-user",
  "bytespider",
  "ccbot",
  "amazonbot",
  "meta-externalagent",
  "cohere-ai",
  "applebot-extended",
] as const;

const LANDING_EXPOSURE_POLICY_RULES: readonly LandingExposurePolicyRule[] = [
  {
    id: "landing-robots",
    matcher: { type: "exact", value: "/robots.txt" },
    surface: "metadata",
    classification: "P3",
    audience: "anonymous",
    access: "public",
    indexable: false,
    aiCrawlerAllowed: true,
    requestBudget: "cooperative-bot-metadata",
    ownerBusiness: "SEO",
    ownerTechnical: "Frontend",
  },
  {
    id: "landing-sitemap",
    matcher: { type: "exact", value: "/sitemap.xml" },
    surface: "metadata",
    classification: "P2",
    audience: "anonymous",
    access: "public",
    indexable: false,
    aiCrawlerAllowed: true,
    requestBudget: "search-engine-discovery",
    ownerBusiness: "SEO",
    ownerTechnical: "Frontend",
  },
  {
    id: "landing-rss",
    matcher: { type: "exact", value: "/rss.xml" },
    surface: "feed",
    classification: "P2",
    audience: "anonymous",
    access: "public",
    indexable: false,
    aiCrawlerAllowed: true,
    requestBudget: "low-volume-feed",
    ownerBusiness: "Marketing",
    ownerTechnical: "Frontend",
  },
  {
    id: "landing-llm-alias",
    matcher: { type: "exact", value: "/llm.txt" },
    surface: "metadata",
    classification: "P3",
    audience: "anonymous",
    access: "public",
    indexable: false,
    aiCrawlerAllowed: true,
    requestBudget: "minimal-policy-signal",
    ownerBusiness: "Security",
    ownerTechnical: "Frontend",
  },
  {
    id: "landing-llms-txt",
    matcher: { type: "exact", value: "/llms.txt" },
    surface: "metadata",
    classification: "P2",
    audience: "anonymous",
    access: "public",
    indexable: false,
    aiCrawlerAllowed: true,
    requestBudget: "geo-policy",
    ownerBusiness: "SEO",
    ownerTechnical: "Frontend",
  },
  {
    id: "landing-llms-full",
    matcher: { type: "exact", value: "/llms-full.txt" },
    surface: "metadata",
    classification: "P2",
    audience: "anonymous",
    access: "public",
    indexable: false,
    aiCrawlerAllowed: true,
    requestBudget: "geo-discovery",
    ownerBusiness: "SEO",
    ownerTechnical: "Frontend",
  },
  {
    id: "landing-health",
    matcher: { type: "exact", value: "/api/health" },
    surface: "api",
    classification: "P3",
    audience: "internal_automation",
    access: "public",
    indexable: false,
    aiCrawlerAllowed: false,
    requestBudget: "uptime-probe",
    ownerBusiness: "Platform",
    ownerTechnical: "Frontend",
  },
  {
    id: "landing-contact-ingest",
    matcher: { type: "exact", value: "/api/v1/public/contact-requests" },
    surface: "api",
    classification: "P1",
    audience: "internal_automation",
    access: "same_origin",
    indexable: false,
    aiCrawlerAllowed: false,
    requestBudget: "low-volume-ingest",
    ownerBusiness: "Marketing",
    ownerTechnical: "Frontend",
  },
  {
    id: "landing-browser-asset-access",
    matcher: { type: "exact", value: "/api/resource-asset" },
    surface: "api",
    classification: "P1",
    audience: "browser",
    access: "same_origin",
    indexable: false,
    aiCrawlerAllowed: false,
    requestBudget: "teaser-download-gateway",
    ownerBusiness: "Marketing",
    ownerTechnical: "Frontend",
  },
  {
    id: "landing-browser-form-api",
    matcher: { type: "prefix", value: "/api/" },
    surface: "api",
    classification: "P1",
    audience: "browser",
    access: "same_origin",
    indexable: false,
    aiCrawlerAllowed: false,
    requestBudget: "human-form-submission",
    ownerBusiness: "Marketing",
    ownerTechnical: "Frontend",
  },
  {
    id: "landing-logo-preview",
    matcher: { type: "template", value: "/:locale/logo-preview" },
    surface: "page",
    classification: "P1",
    audience: "internal",
    access: "same_origin",
    indexable: false,
    aiCrawlerAllowed: false,
    requestBudget: "internal-visual-check",
    ownerBusiness: "Brand",
    ownerTechnical: "Frontend",
  },
  {
    id: "landing-serp-asset",
    matcher: { type: "template", value: "/:locale/ressources/:slug/asset" },
    surface: "asset",
    classification: "P1",
    audience: "browser",
    access: "signed",
    indexable: false,
    aiCrawlerAllowed: false,
    requestBudget: "short-lived-download",
    ownerBusiness: "Marketing",
    ownerTechnical: "Frontend",
  },
  {
    id: "landing-serp-resource",
    matcher: { type: "template", value: "/:locale/ressources/:slug" },
    surface: "page",
    classification: "P2",
    audience: "anonymous",
    access: "public",
    indexable: true,
    aiCrawlerAllowed: true,
    requestBudget: "teaser-page",
    ownerBusiness: "SEO",
    ownerTechnical: "Frontend",
  },
  {
    id: "landing-blog-post",
    matcher: { type: "template", value: "/:locale/blog/:slug" },
    surface: "page",
    classification: "P2",
    audience: "anonymous",
    access: "public",
    indexable: true,
    aiCrawlerAllowed: true,
    requestBudget: "editorial-page",
    ownerBusiness: "Marketing",
    ownerTechnical: "Frontend",
  },
  {
    id: "landing-sector-page",
    matcher: { type: "template", value: "/:locale/secteurs/:slug" },
    surface: "page",
    classification: "P2",
    audience: "anonymous",
    access: "public",
    indexable: true,
    aiCrawlerAllowed: true,
    requestBudget: "sector-teaser",
    ownerBusiness: "Marketing",
    ownerTechnical: "Frontend",
  },
  {
    id: "landing-industry-page",
    matcher: { type: "template", value: "/:locale/industries/:slug" },
    surface: "page",
    classification: "P2",
    audience: "anonymous",
    access: "public",
    indexable: true,
    aiCrawlerAllowed: true,
    requestBudget: "sector-teaser",
    ownerBusiness: "Marketing",
    ownerTechnical: "Frontend",
  },
  ...KNOWLEDGE_LOCALIZED_P2_PATHS.map(
    (value): LandingExposurePolicyRule => ({
      id: `landing-knowledge-${value.replaceAll("/", "-").replaceAll(":", "")}`,
      matcher: { type: "template", value },
      surface: "page",
      classification: "P2",
      audience: "anonymous",
      access: "public",
      indexable: true,
      aiCrawlerAllowed: true,
      requestBudget: "marketing-teaser",
      ownerBusiness: "Marketing",
      ownerTechnical: "Frontend",
    }),
  ),
  ...CORPORATE_LOCALIZED_P3_PATHS.map(
    (value): LandingExposurePolicyRule => ({
      id: `landing-corporate-${value.replaceAll("/", "-").replaceAll(":", "")}`,
      matcher: { type: "template", value },
      surface: "page",
      classification: "P3",
      audience: "anonymous",
      access: "public",
      indexable: true,
      aiCrawlerAllowed: true,
      requestBudget: "corporate-reference",
      ownerBusiness: "Legal",
      ownerTechnical: "Frontend",
    }),
  ),
  {
    id: "landing-root-home",
    matcher: { type: "exact", value: "/" },
    surface: "page",
    classification: "P3",
    audience: "anonymous",
    access: "public",
    indexable: false,
    aiCrawlerAllowed: true,
    requestBudget: "redirect-only",
    ownerBusiness: "Marketing",
    ownerTechnical: "Frontend",
  },
  {
    id: "landing-root-legacy-pages",
    matcher: { type: "exact", value: "/mentions-legales" },
    surface: "page",
    classification: "P3",
    audience: "anonymous",
    access: "public",
    indexable: false,
    aiCrawlerAllowed: true,
    requestBudget: "legacy-redirect",
    ownerBusiness: "Legal",
    ownerTechnical: "Frontend",
  },
  {
    id: "landing-root-legacy-privacy",
    matcher: { type: "exact", value: "/confidentialite" },
    surface: "page",
    classification: "P3",
    audience: "anonymous",
    access: "public",
    indexable: false,
    aiCrawlerAllowed: true,
    requestBudget: "legacy-redirect",
    ownerBusiness: "Legal",
    ownerTechnical: "Frontend",
  },
  {
    id: "landing-root-legacy-terms",
    matcher: { type: "exact", value: "/cgu" },
    surface: "page",
    classification: "P3",
    audience: "anonymous",
    access: "public",
    indexable: false,
    aiCrawlerAllowed: true,
    requestBudget: "legacy-redirect",
    ownerBusiness: "Legal",
    ownerTechnical: "Frontend",
  },
  {
    id: "landing-static-apple-touch",
    matcher: { type: "exact", value: "/apple-touch-icon-precomposed.png" },
    surface: "metadata",
    classification: "P3",
    audience: "anonymous",
    access: "public",
    indexable: false,
    aiCrawlerAllowed: false,
    requestBudget: "static-brand-asset",
    ownerBusiness: "Brand",
    ownerTechnical: "Frontend",
  },
] as const;

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function matchTemplate(template: string, pathname: string): boolean {
  const templateSegments = normalizePathname(template)
    .split("/")
    .filter(Boolean);
  const pathSegments = normalizePathname(pathname).split("/").filter(Boolean);

  if (templateSegments.length !== pathSegments.length) {
    return false;
  }

  for (let index = 0; index < templateSegments.length; index += 1) {
    const templateSegment = templateSegments[index];
    const pathSegment = pathSegments[index];

    if (!templateSegment || !pathSegment) {
      return false;
    }

    if (templateSegment.startsWith(":")) {
      continue;
    }

    if (templateSegment !== pathSegment) {
      return false;
    }
  }

  return true;
}

function matchesRule(
  rule: LandingExposurePolicyRule,
  pathname: string,
): boolean {
  const normalizedPath = normalizePathname(pathname);

  if (rule.matcher.type === "exact") {
    return normalizedPath === normalizePathname(rule.matcher.value);
  }

  if (rule.matcher.type === "prefix") {
    return normalizedPath.startsWith(rule.matcher.value);
  }

  return matchTemplate(rule.matcher.value, normalizedPath);
}

export function listLandingExposurePolicyRules(): readonly LandingExposurePolicyRule[] {
  return LANDING_EXPOSURE_POLICY_RULES;
}

export function resolveLandingExposurePolicy(
  pathname: string,
): LandingExposurePolicyRule | null {
  const normalizedPath = normalizePathname(pathname);

  return (
    LANDING_EXPOSURE_POLICY_RULES.find((rule) =>
      matchesRule(rule, normalizedPath),
    ) ?? null
  );
}

export function isKnownAiCrawler(
  userAgent: string | null | undefined,
): boolean {
  const normalizedUserAgent = userAgent?.trim().toLowerCase() ?? "";
  if (!normalizedUserAgent) {
    return false;
  }

  return KNOWN_AI_CRAWLER_TOKENS.some((token) =>
    normalizedUserAgent.includes(token),
  );
}

export function shouldBlockLandingAiCrawler(
  pathname: string,
  userAgent: string | null | undefined,
): { blocked: boolean; policy: LandingExposurePolicyRule | null } {
  const policy = resolveLandingExposurePolicy(pathname);
  if (policy == null) {
    return { blocked: false, policy: null };
  }

  if (!isKnownAiCrawler(userAgent)) {
    return { blocked: false, policy };
  }

  return {
    blocked: !policy.aiCrawlerAllowed || policy.access === "deny",
    policy,
  };
}

export function buildLandingRobotsTag(
  policy: LandingExposurePolicyRule | null,
): string | null {
  if (policy == null) {
    return null;
  }

  if (!policy.indexable) {
    return "noindex, nofollow, noarchive, nosnippet";
  }

  return null;
}
