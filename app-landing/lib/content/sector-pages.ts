import type { Locale } from "../i18n/locale";
import { sectorPagesEn } from "./sector-pages-data/en";
import { sectorPagesFr } from "./sector-pages-data/fr";
import { sectorLegacyAliases, sectorRoutes } from "./sector-pages-data/routes";
import { getSectorDifferentiationCards } from "./sector-pages-data/shared";
import type {
  SectorDifferentiationCard,
  SectorPageEntry,
  SectorPageId,
  SectorSourceLink,
} from "./sector-pages-data/types";

export type {
  SectorChallenge,
  SectorDifferentiationCard,
  SectorLoopStep,
  SectorPageEntry,
  SectorPageId,
  SectorProof,
  SectorSourceLink,
} from "./sector-pages-data/types";

const sectorPagesByLocale = {
  fr: sectorPagesFr,
  en: sectorPagesEn,
} as const satisfies Record<Locale, readonly SectorPageEntry[]>;

export function listSectorPages(locale: Locale): readonly SectorPageEntry[] {
  return sectorPagesByLocale[locale];
}

export function getSectorPageById(
  locale: Locale,
  id: SectorPageId,
): SectorPageEntry {
  const entry = listSectorPages(locale).find((item) => item.id === id);
  if (!entry) {
    throw new Error(`Unknown sector page id "${id}" for locale "${locale}"`);
  }
  return entry;
}

export function getSectorPageBySlug(
  locale: Locale,
  slug: string,
): SectorPageEntry | null {
  return listSectorPages(locale).find((item) => item.slug === slug) ?? null;
}

export function getSectorPagePath(locale: Locale, id: SectorPageId): string {
  const route = sectorRoutes[locale];
  return `${route.basePath}/${route.slugs[id]}`;
}

export function getSectorPageHref(locale: Locale, id: SectorPageId): string {
  return getSectorPagePath(locale, id);
}

export function getSectorAlternatePaths(
  id: SectorPageId,
): Record<Locale, string> {
  return {
    fr: getSectorPagePath("fr", id),
    en: getSectorPagePath("en", id),
  };
}

export function getSectorDisplaySourceLinks(
  entry: SectorPageEntry,
): readonly SectorSourceLink[] {
  const seenUrls = new Set<string>();

  return entry.sourceLinks.filter((source) => {
    if (seenUrls.has(source.url)) {
      return false;
    }

    seenUrls.add(source.url);
    return true;
  });
}

export function listSectorDifferentiationCards(
  locale: Locale,
): readonly SectorDifferentiationCard[] {
  return getSectorDifferentiationCards(locale);
}

export function getSectorLegacyRedirects(): Readonly<Record<string, string>> {
  const redirects: Record<string, string> = {};

  for (const id of Object.keys(sectorLegacyAliases) as SectorPageId[]) {
    const aliases = sectorLegacyAliases[id];

    for (const locale of Object.keys(aliases) as Locale[]) {
      const targetPath = getSectorPagePath(locale, id);

      for (const alias of aliases[locale]) {
        redirects[alias] = targetPath;
      }
    }
  }

  return Object.freeze(redirects);
}
