import type { Locale } from "./i18n/config";
import { getLocalizedPath } from "./i18n/config";

export interface NavChildItem {
  label: string;
  href: string;
  description?: string;
  primary?: boolean;
}

export interface NavMenuMeta {
  kicker: string;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  columns?: 1 | 2;
  panelWidth?: "md" | "lg";
}

export interface NavGroup {
  key: string;
  label: string;
  href?: string;
  items?: NavChildItem[];
  menu?: NavMenuMeta;
}

export function getNavGroups(locale: Locale): NavGroup[] {
  return [
    buildProductNavGroup(locale),
    buildServicesNavGroup(locale),
    buildResourcesNavGroup(locale),
    buildCompanyNavGroup(locale),
    buildContactNavGroup(locale),
  ];
}

function buildProductNavGroup(locale: Locale): NavGroup {
  return {
    key: "product",
    label: copy(locale, "Produit", "Product"),
    menu: createMenu(locale, {
      kicker: ["Boucle fermée", "Closed loop"],
      title: ["Méthode Praedixa", "Praedixa method"],
      description: [
        "Réunir les données, prioriser les actions, suivre le ROI.",
        "J+3/J+7/J+14 forecast, cost/service/risk arbitration, assisted action and monthly proof.",
      ],
      ctaLabel: ["Voir le produit", "View product"],
      ctaHref: getLocalizedPath(locale, "productMethod"),
      panelWidth: "md",
    }),
    items: [
      createNavItem(
        locale,
        "Produit & méthode",
        "Product and method",
        getLocalizedPath(locale, "productMethod"),
        "Lecture business commune et garde-fous de déploiement.",
        "Positioning and guardrails of the closed loop.",
        true,
      ),
      createNavItem(
        locale,
        "Comment ça marche",
        "How it works",
        getLocalizedPath(locale, "howItWorksPage"),
        "Réunir, comprendre, agir, mesurer.",
        "The 4 steps: forecast, decide, trigger, prove.",
      ),
      createNavItem(
        locale,
        "Dossier ROI",
        "Decision Log and ROI proof",
        getLocalizedPath(locale, "decisionLogProof"),
        "Situation actuelle, priorités, résultats et gains.",
        "Baseline / recommended / actual + assumptions.",
      ),
      createNavItem(
        locale,
        "Intégration & données",
        "Integration and data",
        getLocalizedPath(locale, "integrationData"),
        "Lecture seule, sécurité, données regroupées, sans remplacement.",
        "Read-only, aggregated, RBAC, encryption.",
      ),
    ],
  };
}

function buildServicesNavGroup(locale: Locale): NavGroup {
  return {
    key: "services",
    label: copy(locale, "Offre", "Service"),
    menu: createMenu(locale, {
      kicker: ["Déploiement", "Deployment"],
      title: ["Offre Praedixa", "Signature service"],
      description: [
        "Démarrage léger via exports/API, puis pilote ROI sur 3 mois.",
        "Read-only start via exports/API, then 3-month closed-loop pilot.",
      ],
      ctaLabel: ["Voir les services", "View services"],
      ctaHref: getLocalizedPath(locale, "services"),
      panelWidth: "md",
    }),
    items: [
      createNavItem(
        locale,
        "Offre Praedixa",
        "Signature service",
        getLocalizedPath(locale, "services"),
        "Diagnostic, priorités business et suivi du ROI.",
        "Decisions + Decision Log + monthly proof.",
        true,
      ),
      createNavItem(
        locale,
        "Protocole pilote (3 mois)",
        "Pilot protocol (3 months)",
        `/${locale}/pilot-protocol`,
        "Audit M1, jalon preuve S8, consolidation M3.",
        "M1 audit, S8 proof milestone, M3 consolidation.",
      ),
      createNavItem(
        locale,
        "Candidature pilote",
        "Pilot application",
        getLocalizedPath(locale, "pilot"),
        "Partager votre contexte multi-sites en quelques minutes.",
        "Share your multi-site context in a few minutes.",
      ),
    ],
  };
}

