import type { Locale } from "../../i18n/locale";
import type {
  SectorLegacyAliasConfig,
  SectorPageId,
  SectorRouteConfig,
} from "./types";

export const sectorRoutes: Record<Locale, SectorRouteConfig> = {
  fr: {
    basePath: "/fr/secteurs",
    slugs: {
      hcr: "hcr",
      "higher-education": "enseignement-superieur",
      "logistics-transport-retail": "logistique-transport-retail",
      automotive: "automobile-concessions-ateliers",
    },
  },
  en: {
    basePath: "/en/industries",
    slugs: {
      hcr: "hospitality-food-service",
      "higher-education": "higher-education",
      "logistics-transport-retail": "logistics-transport-retail",
      automotive: "automotive-dealerships-workshops",
    },
  },
};

export const sectorLegacyAliases: Record<
  SectorPageId,
  SectorLegacyAliasConfig
> = {
  hcr: {
    fr: ["/praedixa-restauration-rapide", "/fr/praedixa-restauration-rapide"],
    en: [
      "/praedixa-quick-service-restaurants",
      "/en/praedixa-quick-service-restaurants",
    ],
  },
  "higher-education": {
    fr: [],
    en: [],
  },
  "logistics-transport-retail": {
    fr: [
      "/praedixa-logistique",
      "/fr/praedixa-logistique",
      "/praedixa-transport",
      "/fr/praedixa-transport",
      "/praedixa-retail",
      "/fr/praedixa-retail",
      "/praedixa-distribution-retail",
      "/fr/praedixa-distribution-retail",
    ],
    en: [
      "/praedixa-logistics",
      "/en/praedixa-logistics",
      "/en/praedixa-transport",
      "/en/praedixa-retail",
      "/praedixa-retail-distribution",
      "/en/praedixa-retail-distribution",
    ],
  },
  automotive: {
    fr: [
      "/praedixa-automobile",
      "/fr/praedixa-automobile",
      "/praedixa-concessions-ateliers",
      "/fr/praedixa-concessions-ateliers",
    ],
    en: [
      "/praedixa-automotive",
      "/en/praedixa-automotive",
      "/praedixa-auto-dealerships-workshops",
      "/en/praedixa-auto-dealerships-workshops",
    ],
  },
};
