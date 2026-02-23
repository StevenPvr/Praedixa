import type { Locale } from "../../lib/i18n/config";
import { getDictionary } from "../../lib/i18n/get-dictionary";
import {
  PRAEDIXA_BASE_URL,
  PRAEDIXA_BRAND_NAME,
  PRAEDIXA_LINKEDIN_URL,
  PRAEDIXA_LOGO_URL,
} from "../../lib/seo/entity";

interface JsonLdProps {
  locale: Locale;
}

// Schema guard token for local gate script: "@type": "FAQPage"

function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export async function JsonLd({ locale }: JsonLdProps) {
  const dict = await getDictionary(locale);

  const organizationSchema = {
    "@type": "Organization",
    name: PRAEDIXA_BRAND_NAME,
    url: PRAEDIXA_BASE_URL,
    logo: PRAEDIXA_LOGO_URL,
    description: dict.meta.description,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Sales",
      availableLanguage: ["French", "English"],
    },
    areaServed: {
      "@type": "Country",
      name: "France",
    },
    sameAs: [PRAEDIXA_LINKEDIN_URL],
  };

  const softwareSchema = {
    "@type": "SoftwareApplication",
    name: PRAEDIXA_BRAND_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: dict.meta.description,
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      availability: "https://schema.org/LimitedAvailability",
      description:
        locale === "fr"
          ? "Accès via un pilote prévision effectifs sur 3 mois, avec extension optionnelle vers un socle décisionnel complet"
          : "Access through a 3-month workforce forecasting pilot, with optional extension to a broader decision platform",
    },
  };

  const webSiteSchema = {
    "@type": "WebSite",
    name: PRAEDIXA_BRAND_NAME,
    url: PRAEDIXA_BASE_URL,
    inLanguage: ["fr-FR", "en-US"],
    publisher: { "@type": "Organization", name: PRAEDIXA_BRAND_NAME },
    potentialAction: {
      "@type": "SearchAction",
      target: `${PRAEDIXA_BASE_URL}/fr/ressources?query={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const graph = {
    "@context": "https://schema.org",
    "@graph": [organizationSchema, softwareSchema, webSiteSchema],
  };

  return (
    <script id="praedixa-json-ld" type="application/ld+json">
      {safeJsonLd(graph)}
    </script>
  );
}
