import { landingFaq } from "../../lib/content/landing-faq";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Praedixa",
  url: "https://www.praedixa.com",
  logo: "https://www.praedixa.com/logo.svg",
  description:
    "Praedixa aide les PME/ETI multi-sites à sécuriser la couverture terrain en anticipant la sous-couverture (capacité vs charge), en chiffrant les options et en proposant un plan d'action.",
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
  sameAs: [],
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Praedixa",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Logiciel B2B de couverture terrain pour PME/ETI multi-sites. Diagnostic en 48h : où serez-vous sous-couverts (capacité vs charge), combien ça coûte, et quoi faire. Sans intégration.",
  featureList: [
    "Prévision de sous-couverture par site et par semaine",
    "Chiffrage du coût des trous de planning (HS, intérim, réallocation)",
    "Plan d'action avec actions prioritaires et hypothèses transparentes",
    "Diagnostic en 48h sans intégration IT",
    "Données agrégées équipe/site (privacy-by-design)",
    "Hébergement France",
  ],
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
    </>
  );
}
