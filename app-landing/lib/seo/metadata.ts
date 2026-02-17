import type { Metadata } from "next";
import { locales } from "../i18n/config";
import type { Locale } from "../i18n/config";

const BASE_URL = "https://www.praedixa.com";

type LocalePathMap = Record<Locale, string>;

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_URL}${normalized}`;
}

export function alternatesFromPaths(
  paths: LocalePathMap,
  locale: Locale,
): NonNullable<Metadata["alternates"]> {
  return {
    canonical: absoluteUrl(paths[locale]),
    languages: {
      "fr-FR": absoluteUrl(paths.fr),
      en: absoluteUrl(paths.en),
      "x-default": absoluteUrl("/"),
    },
  };
}

interface LocaleMetadataInput {
  locale: Locale;
  paths: LocalePathMap;
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  noindex?: boolean;
}

export function buildLocaleMetadata({
  locale,
  paths,
  title,
  description,
  ogTitle,
  ogDescription,
  noindex = false,
}: LocaleMetadataInput): Metadata {
  const currentPath = paths[locale];
  const altLocale = locale === "fr" ? "en" : "fr";

  return {
    title,
    description,
    alternates: alternatesFromPaths(paths, locale),
    robots: noindex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title: ogTitle ?? title,
      description: ogDescription ?? description,
      url: absoluteUrl(currentPath),
      siteName: "Praedixa",
      locale: locale === "fr" ? "fr_FR" : "en_US",
      alternateLocale: altLocale === "fr" ? "fr_FR" : "en_US",
      type: "website",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: ogTitle ?? title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.png"],
    },
  };
}

export function localePathMap(
  frPath: string,
  enPath: string,
): Record<Locale, string> {
  return { fr: frPath, en: enPath };
}

export function allLocaleHomeAlternates(): NonNullable<Metadata["alternates"]> {
  const map = {
    fr: "/fr",
    en: "/en",
  } satisfies Record<Locale, string>;

  return alternatesFromPaths(map, "fr");
}

export { BASE_URL, locales };
