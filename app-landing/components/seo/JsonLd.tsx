import {
  PRAEDIXA_BASE_URL,
  PRAEDIXA_BRAND_NAME,
  PRAEDIXA_LOGO_URL,
  PRAEDIXA_LINKEDIN_URL,
} from "../../lib/seo/entity";
import { getLocalizedPath } from "../../lib/i18n/config";
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
    name: PRAEDIXA_BRAND_NAME,
    url: PRAEDIXA_BASE_URL,
    inLanguage: locale,
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
            "Anticipation des risques business",
            "Lecture seule sur les outils existants",
            "Effectifs, demande, stocks, approvisionnements, retention",
            "Premiere action validee par les equipes",
            "Impact relu site par site",
          ]
        : [
            "Business-risk anticipation",
            "Read-only on top of the existing stack",
            "Staffing, demand, inventory, supply, retention",
            "First action validated by the teams",
            "Impact reviewed site by site",
          ],
  };
}

function serviceSchema(locale: Locale) {
  const pilotPath = getLocalizedPath(locale, "deployment");
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name:
      locale === "fr"
        ? "Déploiement Praedixa — 3 mois"
        : "Praedixa pilot — 3 months",
    serviceType:
      locale === "fr"
        ? "Pilotage multi-sites des risques business"
        : "Multi-site business-risk decision pilot",
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
