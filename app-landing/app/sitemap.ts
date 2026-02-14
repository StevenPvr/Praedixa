import type { MetadataRoute } from "next";
import { locales, localizedSlugs } from "../lib/i18n/config";

const BASE_URL = "https://www.praedixa.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    const altLocale = locale === "fr" ? "en" : "fr";

    // Home
    entries.push({
      url: `${BASE_URL}/${locale}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
      alternates: {
        languages: {
          [locale]: `${BASE_URL}/${locale}`,
          [altLocale]: `${BASE_URL}/${altLocale}`,
        },
      },
    });

    // Pilot form
    entries.push({
      url: `${BASE_URL}/${locale}/${localizedSlugs.pilot[locale]}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: {
        languages: {
          [locale]: `${BASE_URL}/${locale}/${localizedSlugs.pilot[locale]}`,
          [altLocale]: `${BASE_URL}/${altLocale}/${localizedSlugs.pilot[altLocale]}`,
        },
      },
    });

    // Contact form
    entries.push({
      url: `${BASE_URL}/${locale}/${localizedSlugs.contact[locale]}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
      alternates: {
        languages: {
          [locale]: `${BASE_URL}/${locale}/${localizedSlugs.contact[locale]}`,
          [altLocale]: `${BASE_URL}/${altLocale}/${localizedSlugs.contact[altLocale]}`,
        },
      },
    });

    // Legal pages
    for (const key of ["legal", "privacy", "terms"] as const) {
      entries.push({
        url: `${BASE_URL}/${locale}/${localizedSlugs[key][locale]}`,
        lastModified: new Date(),
        changeFrequency: "yearly",
        priority: 0.2,
      });
    }
  }

  return entries;
}
