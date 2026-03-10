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
            "DecisionOps sur l'existant pour RH, finance et operations",
            "Systemes critiques federes sans projet lourd",
            "Arbitrages classes par impact business",
            "Premiere action validee dans les outils",
            "Preuve ROI decision par decision",
          ]
        : [
            "DecisionOps layer on top of the existing stack",
            "Read-only federation of critical systems",
            "Quantified cost / service / risk trade-offs",
            "Validated first action triggered in existing tools",
            "Decision-by-decision ROI proof",
          ],
  };
}

function serviceSchema(locale: Locale) {
  const pilotPath = getLocalizedPath(locale, "pilot");
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name:
      locale === "fr"
        ? "Pilote ROI Praedixa — 3 mois"
        : "Praedixa pilot (DecisionOps platform) — 3 months",
    serviceType:
      locale === "fr"
        ? "Pilote de lecture business et ROI multi-sites"
        : "Multi-site operational decision governance pilot",
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
