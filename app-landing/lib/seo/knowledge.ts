import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "../i18n/config";
import { isValidLocale, localizedSlugs } from "../i18n/config";
import type { KnowledgePageKey } from "../content/knowledge-pages";
import { getKnowledgePage } from "../content/knowledge-pages";
import { buildLocaleMetadata, localePathMap } from "./metadata";

export function buildKnowledgePaths(
  key: KnowledgePageKey,
): Record<Locale, string> {
  return localePathMap(
    `/fr/${localizedSlugs[key].fr}`,
    `/en/${localizedSlugs[key].en}`,
  );
}

export async function generateKnowledgeMetadata(
  params: Promise<{ locale: string }>,
  key: KnowledgePageKey,
): Promise<Metadata> {
  const { locale } = await params;
  if (!isValidLocale(locale)) return {};

  const page = getKnowledgePage(locale, key);
  return buildLocaleMetadata({
    locale,
    paths: buildKnowledgePaths(key),
    title: `Praedixa | ${page.title}`,
    description: page.description,
  });
}

export async function resolveLocale(
  params: Promise<{ locale: string }>,
): Promise<Locale> {
  const { locale } = await params;
  if (!isValidLocale(locale)) {
    notFound();
  }
  return locale;
}
