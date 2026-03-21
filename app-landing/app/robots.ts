import type { MetadataRoute } from "next";

const PUBLIC_PATHS_ONLY = [
  "/api/",
  "/app/",
  "/admin/",
  "/fr/logo-preview",
  "/en/logo-preview",
] as const;

const AI_DISCOVERY_AND_USER_CRAWLERS = [
  "Googlebot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "MistralAI-User",
] as const;

const AI_TRAINING_TOKENS = ["GPTBot", "ClaudeBot", "Google-Extended"] as const;

function allowPublicSite(userAgent: string) {
  return {
    userAgent,
    allow: "/",
    disallow: [...PUBLIC_PATHS_ONLY],
  };
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      allowPublicSite("*"),
      ...AI_DISCOVERY_AND_USER_CRAWLERS.map((userAgent) =>
        allowPublicSite(userAgent),
      ),
      ...AI_TRAINING_TOKENS.map((userAgent) => allowPublicSite(userAgent)),
      {
        userAgent: "AdsBot-Google",
        allow: "/",
      },
      {
        userAgent: "Googlebot-Image",
        allow: "/",
      },
    ],
    host: "https://www.praedixa.com",
    sitemap: "https://www.praedixa.com/sitemap.xml",
  };
}
