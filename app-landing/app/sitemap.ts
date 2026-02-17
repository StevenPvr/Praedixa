import type { MetadataRoute } from "next";
import { locales, localizedSlugs } from "../lib/i18n/config";

const BASE_URL = "https://www.praedixa.com";

const CONTENT_KEYS = [
  "about",
  "security",
  "resources",
  "pillarCapacity",
  "pillarLogistics",
  "pillarAbsence",
  "pillarPenalties",
  "pillarImpact",
  "bofuLogistics",
  "bofuTransport",
  "bofuRetail",
  "clusterCost",
  "clusterForecast",
  "clusterPlaybook",
  "clusterRms",
  "clusterWarehouseForecast",
  "clusterWarehousePlanning",
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
    lastModified: new Date(),
    changeFrequency,
    priority,
    alternates: {
      languages: {
        "fr-FR": `${BASE_URL}${frPath}`,
        en: `${BASE_URL}${enPath}`,
        "x-default": `${BASE_URL}/`,
      },
    },
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  entries.push({
    url: `${BASE_URL}/`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.8,
    alternates: {
      languages: {
        "x-default": `${BASE_URL}/`,
        "fr-FR": `${BASE_URL}/fr`,
        en: `${BASE_URL}/en`,
      },
    },
  });

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
          key === "resources" || key.startsWith("pillar") ? 0.8 : 0.6,
          "weekly",
        ),
      );
    }
  }

  return entries;
}
