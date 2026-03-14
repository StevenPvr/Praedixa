import {
  PRAEDIXA_BASE_URL,
  PRAEDIXA_BRAND_NAME,
  PRAEDIXA_LOGO_URL,
  PRAEDIXA_LINKEDIN_URL,
} from "../../lib/seo/entity";
import { buildContactIntentHref } from "../../lib/i18n/config";
import type { Locale } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";
import { serializeJsonForScriptTag } from "../../lib/security/json-script";

interface JsonLdProps {
  locale: Locale;
  dict: Dictionary;
  types?: readonly JsonLdType[];
}

type JsonLdType =
  | "organization"
  | "website"
  | "softwareApplication"
  | "service"
  | "faq";

function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${PRAEDIXA_BASE_URL}#organization`,
    name: PRAEDIXA_BRAND_NAME,
    url: PRAEDIXA_BASE_URL,
    logo: PRAEDIXA_LOGO_URL,
    sameAs: [PRAEDIXA_LINKEDIN_URL],
    contactPoint: {
      "@type": "ContactPoint",
      email: "hello@praedixa.com",
      contactType: "sales",
    },
  };
}

function webSiteSchema(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${PRAEDIXA_BASE_URL}#website`,
    name: PRAEDIXA_BRAND_NAME,
    url: PRAEDIXA_BASE_URL,
    inLanguage: locale,
    publisher: {
      "@type": "Organization",
      "@id": `${PRAEDIXA_BASE_URL}#organization`,
    },
  };
}

function softwareApplicationSchema(locale: Locale, dict: Dictionary) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: PRAEDIXA_BRAND_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: locale,
    url: `${PRAEDIXA_BASE_URL}/${locale}`,
    description: dict.solution.subheading,
    featureList:
      locale === "fr"
        ? [
            "Arbitrages multi-sites entre coût, service et risque",
            "Lecture seule au démarrage sur les outils existants",
            "Décisions documentées avec hypothèses explicites",
            "Preuve ROI relue dans le temps",
            "Premier périmètre sur les arbitrages de couverture et d’allocation",
          ]
        : [
            "Multi-site trade-offs across cost, service, and risk",
            "Read-only start on top of the existing tools",
            "Compared options with explicit assumptions",
            "Historical proof and impact review over time",
            "First focus on the costliest coverage and allocation trade-offs",
          ],
  };
}

function serviceSchema(locale: Locale) {
  const pilotPath = buildContactIntentHref(locale, "deployment");
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: locale === "fr" ? "Déploiement Praedixa" : "Praedixa deployment",
    serviceType:
      locale === "fr"
        ? "Déploiement logiciel pour arbitrages multi-sites"
        : "Software deployment for multi-site trade-offs",
    provider: {
      "@type": "Organization",
      name: PRAEDIXA_BRAND_NAME,
      url: PRAEDIXA_BASE_URL,
    },
    areaServed: {
      "@type": "Country",
      name: "France",
    },
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: `${PRAEDIXA_BASE_URL}${pilotPath}`,
    },
    url: `${PRAEDIXA_BASE_URL}${pilotPath}`,
  };
}

function faqSchema(locale: Locale, dict: Dictionary) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: dict.faq.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function JsonLd({
  locale,
  dict,
  types = ["organization", "website"],
}: JsonLdProps) {
  const schemaBuilders: Record<JsonLdType, () => Record<string, unknown>> = {
    organization: () => organizationSchema(),
    website: () => webSiteSchema(locale),
    softwareApplication: () => softwareApplicationSchema(locale, dict),
    service: () => serviceSchema(locale),
    faq: () => faqSchema(locale, dict),
  };

  const schemas = types.map((type) => schemaBuilders[type]());

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonForScriptTag(schema),
          }}
        />
      ))}
    </>
  );
}
