import type { Locale } from "../../lib/i18n/config";
import { getDictionary } from "../../lib/i18n/get-dictionary";

interface JsonLdProps {
  locale: Locale;
}

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
    name: "Praedixa",
    url: "https://www.praedixa.com",
    logo: "https://www.praedixa.com/logo.svg",
    description: dict.meta.description,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Sales",
      email: "hello@praedixa.com",
      availableLanguage: ["French", "English"],
    },
    areaServed: {
      "@type": "Country",
      name: "France",
    },
    sameAs: ["https://linkedin.com/company/praedixa"],
  };

  const softwareSchema = {
    "@type": "SoftwareApplication",
    name: "Praedixa",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: dict.meta.description,
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      availability: "https://schema.org/LimitedAvailability",
      description:
        locale === "fr"
          ? "Accès via programme pilote encadré"
          : "Access through a structured pilot program",
    },
  };

  const webSiteSchema = {
    "@type": "WebSite",
    name: "Praedixa",
    url: "https://www.praedixa.com",
    inLanguage: ["fr-FR", "en-US"],
    publisher: { "@type": "Organization", name: "Praedixa" },
    potentialAction: {
      "@type": "SearchAction",
      target:
        "https://www.praedixa.com/fr/ressources?query={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  const faqSchema = {
    "@type": "FAQPage",
    mainEntity: dict.faq.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const graph = {
    "@context": "https://schema.org",
    "@graph": [organizationSchema, softwareSchema, webSiteSchema, faqSchema],
  };

  return (
    <script id="praedixa-json-ld" type="application/ld+json">
      {safeJsonLd(graph)}
    </script>
  );
}
