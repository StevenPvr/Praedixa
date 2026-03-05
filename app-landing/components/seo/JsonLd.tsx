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
    name: PRAEDIXA_BRAND_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: locale,
    url: `${PRAEDIXA_BASE_URL}/${locale}`,
    description: dict.solution.subheading,
    featureList:
      locale === "fr"
        ? [
            "Decision Log + preuve ROI mensuelle",
            "Dérives KPI à court horizon",
            "Arbitrages chiffrés : renfort / réaffectation / ajustement service",
            "1re étape assistée, validation manager",
            "Lecture seule sur l’existant (exports)",
          ]
        : [
            "Decision Log + monthly ROI proof",
            "Short-horizon KPI drift signals",
            "Quantified trade-offs: reinforcement / reassignment / service adjustment",
            "Assisted first step, manager approval",
            "Read-only start on existing exports",
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
        ? "Pilote Praedixa (copilote IA) — 3 mois"
        : "Praedixa pilot (AI decision copilot) — 3 months",
    serviceType:
      locale === "fr"
        ? "Pilote de décision opérationnelle multi-sites"
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
          dangerouslySetInnerHTML={{
            __html: serializeJsonForScriptTag(schema),
          }}
        />
      ))}
    </>
  );
}
