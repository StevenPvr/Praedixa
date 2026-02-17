export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";

export function isValidLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Route slugs that differ between locales */
export const localizedSlugs = {
  pilot: { fr: "devenir-pilote", en: "pilot-application" },
  contact: { fr: "contact", en: "contact" },
  legal: { fr: "mentions-legales", en: "legal-notice" },
  privacy: { fr: "confidentialite", en: "privacy-policy" },
  terms: { fr: "cgu", en: "terms" },
  about: { fr: "a-propos", en: "about" },
  resources: { fr: "ressources", en: "resources" },
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

export const legacyGonePaths = [
  "/devenir-pilote",
  "/pilot-application",
  "/contact",
  "/mentions-legales",
  "/legal-notice",
  "/confidentialite",
  "/privacy-policy",
  "/cgu",
  "/terms",
  "/a-propos",
  "/about",
  "/ressources",
  "/resources",
  "/praedixa-logistique",
  "/praedixa-logistics",
  "/praedixa-transport",
  "/praedixa-distribution-retail",
  "/praedixa-retail-distribution",
] as const;

const localizedPathCandidates = Object.values(localizedSlugs).flatMap(
  (pair) => [`/${pair.fr}`, `/${pair.en}`],
);

export const gonePaths = Array.from(
  new Set([...legacyGonePaths, ...localizedPathCandidates]),
);

export function getLocalizedPath(
  locale: Locale,
  slug: keyof typeof localizedSlugs,
): string {
  return `/${locale}/${localizedSlugs[slug][locale]}`;
}
