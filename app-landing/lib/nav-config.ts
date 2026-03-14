import type { Locale } from "./i18n/config";
import { getLocalizedPath } from "./i18n/config";
import { getSectorPageHref, listSectorPages } from "./content/sector-pages";

export interface NavChildItem {
  label: string;
  href: string;
  description?: string;
  primary?: boolean;
}

export interface NavMenuMeta {
  kicker: string;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  columns?: 1 | 2;
  panelWidth?: "md" | "lg";
}

export interface NavGroup {
  key: string;
  label: string;
  href?: string;
  items?: NavChildItem[];
  menu?: NavMenuMeta;
}

export function getNavGroups(locale: Locale): NavGroup[] {
  return [
    createSimpleNavGroup(
      "method",
      copy(locale, "Méthode", "Method"),
      getLocalizedPath(locale, "productMethod"),
    ),
    createSectorsNavGroup(locale),
    createSimpleNavGroup(
      "proof",
      copy(locale, "Preuve", "Proof"),
      getLocalizedPath(locale, "decisionLogProof"),
    ),
    createSimpleNavGroup(
      "integration",
      copy(locale, "Intégration", "Integration"),
      getLocalizedPath(locale, "integrationData"),
    ),
    createSimpleNavGroup(
      "offer",
      copy(locale, "Offre", "Offer"),
      getLocalizedPath(locale, "services"),
    ),
    createSimpleNavGroup(
      "contact",
      copy(locale, "Contact", "Contact"),
      getLocalizedPath(locale, "contact"),
    ),
  ];
}

function createSimpleNavGroup(
  key: string,
  label: string,
  href: string,
): NavGroup {
  return {
    key,
    label,
    href,
  };
}

function createSectorsNavGroup(locale: Locale): NavGroup {
  const sectorItems = listSectorPages(locale).map((entry) => ({
    label: entry.shortLabel,
    href: getSectorPageHref(locale, entry.id),
    description: entry.homepageProblem,
  }));

  return {
    key: "sectors",
    label: copy(locale, "Secteurs", "Industries"),
    items: sectorItems,
    menu: {
      kicker: copy(locale, "Verticales", "Industries"),
      title: copy(locale, "Accéder aux pages ICP", "Browse ICP pages"),
      description: copy(
        locale,
        "Retrouvez chaque verticale avec son contexte métier, ses arbitrages et ses leviers exacts.",
        "Open each industry page with its own operational context, trade-offs, and decision levers.",
      ),
      ctaLabel: copy(locale, "Voir la page ressources", "Open resources hub"),
      ctaHref: getLocalizedPath(locale, "resources"),
      columns: 2,
      panelWidth: "lg",
    },
  };
}

function copy(locale: Locale, fr: string, en: string): string {
  return locale === "fr" ? fr : en;
}
