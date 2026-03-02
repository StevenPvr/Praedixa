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
            "Risque sous/sur-effectif à J+3/J+7/J+14",
            "Arbitrages chiffrés : OT / intérim / réaffectation / ajustement service",
            "1re action assistée (OT ou intérim), manager valide",
            "Overlay en lecture seule (exports/API)",
          ]
        : [
            "Decision Log + monthly ROI proof",
            "Under/over-staffing risk at D+3/D+7/D+14",
            "Quantified trade-offs: overtime / interim / reassignment / service adjustment",
            "Assisted first action (overtime or interim), manager validates",
            "Read-only overlay (exports/APIs)",
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
        ? "Pilote Praedixa (boucle fermée) — 3 mois"
        : "Praedixa pilot (closed loop) — 3 months",
    serviceType:
      locale === "fr"
        ? "Pilote de boucle fermée de la couverture"
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
          dangerouslySetInnerHTML={{
            __html: serializeJsonForScriptTag(schema),
          }}
        />
      ))}
    </>
  );
}
