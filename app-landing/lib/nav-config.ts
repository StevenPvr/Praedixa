import type { Locale } from "./i18n/config";
import { getLocalizedPath } from "./i18n/config";
import { getSectorPageHref } from "./content/sector-pages";

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
      kicker: ["Décision", "Decision"],
      title: ["Méthode Praedixa", "Praedixa method"],
      description: [
        "Voir plus tôt les arbitrages, comparer les options et relire l’impact.",
        "See trade-offs earlier, compare options, and review impact over time.",
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
        "Voir, comparer, décider, relire l’impact.",
        "See, compare, decide, and review impact.",
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
        "Proof example",
        getLocalizedPath(locale, "decisionLogProof"),
        "Un exemple concret d’arbitrage, de décision et d’impact relu.",
        "A concrete example of a trade-off, a decision, and its impact review.",
      ),
      createNavItem(
        locale,
        "Intégration & données",
        "Integration and data",
        getLocalizedPath(locale, "integrationData"),
        "Lecture seule, sécurité, données agrégées, sans remplacement.",
        "Read-only, secure, aggregated data, no replacement project.",
      ),
    ],
  };
}

function buildServicesNavGroup(locale: Locale): NavGroup {
  return {
    key: "services",
    label: copy(locale, "Offre", "Offer"),
    menu: createMenu(locale, {
      kicker: ["Déploiement", "Deployment"],
      title: ["Déploiement Praedixa", "Praedixa deployment"],
      description: [
        "Ce que vous achetez, ce qui est inclus, et comment la preuve sur historique sert de point d’entrée.",
        "What you buy, what is included, and how historical proof works as the entry point.",
      ],
      ctaLabel: ["Voir l’offre", "View offer"],
      ctaHref: getLocalizedPath(locale, "services"),
      panelWidth: "md",
    }),
    items: [
      createNavItem(
        locale,
        "Déploiement Praedixa",
        "Praedixa deployment",
        getLocalizedPath(locale, "services"),
        "Déploiement logiciel + mise en place cadrée sur vos données existantes.",
        "Software deployment + structured setup on top of your existing data.",
        true,
      ),
      createNavItem(
        locale,
        "Demande de déploiement",
        "Deployment request",
        getLocalizedPath(locale, "deployment"),
        "Partager votre contexte pour cadrer le déploiement et le périmètre de départ.",
        "Share your context to frame deployment and the starting scope.",
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
      title: ["Ressources et verticales", "Resources and industry pages"],
      description: [
        "Guides business, pages sectorielles, méthode ROI et retours terrain.",
        "Operational guides, industry pages, ROI proof method, and field articles.",
      ],
      ctaLabel: ["Accéder aux ressources", "Open resources"],
      ctaHref: getLocalizedPath(locale, "resources"),
      columns: 2,
      panelWidth: "lg",
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
        "HCR",
        "Hospitality / Food service",
        getSectorPageHref(locale, "hcr"),
        "Staffing, couverture, extras, qualité de service et marge.",
        "Coverage, staffing, extras, service quality, and margin.",
      ),
      createNavItem(
        locale,
        "Enseignement supérieur",
        "Higher education",
        getSectorPageHref(locale, "higher-education"),
        "Admissions, examens, vacations, continuité de service campus.",
        "Admissions, exams, adjunct coverage, and campus continuity.",
      ),
      createNavItem(
        locale,
        "Logistique / Transport / Retail",
        "Logistics / Transport / Retail",
        getSectorPageHref(locale, "logistics-transport-retail"),
        "Volumes, OTIF, intérim, réallocation inter-sites et SLA.",
        "Demand, OTIF, temp labor, inter-site reallocation, and SLA.",
      ),
      createNavItem(
        locale,
        "Automobile / concessions / ateliers",
        "Automotive / dealerships / workshops",
        getSectorPageHref(locale, "automotive"),
        "Backlog atelier, compétences rares, pièces et délai client.",
        "Workshop backlog, scarce skills, parts, and customer delay.",
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
        "Proof example",
        getLocalizedPath(locale, "decisionLogProof"),
        "Un exemple concret d’arbitrage, de décision et d’impact relu.",
        "A concrete example of a trade-off, a decision, and its impact review.",
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
