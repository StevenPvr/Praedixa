export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";

export function isValidLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Route slugs that differ between locales */
export const localizedSlugs = {
  demo: { fr: "demo", en: "demo" },
  pilot: { fr: "devenir-pilote", en: "pilot-application" },
  contact: { fr: "contact", en: "contact" },
  services: { fr: "services", en: "services" },
  legal: { fr: "mentions-legales", en: "legal-notice" },
  privacy: { fr: "confidentialite", en: "privacy-policy" },
  terms: { fr: "cgu", en: "terms" },
  about: { fr: "a-propos", en: "about" },
  security: { fr: "securite", en: "security" },
  resources: { fr: "ressources", en: "resources" },
  blog: { fr: "blog", en: "blog" },
  pillarCapacity: {
    fr: "capacite-sous-couverture",
    en: "capacity-coverage-gap",
  },
  pillarLogistics: {
    fr: "logistique-planification-capacite",
    en: "logistics-capacity-planning",
  },
  pillarAbsence: {
    fr: "anticiper-absenteisme-sous-effectif",
    en: "anticipate-absenteeism-understaffing",
  },
  pillarPenalties: {
    fr: "penalites-logistiques-anticipation",
    en: "logistics-penalties-anticipation",
  },
  pillarImpact: {
    fr: "preuve-impact-operations",
    en: "operational-impact-proof",
  },
  bofuLogistics: { fr: "praedixa-logistique", en: "praedixa-logistics" },
  bofuTransport: { fr: "praedixa-transport", en: "praedixa-transport" },
  bofuRetail: {
    fr: "praedixa-distribution-retail",
    en: "praedixa-retail-distribution",
  },
  bofuQsr: {
    fr: "praedixa-restauration-rapide",
    en: "praedixa-quick-service-restaurants",
  },
  clusterCost: {
    fr: "calculer-cout-sous-couverture",
    en: "calculate-coverage-gap-cost",
  },
  clusterForecast: {
    fr: "prevision-charge-capacite-court-horizon",
    en: "short-horizon-workload-capacity-forecast",
  },
  clusterPlaybook: {
    fr: "playbook-options-renfort-reaffectation",
    en: "playbook-staffing-reallocation-options",
  },
  clusterRms: { fr: "rms-vs-praedixa", en: "rms-vs-praedixa" },
  clusterWarehouseForecast: {
    fr: "prevoir-charge-entrepot",
    en: "forecast-warehouse-workload",
  },
  clusterWarehousePlanning: {
    fr: "planification-ressources-entrepot",
    en: "warehouse-resource-planning",
  },
} as const;

const explicitLegacyRedirects = {
  "/pilot-protocol": "/fr/pilot-protocol",
  "/logo-preview": "/fr/logo-preview",
} as const;

export const legacyRedirectMap: Readonly<Record<string, string>> =
  Object.freeze(
    Object.values(localizedSlugs).reduce<Record<string, string>>(
      (acc, pair) => {
        acc[`/${pair.fr}`] = `/fr/${pair.fr}`;
        if (pair.en !== pair.fr) {
          acc[`/${pair.en}`] = `/en/${pair.en}`;
        }
        return acc;
      },
      { ...explicitLegacyRedirects },
    ),
  );

export function getLocalizedPath(
  locale: Locale,
  slug: keyof typeof localizedSlugs,
): string {
  return `/${locale}/${localizedSlugs[slug][locale]}`;
}
