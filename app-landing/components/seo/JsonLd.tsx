import {
  PRAEDIXA_BASE_URL,
  PRAEDIXA_BRAND_NAME,
  PRAEDIXA_LOGO_URL,
  PRAEDIXA_LINKEDIN_URL,
} from "../../lib/seo/entity";
import { getLocalizedPath } from "../../lib/i18n/config";
import type { Locale } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";

interface JsonLdProps {
  locale: Locale;
  dict: Dictionary;
}

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
    name: `${PRAEDIXA_BRAND_NAME} Workforce & ProofOps`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: locale,
    url: `${PRAEDIXA_BASE_URL}/${locale}`,
    description: dict.solution.subheading,
    featureList: [
      "Decision Ledger",
      "Coverage risk anticipation",
      "Ops/finance decision governance",
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
        ? "Pilote Praedixa Workforce & ProofOps (3 mois)"
        : "Praedixa Workforce & ProofOps pilot (3 months)",
    serviceType:
      locale === "fr"
        ? "Pilote de gouvernance des decisions de couverture"
        : "Coverage decision governance pilot",
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

export function JsonLd({ locale, dict }: JsonLdProps) {
  const schemas = [
    organizationSchema(),
    webSiteSchema(locale),
    softwareApplicationSchema(locale, dict),
    serviceSchema(locale),
    faqSchema(locale, dict),
  ];

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
