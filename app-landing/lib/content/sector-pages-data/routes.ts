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
      "logistics-transport-retail": "logistique-transport-retail",
    },
  },
  en: {
    basePath: "/en/industries",
    slugs: {
      hcr: "hospitality-food-service",
      "logistics-transport-retail": "logistics-transport-retail",
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
};
