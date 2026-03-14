import { getSectorLegacyRedirects } from "../content/sector-pages";
import type { Locale } from "./locale";

export { defaultLocale, isValidLocale, locales, type Locale } from "./locale";

export type ContactRouteIntent = "deployment" | "historical_proof";

/** Route slugs that differ between locales */
export const localizedSlugs = {
  deployment: { fr: "deploiement", en: "deployment" },
  deploymentProtocol: {
    fr: "protocole-deploiement",
    en: "deployment-protocol",
  },
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
  "/protocole-deploiement": "/fr/protocole-deploiement",
  "/deployment-protocol": "/en/deployment-protocol",
  "/logo-preview": "/fr/logo-preview",
} as const;

const retiredCommercialRedirects = {
  "/devenir-pilote": buildContactIntentHref("fr", "historical_proof"),
  "/fr/devenir-pilote": buildContactIntentHref("fr", "historical_proof"),
  "/pilot-application": buildContactIntentHref("en", "historical_proof"),
  "/en/pilot-application": buildContactIntentHref("en", "historical_proof"),
  "/roi-pilot": buildContactIntentHref("en", "historical_proof"),
  "/en/roi-pilot": buildContactIntentHref("en", "historical_proof"),
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
  "/praedixa-multi-franchises": "/fr/ressources",
  "/fr/praedixa-multi-franchises": "/fr/ressources",
  "/praedixa-multi-franchise-networks": "/en/resources",
  "/en/praedixa-multi-franchise-networks": "/en/resources",
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
      {
        ...explicitLegacyRedirects,
        ...retiredCommercialRedirects,
        ...retiredKnowledgeRedirects,
        ...getSectorLegacyRedirects(),
      },
    ),
  );

export function getLocalizedPath(
  locale: Locale,
  slug: keyof typeof localizedSlugs,
): string {
  return `/${locale}/${localizedSlugs[slug][locale]}`;
}

export function getContactIntentQueryValue(
  locale: Locale,
  intent: ContactRouteIntent,
): string {
  if (intent === "historical_proof") {
    return locale === "fr" ? "historique" : "historical-proof";
  }

  return locale === "fr" ? "deploiement" : "deployment";
}

export function buildContactIntentHref(
  locale: Locale,
  intent: ContactRouteIntent,
): string {
  const search = new URLSearchParams({
    intent: getContactIntentQueryValue(locale, intent),
  });

  return `${getLocalizedPath(locale, "contact")}?${search.toString()}`;
}
