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

function copy(locale: Locale, fr: string, en: string): string {
  return locale === "fr" ? fr : en;
}

export function getNavGroups(locale: Locale): NavGroup[] {
  return [
    {
      key: "product",
      label: copy(locale, "Produit", "Product"),
      menu: {
        kicker: copy(locale, "Boucle fermée", "Closed loop"),
        title: copy(locale, "Méthode Praedixa", "Praedixa method"),
        description: copy(
          locale,
          "Prévision J+3/J+7/J+14, arbitrage coût/service/risque, action assistée et preuve mensuelle.",
          "J+3/J+7/J+14 forecast, cost/service/risk arbitration, assisted action and monthly proof.",
        ),
        ctaLabel: copy(locale, "Voir le produit", "View product"),
        ctaHref: getLocalizedPath(locale, "productMethod"),
        panelWidth: "md",
      },
      items: [
        {
          label: copy(locale, "Produit & méthode", "Product and method"),
          href: getLocalizedPath(locale, "productMethod"),
          description: copy(
            locale,
            "Positionnement et garde-fous de la boucle fermée.",
            "Positioning and guardrails of the closed loop.",
          ),
          primary: true,
        },
        {
          label: copy(locale, "Comment ça marche", "How it works"),
          href: getLocalizedPath(locale, "howItWorksPage"),
          description: copy(
            locale,
            "Les 4 étapes: prévoir, décider, déclencher, prouver.",
            "The 4 steps: forecast, decide, trigger, prove.",
          ),
        },
        {
          label: copy(locale, "Decision Log & preuve ROI", "Decision Log and ROI proof"),
          href: getLocalizedPath(locale, "decisionLogProof"),
          description: copy(
            locale,
            "Baseline / recommandé / réel + hypothèses.",
            "Baseline / recommended / actual + assumptions.",
          ),
        },
        {
          label: copy(locale, "Intégration & données", "Integration and data"),
          href: getLocalizedPath(locale, "integrationData"),
          description: copy(
            locale,
            "Lecture seule, agrégé, RBAC, chiffrement.",
            "Read-only, aggregated, RBAC, encryption.",
          ),
        },
      ],
    },
    {
      key: "solutions",
      label: copy(locale, "Solutions", "Solutions"),
      menu: {
        kicker: copy(locale, "ICP", "ICP"),
        title: copy(locale, "Praedixa par contexte", "Praedixa by context"),
        description: copy(
          locale,
          "Chaque page détaille les situations traitées, les KPI suivis, les décisions couvertes et les données nécessaires.",
          "Each page details covered situations, tracked KPIs, covered decisions, and required data.",
        ),
        ctaLabel: copy(locale, "Voir les solutions", "Browse solutions"),
        ctaHref: getLocalizedPath(locale, "icpAutomotive"),
        columns: 2,
        panelWidth: "lg",
      },
      items: [
        {
          label: copy(locale, "Praedixa pour l'automobile", "Praedixa for automotive"),
          href: getLocalizedPath(locale, "icpAutomotive"),
          description: copy(
            locale,
            "Ateliers, pièces détachées et allocation de compétences rares.",
            "Workshops, spare parts, and rare skills allocation.",
          ),
          primary: true,
        },
        {
          label: copy(locale, "Praedixa pour la logistique", "Praedixa for logistics"),
          href: getLocalizedPath(locale, "bofuLogistics"),
          description: copy(
            locale,
            "Sous/sur-effectif, cut-off, charge inbound/outbound.",
            "Under/overstaffing, cut-off windows, inbound/outbound workload.",
          ),
        },
        {
          label: copy(locale, "Praedixa pour le retail", "Praedixa for retail"),
          href: getLocalizedPath(locale, "bofuRetail"),
          description: copy(
            locale,
            "Demande magasin, couverture équipes et signal stock.",
            "Store demand, team coverage, and stock pressure signal.",
          ),
        },
        {
          label: copy(
            locale,
            "Praedixa pour les réseaux multi-franchisés",
            "Praedixa for multi-franchise networks",
          ),
          href: getLocalizedPath(locale, "bofuQsr"),
          description: copy(
            locale,
            "Pilotage standardisé site par site, sans changer votre outil planning.",
            "Site-by-site standardized steering without replacing planning tools.",
          ),
        },
        {
          label: copy(locale, "Praedixa pour le transport", "Praedixa for transport"),
          href: getLocalizedPath(locale, "bofuTransport"),
          description: copy(
            locale,
            "Tournées, hubs, aléas trafic et promesse horaire.",
            "Routes, hubs, traffic volatility, and on-time promise.",
          ),
        },
      ],
    },
    {
      key: "services",
      label: copy(locale, "Service", "Service"),
      menu: {
        kicker: copy(locale, "Déploiement", "Deployment"),
        title: copy(locale, "Service Signature", "Signature service"),
        description: copy(
          locale,
          "Démarrage en lecture seule via exports/API, puis pilote boucle fermée sur 3 mois.",
          "Read-only start via exports/API, then 3-month closed-loop pilot.",
        ),
        ctaLabel: copy(locale, "Voir les services", "View services"),
        ctaHref: getLocalizedPath(locale, "services"),
        panelWidth: "md",
      },
      items: [
        {
          label: copy(locale, "Service Signature", "Signature service"),
          href: getLocalizedPath(locale, "services"),
          description: copy(
            locale,
            "Décisions + Decision Log + preuve mensuelle.",
            "Decisions + Decision Log + monthly proof.",
          ),
          primary: true,
        },
        {
          label: copy(locale, "Protocole pilote (3 mois)", "Pilot protocol (3 months)"),
          href: `/${locale}/pilot-protocol`,
          description: copy(
            locale,
            "Audit M1, jalon preuve S8, consolidation M3.",
            "M1 audit, S8 proof milestone, M3 consolidation.",
          ),
        },
        {
          label: copy(locale, "Candidature pilote", "Pilot application"),
          href: getLocalizedPath(locale, "pilot"),
          description: copy(
            locale,
            "Partager votre contexte multi-sites en quelques minutes.",
            "Share your multi-site context in a few minutes.",
          ),
        },
      ],
    },
    {
      key: "resources",
      label: copy(locale, "Ressources", "Resources"),
      menu: {
        kicker: copy(locale, "Ops & Finance", "Ops & Finance"),
        title: copy(locale, "Ressources audit-ready", "Audit-ready resources"),
        description: copy(
          locale,
          "Guides opérationnels, méthode de preuve ROI et articles sectoriels.",
          "Operational guides, ROI proof method, and industry articles.",
        ),
        ctaLabel: copy(locale, "Accéder aux ressources", "Open resources"),
        ctaHref: getLocalizedPath(locale, "resources"),
        panelWidth: "md",
      },
      items: [
        {
          label: copy(locale, "Ressources", "Resources"),
          href: getLocalizedPath(locale, "resources"),
          description: copy(
            locale,
            "Bibliothèque complète par thème et secteur.",
            "Full library by theme and sector.",
          ),
          primary: true,
        },
        {
          label: "Blog",
          href: getLocalizedPath(locale, "blog"),
          description: copy(
            locale,
            "Analyses, retours terrain et décryptages produit.",
            "Analysis, field insights, and product notes.",
          ),
        },
        {
          label: copy(locale, "Capacité et sous-couverture", "Capacity and coverage gaps"),
          href: getLocalizedPath(locale, "pillarCapacity"),
          description: copy(
            locale,
            "Cadre de mesure des risques de sous/sur-effectif.",
            "Framework to measure under/overstaffing risk.",
          ),
        },
        {
          label: copy(locale, "Logistique et capacité", "Logistics capacity planning"),
          href: getLocalizedPath(locale, "pillarLogistics"),
          description: copy(
            locale,
            "Méthodes pour anticiper charge et goulots d'étranglement.",
            "Methods to anticipate workload and bottlenecks.",
          ),
        },
        {
          label: copy(locale, "Absentéisme et sous-effectif", "Absenteeism and under-staffing"),
          href: getLocalizedPath(locale, "pillarAbsence"),
          description: copy(
            locale,
            "Leviers décisionnels face aux absences non planifiées.",
            "Decision levers for unplanned absenteeism.",
          ),
        },
      ],
    },
    {
      key: "company",
      label: copy(locale, "Entreprise", "Company"),
      menu: {
        kicker: copy(locale, "Confiance", "Trust"),
        title: copy(locale, "Cadre entreprise", "Company framework"),
        description: copy(
          locale,
          "Informations institutionnelles, sécurité et cadre légal.",
          "Company information, security posture, and legal framework.",
        ),
        ctaLabel: copy(locale, "Contacter Praedixa", "Contact Praedixa"),
        ctaHref: getLocalizedPath(locale, "contact"),
        panelWidth: "md",
      },
      items: [
        {
          label: copy(locale, "À propos", "About"),
          href: getLocalizedPath(locale, "about"),
          description: copy(
            locale,
            "Mission, positionnement et principes d'exécution.",
            "Mission, positioning, and execution principles.",
          ),
        },
        {
          label: copy(locale, "Sécurité", "Security"),
          href: getLocalizedPath(locale, "security"),
          description: copy(
            locale,
            "Hébergement France, chiffrement, RBAC et garde-fous.",
            "France hosting, encryption, RBAC, and guardrails.",
          ),
          primary: true,
        },
        {
          label: copy(locale, "Mentions légales", "Legal notice"),
          href: getLocalizedPath(locale, "legal"),
          description: copy(locale, "Informations éditeur et publication.", "Publisher information."),
        },
        {
          label: copy(locale, "Confidentialité", "Privacy policy"),
          href: getLocalizedPath(locale, "privacy"),
          description: copy(
            locale,
            "Traitement des données et droits des personnes.",
            "Data processing and privacy rights.",
          ),
        },
        {
          label: copy(locale, "CGU", "Terms"),
          href: getLocalizedPath(locale, "terms"),
          description: copy(locale, "Conditions générales d'utilisation.", "Terms of use."),
        },
      ],
    },
    {
      key: "contact",
      label: copy(locale, "Contact", "Contact"),
      href: getLocalizedPath(locale, "contact"),
    },
  ];
}
