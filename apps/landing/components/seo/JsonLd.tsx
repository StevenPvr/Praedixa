import { landingFaq } from "../../lib/content/landing-faq";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Praedixa",
  url: "https://www.praedixa.com",
  logo: "https://www.praedixa.com/logo.svg",
  description:
    "Praedixa aide les PME/ETI multi-sites à piloter la couverture terrain : standardisation des données, prédictions par machine learning, notifications informatives avec options chiffrées, et suivi des KPIs économiques.",
  areaServed: {
    "@type": "Country",
    name: "France",
  },
  address: {
    "@type": "PostalAddress",
    addressCountry: "FR",
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "Sales",
    email: "steven.poivre@outlook.com",
    availableLanguage: "French",
  },
  foundingDate: "2025",
  knowsAbout: [
    "Gestion planning équipes terrain",
    "Workforce management PME ETI",
    "Prévision absentéisme",
    "Optimisation couverture terrain multi-sites",
    "Diagnostic opérationnel RH",
    "Pilotage capacité vs charge",
    "Pilotage prédictif continu",
    "Machine learning prédiction absences",
    "Optimisation sous contraintes",
    "KPIs économiques opérations",
  ],
  sameAs: [],
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Praedixa",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Logiciel B2B de pilotage prédictif pour PME/ETI multi-sites. Diagnostic en 48h puis pilotage continu : prédictions, notifications informatives avec options chiffrées, suivi des KPIs économiques.",
  featureList: [
    "Diagnostic de sous-couverture en 48h sans intégration IT",
    "Standardisation et affinage continu des données terrain",
    "Prédictions par machine learning et économétrie (J+7, J+14, J+30+)",
    "Notifications informatives avec options chiffrées",
    "Suivi des gains réalisés et KPIs économiques",
    "Données agrégées équipe/site (privacy-by-design, RGPD natif)",
    "Hébergement France",
  ],
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
    description: "Premier diagnostic gratuit pour les entreprises pilotes",
  },
};

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Diagnostic Planning Terrain",
  provider: {
    "@type": "Organization",
    name: "Praedixa",
  },
  description:
    "Diagnostic de planning en 48h pour équipes terrain multi-sites. Identification des trous de planning, chiffrage du coût évitable, plan d'action avec ROI.",
  areaServed: {
    "@type": "Country",
    name: "France",
  },
  audience: {
    "@type": "BusinessAudience",
    audienceType: "PME et ETI multi-sites avec 100+ salariés terrain",
  },
  serviceType: "Diagnostic opérationnel",
  termsOfService: "https://www.praedixa.com/cgu",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
    description: "Premier diagnostic gratuit",
  },
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Comment obtenir un plan de couverture en 48h (sans intégration)",
  description:
    "Découvrez comment Praedixa vous livre un plan de couverture en 48h, à partir d'exports simples.",
  totalTime: "P2D",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Envoyez vos exports",
      text: "Vous nous envoyez vos exports (planning, activité/volumes et absences).",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Calcul et prévision",
      text: "On anticipe la sous-couverture (capacité vs charge) et on chiffre les options.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Réception du plan",
      text: "Vous recevez un plan de couverture actionnable : carte de sous-couverture, coût évitable estimé, options chiffrées et actions prioritaires.",
    },
  ],
};

const webSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Praedixa",
  url: "https://www.praedixa.com",
  description:
    "Praedixa — anticipez les trous de planning de vos équipes terrain multi-sites. Diagnostic en 48h, sans intégration IT.",
  publisher: {
    "@type": "Organization",
    name: "Praedixa",
  },
  inLanguage: "fr-FR",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: landingFaq.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

function toJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function JsonLd() {
  return (
    <>
      <script
        id="praedixa-org-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(organizationSchema),
        }}
      />
      <script
        id="praedixa-software-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(softwareSchema),
        }}
      />
      <script
        id="praedixa-howto-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(howToSchema),
        }}
      />
      <script
        id="praedixa-faq-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(faqSchema),
        }}
      />
      <script
        id="praedixa-service-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(serviceSchema),
        }}
      />
      <script
        id="praedixa-website-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(webSiteSchema),
        }}
      />
    </>
  );
}
