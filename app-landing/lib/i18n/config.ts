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
  services: { fr: "services", en: "services" },
  productMethod: { fr: "produit-methode", en: "product-method" },
  howItWorksPage: { fr: "comment-ca-marche", en: "how-it-works" },
  decisionLogProof: {
    fr: "decision-log-preuve-roi",
    en: "decision-log-roi-proof",
  },
  integrationData: { fr: "integration-donnees", en: "integration-data" },
  legal: { fr: "mentions-legales", en: "legal-notice" },
  privacy: { fr: "confidentialite", en: "privacy-policy" },
  terms: { fr: "cgu", en: "terms" },
  about: { fr: "a-propos", en: "about" },
  security: { fr: "securite", en: "security" },
  resources: { fr: "ressources", en: "resources" },
  blog: { fr: "blog", en: "blog" },
} as const;

const explicitLegacyRedirects = {
  "/pilot-protocol": "/fr/pilot-protocol",
  "/logo-preview": "/fr/logo-preview",
} as const;

const retiredKnowledgeRedirects = {
  "/capacite-sous-couverture": "/fr/ressources",
  "/fr/capacite-sous-couverture": "/fr/ressources",
  "/capacity-coverage-gap": "/en/resources",
  "/en/capacity-coverage-gap": "/en/resources",
  "/logistique-planification-capacite": "/fr/ressources",
  "/fr/logistique-planification-capacite": "/fr/ressources",
  "/logistics-capacity-planning": "/en/resources",
  "/en/logistics-capacity-planning": "/en/resources",
  "/anticiper-absenteisme-sous-effectif": "/fr/ressources",
  "/fr/anticiper-absenteisme-sous-effectif": "/fr/ressources",
  "/anticipate-absenteeism-understaffing": "/en/resources",
  "/en/anticipate-absenteeism-understaffing": "/en/resources",
  "/penalites-logistiques-anticipation": "/fr/ressources",
  "/fr/penalites-logistiques-anticipation": "/fr/ressources",
  "/logistics-penalties-anticipation": "/en/resources",
  "/en/logistics-penalties-anticipation": "/en/resources",
  "/preuve-impact-operations": "/fr/ressources",
  "/fr/preuve-impact-operations": "/fr/ressources",
  "/operational-impact-proof": "/en/resources",
  "/en/operational-impact-proof": "/en/resources",
  "/praedixa-logistique": "/fr/ressources",
  "/fr/praedixa-logistique": "/fr/ressources",
  "/praedixa-logistics": "/en/resources",
  "/en/praedixa-logistics": "/en/resources",
  "/praedixa-transport": "/fr/ressources",
  "/fr/praedixa-transport": "/fr/ressources",
  "/en/praedixa-transport": "/en/resources",
  "/praedixa-retail": "/fr/ressources",
  "/fr/praedixa-retail": "/fr/ressources",
  "/en/praedixa-retail": "/en/resources",
  "/praedixa-multi-franchises": "/fr/ressources",
  "/fr/praedixa-multi-franchises": "/fr/ressources",
  "/praedixa-multi-franchise-networks": "/en/resources",
  "/en/praedixa-multi-franchise-networks": "/en/resources",
  "/praedixa-automobile": "/fr/ressources",
  "/fr/praedixa-automobile": "/fr/ressources",
  "/praedixa-automotive": "/en/resources",
  "/en/praedixa-automotive": "/en/resources",
  "/praedixa-concessions-ateliers": "/fr/ressources",
  "/fr/praedixa-concessions-ateliers": "/fr/ressources",
  "/praedixa-auto-dealerships-workshops": "/en/resources",
  "/en/praedixa-auto-dealerships-workshops": "/en/resources",
  "/calculer-cout-sous-couverture": "/fr/ressources",
  "/fr/calculer-cout-sous-couverture": "/fr/ressources",
  "/calculate-coverage-gap-cost": "/en/resources",
  "/en/calculate-coverage-gap-cost": "/en/resources",
  "/prevision-charge-capacite-court-horizon": "/fr/ressources",
  "/fr/prevision-charge-capacite-court-horizon": "/fr/ressources",
  "/short-horizon-workload-capacity-forecast": "/en/resources",
  "/en/short-horizon-workload-capacity-forecast": "/en/resources",
  "/playbook-options-renfort-reaffectation": "/fr/ressources",
  "/fr/playbook-options-renfort-reaffectation": "/fr/ressources",
  "/playbook-staffing-reallocation-options": "/en/resources",
  "/en/playbook-staffing-reallocation-options": "/en/resources",
  "/rms-vs-praedixa": "/fr/ressources",
  "/fr/rms-vs-praedixa": "/fr/ressources",
  "/en/rms-vs-praedixa": "/en/resources",
  "/prevoir-charge-entrepot": "/fr/ressources",
  "/fr/prevoir-charge-entrepot": "/fr/ressources",
  "/forecast-warehouse-workload": "/en/resources",
  "/en/forecast-warehouse-workload": "/en/resources",
  "/planification-ressources-entrepot": "/fr/ressources",
  "/fr/planification-ressources-entrepot": "/fr/ressources",
  "/warehouse-resource-planning": "/en/resources",
  "/en/warehouse-resource-planning": "/en/resources",
  "/praedixa-restauration-rapide": "/fr/ressources",
  "/fr/praedixa-restauration-rapide": "/fr/ressources",
  "/praedixa-quick-service-restaurants": "/en/resources",
  "/en/praedixa-quick-service-restaurants": "/en/resources",
  "/praedixa-distribution-retail": "/fr/ressources",
  "/fr/praedixa-distribution-retail": "/fr/ressources",
  "/praedixa-retail-distribution": "/en/resources",
  "/en/praedixa-retail-distribution": "/en/resources",
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
      { ...explicitLegacyRedirects, ...retiredKnowledgeRedirects },
    ),
  );

export function getLocalizedPath(
  locale: Locale,
  slug: keyof typeof localizedSlugs,
): string {
  return `/${locale}/${localizedSlugs[slug][locale]}`;
}
