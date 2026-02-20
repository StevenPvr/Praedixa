import type { Locale } from "../i18n/config";

export type LegalPageKey = "legal" | "privacy" | "terms";

interface LegalSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LegalContent {
  title: string;
  description: string;
  backLabel: string;
  sections: LegalSection[];
}

const fr: Record<LegalPageKey, LegalContent> = {
  legal: {
    title: "Mentions légales",
    description: "Mentions légales de Praedixa.",
    backLabel: "Retour à l'accueil",
    sections: [
      {
        title: "Éditeur",
        paragraphs: [
          "Praedixa — entreprise en cours d'immatriculation en France.",
          "Contact : hello@praedixa.com",
        ],
      },
      {
        title: "Hébergement",
        paragraphs: [
          "Site vitrine et diffusion statique : Cloudflare, Inc. — 101 Townsend St, San Francisco, CA 94107, USA (https://www.cloudflare.com).",
          "Données client opérationnelles liées au service : Scaleway, infrastructure localisée à Paris (France). Détails contractuels communiqués en phase de qualification.",
        ],
      },
      {
        title: "Propriété intellectuelle",
        paragraphs: [
          "Le contenu du site Praedixa est protégé par le droit applicable. Toute reproduction non autorisée est interdite.",
        ],
      },
    ],
  },
  privacy: {
    title: "Politique de confidentialité",
    description: "Politique de confidentialité de Praedixa.",
    backLabel: "Retour à l'accueil",
    sections: [
      {
        title: "Responsable du traitement",
        paragraphs: [
          "Praedixa agit en qualité de responsable du traitement pour les données collectées via ses formulaires publics.",
          "Contact : hello@praedixa.com",
        ],
      },
      {
        title: "Données collectées",
        paragraphs: [
          "Les données transmises via les formulaires servent à qualifier une demande de contact ou une candidature au Pilote fondateur.",
        ],
        bullets: [
          "Entreprise",
          "Coordonnées professionnelles",
          "Contexte opérationnel partagé volontairement",
        ],
      },
      {
        title: "Hébergement et sous-traitants",
        paragraphs: [
          "Le site vitrine est opéré via Cloudflare.",
          "Les données client opérationnelles liées au service sont hébergées sur une infrastructure localisée à Paris (France) via Scaleway.",
        ],
      },
      {
        title: "Conservation",
        paragraphs: [
          "La politique détaillée de rétention est en cours de formalisation. Une suppression peut être demandée via hello@praedixa.com, sous réserve des obligations légales applicables.",
        ],
      },
      {
        title: "Droits",
        paragraphs: [
          "Conformément au RGPD, vous pouvez demander l'accès, la rectification ou la suppression de vos données.",
          "Pour toute demande : hello@praedixa.com",
        ],
      },
    ],
  },
  terms: {
    title: "Conditions générales d'utilisation",
    description: "Conditions générales d'utilisation du site Praedixa.",
    backLabel: "Retour à l'accueil",
    sections: [
      {
        title: "Objet",
        paragraphs: [
          "Ces conditions définissent l'accès et l'utilisation du site Praedixa et les échanges liés au Pilote fondateur.",
        ],
      },
      {
        title: "Usage",
        paragraphs: [
          "Le service est destiné à un usage professionnel. L'utilisateur s'engage à un usage conforme aux lois applicables.",
        ],
      },
      {
        title: "Pilote fondateur",
        paragraphs: [
          "Le Pilote fondateur est une phase de co-construction encadrée. Il ne constitue pas une promesse publique de résultat chiffré prédéfini.",
        ],
      },
      {
        title: "Contact",
        paragraphs: ["Pour toute question juridique : hello@praedixa.com"],
      },
    ],
  },
};

const en: Record<LegalPageKey, LegalContent> = {
  legal: {
    title: "Legal notice",
    description: "Legal notice for Praedixa.",
    backLabel: "Back to homepage",
    sections: [
      {
        title: "Publisher",
        paragraphs: [
          "Praedixa — company in registration process in France.",
          "Contact: hello@praedixa.com",
        ],
      },
      {
        title: "Hosting",
        paragraphs: [
          "Marketing site and static delivery: Cloudflare, Inc. — 101 Townsend St, San Francisco, CA 94107, USA (https://www.cloudflare.com).",
          "Operational client data tied to the service: Scaleway infrastructure located in Paris (France). Contractual details are shared during qualification.",
        ],
      },
      {
        title: "Intellectual property",
        paragraphs: [
          "Content published on the Praedixa website is protected by applicable law. Unauthorized reuse is prohibited.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy policy",
    description: "Privacy policy for Praedixa.",
    backLabel: "Back to homepage",
    sections: [
      {
        title: "Data controller",
        paragraphs: [
          "Praedixa acts as data controller for data collected through public forms.",
          "Contact: hello@praedixa.com",
        ],
      },
      {
        title: "Collected data",
        paragraphs: [
          "Data shared through forms is used to qualify contact requests and Founding Pilot applications.",
        ],
        bullets: [
          "Company name",
          "Professional contact details",
          "Operational context shared voluntarily",
        ],
      },
      {
        title: "Hosting and subprocessors",
        paragraphs: [
          "The marketing site is operated through Cloudflare.",
          "Operational client data tied to the service is hosted on infrastructure located in Paris (France) via Scaleway.",
        ],
      },
      {
        title: "Retention",
        paragraphs: [
          "The detailed retention policy is currently being formalized. Deletion can be requested via hello@praedixa.com, subject to applicable legal obligations.",
        ],
      },
      {
        title: "Rights",
        paragraphs: [
          "Under GDPR, you can request access, correction, or deletion of your data.",
          "Requests: hello@praedixa.com",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of use",
    description: "Terms of use for the Praedixa website.",
    backLabel: "Back to homepage",
    sections: [
      {
        title: "Purpose",
        paragraphs: [
          "These terms define access and usage conditions for the Praedixa website and exchanges related to the Founding Pilot.",
        ],
      },
      {
        title: "Usage",
        paragraphs: [
          "The service is intended for professional use. Users must comply with applicable laws.",
        ],
      },
      {
        title: "Founding Pilot",
        paragraphs: [
          "The Founding Pilot is a structured co-build phase. It is not a public commitment to predefined quantified outcomes.",
        ],
      },
      {
        title: "Contact",
        paragraphs: ["For legal questions: hello@praedixa.com"],
      },
    ],
  },
};

export function getLegalContent(
  locale: Locale,
  key: LegalPageKey,
): LegalContent {
  return locale === "fr" ? fr[key] : en[key];
}
