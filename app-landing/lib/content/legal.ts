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
          "Site public Praedixa, formulaires publics et diffusion applicative : Scaleway, infrastructure localisée à Paris (France).",
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
          "Les données transmises via les formulaires servent à qualifier une demande de contact, une demande de preuve sur historique ou une demande de déploiement Praedixa.",
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
          "Le site public et les formulaires associés sont hébergés sur une infrastructure localisée à Paris (France) via Scaleway.",
          "Les données client opérationnelles liées au service sont hébergées sur une infrastructure localisée à Paris (France) via Scaleway.",
        ],
      },
      {
        title: "Conservation",
        paragraphs: [
          "Les données de qualification et de suivi commercial sont conservées pendant la durée nécessaire au traitement de la demande, au suivi de la relation et au respect des obligations légales applicables.",
          "Une suppression peut être demandée via hello@praedixa.com, sous réserve des obligations légales applicables.",
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
          "Ces conditions définissent l'accès et l'utilisation du site Praedixa ainsi que les échanges liés à la preuve sur historique, au déploiement Praedixa et aux demandes de contact associées.",
        ],
      },
      {
        title: "Usage",
        paragraphs: [
          "Le service est destiné à un usage professionnel. L'utilisateur s'engage à un usage conforme aux lois applicables.",
        ],
      },
      {
        title: "Offres publiques",
        paragraphs: [
          "Les contenus publics décrivent les modalités générales de la preuve sur historique et du déploiement Praedixa. Ils ne constituent pas une promesse publique de résultat chiffré prédéfini.",
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
          "Public website, public forms, and application delivery: Scaleway infrastructure located in Paris (France).",
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
          "Data shared through forms is used to qualify contact requests, historical proof requests, and Praedixa deployment requests.",
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
          "The public website and associated forms are hosted on infrastructure located in Paris (France) via Scaleway.",
          "Operational client data tied to the service is hosted on infrastructure located in Paris (France) via Scaleway.",
        ],
      },
      {
        title: "Retention",
        paragraphs: [
          "Qualification and commercial follow-up data is retained for the time needed to process the request, manage the relationship, and comply with applicable legal obligations.",
          "Deletion can be requested via hello@praedixa.com, subject to applicable legal obligations.",
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
          "These terms define access and usage conditions for the Praedixa website and the exchanges related to historical proof, Praedixa deployment, and associated contact requests.",
        ],
      },
      {
        title: "Usage",
        paragraphs: [
          "The service is intended for professional use. Users must comply with applicable laws.",
        ],
      },
      {
        title: "Public offers",
        paragraphs: [
          "Public content describes the general terms of historical proof and Praedixa deployment. It is not a public commitment to predefined quantified outcomes.",
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