function buildResourcesNavGroup(locale: Locale): NavGroup {
  return {
    key: "resources",
    label: copy(locale, "Ressources", "Resources"),
    menu: createMenu(locale, {
      kicker: ["Ops & Finance", "Ops & Finance"],
      title: ["Ressources business", "Audit-ready resources"],
      description: [
        "Guides business, méthode ROI et retours terrain.",
        "Operational guides, ROI proof method, and industry articles.",
      ],
      ctaLabel: ["Accéder aux ressources", "Open resources"],
      ctaHref: getLocalizedPath(locale, "resources"),
      panelWidth: "md",
    }),
    items: [
      createNavItem(
        locale,
        "Ressources essentielles",
        "Essential resources",
        getLocalizedPath(locale, "resources"),
        "Une seule page claire pour les contextes couverts et les cas d'usage.",
        "One clear page for covered contexts and business use cases.",
        true,
      ),
      createNavItem(
        locale,
        "Blog",
        "Blog",
        getLocalizedPath(locale, "blog"),
        "Analyses, retours terrain et décryptages produit.",
        "Analysis, field insights, and product notes.",
      ),
      createNavItem(
        locale,
        "Dossier ROI",
        "ROI pack",
        getLocalizedPath(locale, "decisionLogProof"),
        "Le format simple pour expliquer priorités, arbitrages et gains.",
        "The simple format to explain priorities, trade-offs, and gains.",
      ),
    ],
  };
}

function buildCompanyNavGroup(locale: Locale): NavGroup {
  return {
    key: "company",
    label: copy(locale, "Entreprise", "Company"),
    menu: createMenu(locale, {
      kicker: ["Confiance", "Trust"],
      title: ["Cadre entreprise", "Company framework"],
      description: [
        "Informations institutionnelles, sécurité et cadre légal.",
        "Company information, security posture, and legal framework.",
      ],
      ctaLabel: ["Contacter Praedixa", "Contact Praedixa"],
      ctaHref: getLocalizedPath(locale, "contact"),
      panelWidth: "md",
    }),
    items: [
      createNavItem(
        locale,
        "À propos",
        "About",
        getLocalizedPath(locale, "about"),
        "Mission, positionnement et principes d'exécution.",
        "Mission, positioning, and execution principles.",
      ),
      createNavItem(
        locale,
        "Sécurité",
        "Security",
        getLocalizedPath(locale, "security"),
        "Hébergement France, chiffrement, RBAC et garde-fous.",
        "France hosting, encryption, RBAC, and guardrails.",
        true,
      ),
      createNavItem(
        locale,
        "Mentions légales",
        "Legal notice",
        getLocalizedPath(locale, "legal"),
        "Informations éditeur et publication.",
        "Publisher information.",
      ),
      createNavItem(
        locale,
        "Confidentialité",
        "Privacy policy",
        getLocalizedPath(locale, "privacy"),
        "Traitement des données et droits des personnes.",
        "Data processing and privacy rights.",
      ),
      createNavItem(
        locale,
        "CGU",
        "Terms",
        getLocalizedPath(locale, "terms"),
        "Conditions générales d'utilisation.",
        "Terms of use.",
      ),
    ],
  };
}

function buildContactNavGroup(locale: Locale): NavGroup {
  return {
    key: "contact",
    label: copy(locale, "Contact", "Contact"),
    href: getLocalizedPath(locale, "contact"),
  };
}

function createNavItem(
  locale: Locale,
  frLabel: string,
  enLabel: string,
  href: string,
  frDescription: string,
  enDescription: string,
  primary = false,
): NavChildItem {
  return {
    label: copy(locale, frLabel, enLabel),
    href,
    description: copy(locale, frDescription, enDescription),
    primary,
  };
}

function createMenu(
  locale: Locale,
  meta: {
    kicker: [string, string];
    title: [string, string];
    description: [string, string];
    ctaLabel: [string, string];
    ctaHref: string;
    columns?: 1 | 2;
    panelWidth?: "md" | "lg";
  },
): NavMenuMeta {
  return {
    kicker: copy(locale, ...meta.kicker),
    title: copy(locale, ...meta.title),
    description: copy(locale, ...meta.description),
    ctaLabel: copy(locale, ...meta.ctaLabel),
    ctaHref: meta.ctaHref,
    columns: meta.columns,
    panelWidth: meta.panelWidth,
  };
}

function copy(locale: Locale, fr: string, en: string): string {
  return locale === "fr" ? fr : en;
}
