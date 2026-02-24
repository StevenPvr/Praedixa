import {
  PRAEDIXA_BASE_URL,
  PRAEDIXA_BRAND_NAME,
  PRAEDIXA_LOGO_URL,
  PRAEDIXA_LINKEDIN_URL,
} from "../../lib/seo/entity";

interface JsonLdProps {
  locale?: string;
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

function webSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: PRAEDIXA_BRAND_NAME,
    url: PRAEDIXA_BASE_URL,
  };
}

function softwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: PRAEDIXA_BRAND_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      description: "Pilot program",
    },
  };
}

export function JsonLd({ locale }: JsonLdProps) {
  void locale;
  const schemas = [
    organizationSchema(),
    webSiteSchema(),
    softwareApplicationSchema(),
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
