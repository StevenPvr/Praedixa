import { landingFaq } from "../../lib/content/landing-faq";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Praedixa",
  url: "https://www.praedixa.com",
  logo: "https://www.praedixa.com/logo.svg",
  description:
    "Praedixa est une couche d'intelligence de couverture pour entreprises multi-sites : anticipation de la sous-couverture, arbitrage economique chiffre, playbook d'actions et preuve d'impact auditable.",
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
    "Intelligence de couverture operationnelle",
    "Risque de sous-couverture multi-sites",
    "Arbitrage economique operations",
    "Capacite vs charge operations",
    "Preuve economique auditable",
    "Playbook d'actions operationnelles",
    "Pilotage predictif couverture",
    "Early-warning operationnel",
    "Decision tracable audit trail",
    "KPIs economiques couverture",
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
    "Couche d'intelligence de couverture pour entreprises multi-sites. Diagnostic en 48h puis pilotage continu : anticipation de la sous-couverture, arbitrage economique, playbook d'actions, preuve d'impact.",
  featureList: [
    "Diagnostic de sous-couverture en 48h sans integration IT",
    "Prediction du risque de sous-couverture a 3, 7 et 14 jours",
    "Chiffrage du cout de l'inaction vs cout des options",
    "Playbook d'actions : heures sup, interim, reallocation, priorisation",
    "Decision log et preuve economique auditable",
    "Donnees agregees equipe/site (privacy-by-design, RGPD natif)",
    "Hebergement France",
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
  name: "Diagnostic de couverture operationnelle",
  provider: {
    "@type": "Organization",
    name: "Praedixa",
  },
  description:
    "Diagnostic de couverture en 48h pour entreprises multi-sites. Identification des risques de sous-couverture, chiffrage du cout de l'inaction, playbook d'actions avec arbitrage economique.",
  areaServed: {
    "@type": "Country",
    name: "France",
  },
  audience: {
    "@type": "BusinessAudience",
    audienceType:
      "Dir. exploitation, responsable Ops, DAF — logistique, transport, entrepots multi-sites",
  },
  serviceType: "Diagnostic de couverture operationnelle",
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
      text: "Vous nous envoyez vos exports (capacite, charge/volumes et absences).",
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
    "Praedixa — intelligence de couverture operationnelle. Anticipez la sous-couverture multi-sites, chiffrez les options, prouvez le ROI. Diagnostic en 48h.",
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
