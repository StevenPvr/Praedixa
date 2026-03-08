import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: [
          "/dashboard",
          "/previsions",
          "/messages",
          "/actions",
          "/parametres",
          "/auth",
          "/api",
          "/admin",
        ],
      },
    ],
  };
}
