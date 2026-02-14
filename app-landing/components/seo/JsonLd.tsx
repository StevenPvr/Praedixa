"use client";

import { useEffect } from "react";
import { siteConfig } from "../../lib/config/site";
import { fr as frDict } from "../../lib/i18n/dictionaries/fr";

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
    email: siteConfig.contact.email,
    availableLanguage: ["French", "English"],
  },
  foundingDate: "2025",
  knowsAbout: [
    "Intelligence de couverture operationnelle",
    "Risque de sous-couverture multi-sites",
    "Arbitrage economique operations",
    "Capacite vs charge operations",
    "Preuve economique auditable",
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
    "Couche d'intelligence de couverture pour entreprises multi-sites. Prevision + interpretabilite + arbitrage economique.",
  featureList: [
    "Interpretabilite native : facteurs explicatifs de chaque prevision",
    "Prediction du risque de sous-couverture a 3, 7 et 14 jours",
    "Chiffrage du cout de l'inaction vs cout des options",
    "Playbook d'actions : heures sup, interim, reallocation, priorisation",
    "Decision log et preuve economique auditable",
    "Donnees agregees equipe/site (privacy-by-design, RGPD natif)",
    "Hebergement France",
  ],
  offers: {
    "@type": "Offer",
    priceCurrency: "EUR",
    availability: "https://schema.org/LimitedAvailability",
    description: "Acces via cohorte pilote fondatrice (places limitees)",
  },
};

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Intelligence de couverture operationnelle",
  provider: { "@type": "Organization", name: "Praedixa" },
  description:
    "Solution de couverture predictive pour entreprises multi-sites.",
  areaServed: { "@type": "Country", name: "France" },
  audience: {
    "@type": "BusinessAudience",
    audienceType:
      "Dir. exploitation, responsable Ops, DAF — logistique, transport, entrepots multi-sites",
  },
  serviceType: "Intelligence de couverture operationnelle",
  termsOfService: "https://www.praedixa.com/cgu",
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Comment anticiper la sous-couverture de vos equipes",
  description:
    "Decouvrez comment Praedixa identifie vos risques de couverture a partir d'exports simples.",
  totalTime: "P7D",
  step: frDict.howItWorks.steps.map(
    (
      s: {
        number: string;
        title: string;
        subtitle: string;
        description: string;
      },
      i: number,
    ) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      text: s.description,
    }),
  ),
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: frDict.faq.items.map(
    (item: { question: string; answer: string; category: string }) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    }),
  ),
};

const webSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Praedixa",
  url: "https://www.praedixa.com",
  description: frDict.meta.description,
  publisher: { "@type": "Organization", name: "Praedixa" },
  inLanguage: ["fr-FR", "en-US"],
};

/** Escapes for JSON-LD in script: prevent </script> breaking out of tag. */
function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** Single @graph wrapper — one script, one valid JSON value (avoids RSC parse issues). */
const GRAPH_SCHEMAS = [
  organizationSchema,
  softwareSchema,
  howToSchema,
  faqSchema,
  serviceSchema,
  webSiteSchema,
];

const jsonLdGraph = {
  "@context": "https://schema.org",
  "@graph": GRAPH_SCHEMAS,
};

const JSON_LD_SCRIPT_ID = "praedixa-json-ld";

export function JsonLd() {
  useEffect(() => {
    const existing = document.getElementById(JSON_LD_SCRIPT_ID);
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = safeJsonLd(jsonLdGraph);
    script.id = JSON_LD_SCRIPT_ID;
    document.head.appendChild(script);
    return () => document.getElementById(JSON_LD_SCRIPT_ID)?.remove();
  }, []);
  return null;
}
