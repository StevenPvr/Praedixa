import type { MetadataRoute } from "next";

const PUBLIC_PATHS_ONLY = [
  "/api/",
  "/app/",
  "/admin/",
  "/fr/logo-preview",
  "/en/logo-preview",
] as const;

const AI_CRAWLERS = [
  "OAI-SearchBot",
  "GPTBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
] as const;

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
      ...AI_CRAWLERS.map((userAgent) => allowPublicSite(userAgent)),
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
