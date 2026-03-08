import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/app/",
          "/admin/",
          "/fr/logo-preview",
          "/en/logo-preview",
        ],
      },
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
