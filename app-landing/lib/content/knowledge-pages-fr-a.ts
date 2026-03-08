import type { KnowledgePageContent, KnowledgePageKey } from "./knowledge-pages-shared";

export const frContentA: Record<
  Extract<
    KnowledgePageKey,
    | "about"
    | "security"
    | "resources"
    | "productMethod"
    | "howItWorksPage"
    | "decisionLogProof"
    | "integrationData"
  >,
  KnowledgePageContent
> = {
  about: {
    key: "about",
    kicker: "Praedixa",
    title: "À propos",
    description:
      "Mission, ancrage et positionnement de Praedixa pour réunir les données utiles et améliorer les décisions multi-sites.",
    lead: "Praedixa réunit les données RH, finance, opérations et supply chain au bon endroit pour aider les entreprises multi-sites à anticiper les besoins, optimiser les décisions et suivre le ROI.",
    sections: [
      {
        title: "Mission",
        paragraphs: [
          "Accompagner la croissance des entreprises en révélant le potentiel de leurs données.",
          "Praedixa aide les équipes à partir d'une base commune plutôt qu'à recoller des chiffres dispersés en réunion.",
        ],
      },
      {
        title: "Positionnement",
        paragraphs: [
          "Praedixa n'est pas un ERP, un outil de planning ou un dashboard de plus.",
          "La plateforme se place entre les données existantes et les décisions business à prendre plus tôt, avec une lecture claire pour les équipes et les comités.",
        ],
      },
      {
        title: "Ancrage",
        paragraphs: [
          "Entreprise française, incubée à EuraTechnologies dans les Hauts-de-France.",
          "Infrastructure et hébergement des données en France, sur Scaleway.",
        ],
      },
    ],
    links: [
      { label: "Produit & méthode", key: "productMethod" },
      { label: "Intégration & données", key: "integrationData" },
      { label: "Ressources essentielles", key: "resources" },
    ],
    ctaLabel: "Demander un pilote ROI",
  },

  security: {
    key: "security",
    kicker: "Sécurité",
    title: "Sécurité de l'espace Praedixa",
    description:
      "Principes de sécurité et de gouvernance pour un usage enterprise, sans complexité inutile.",
    lead: "La sécurité est pensée comme un prérequis simple: accès contrôlés, données agrégées, traçabilité, et démarrage en lecture seule quand c'est pertinent.",
    sections: [
      {
        title: "Principes",
        paragraphs: [
          "Praedixa privilégie la sobriété: données utiles, permissions ciblées et minimum d'exposition.",
          "L'objectif est de rendre la revue IT et sécurité plus simple, pas de l'alourdir.",
        ],
      },
      {
        title: "Contrôles",
        paragraphs: [
          "Chiffrement en transit et au repos, contrôle d'accès par rôle, journalisation des actions sensibles.",
          "Pas de prédiction individuelle: la plateforme travaille au niveau équipe, site ou activité.",
        ],
      },
      {
        title: "Hébergement",
        paragraphs: [
          "Plateforme et données hébergées en France sur Scaleway.",
          "Les équipes savent où vont les données, pourquoi elles sont utilisées et dans quel cadre.",
        ],
      },
    ],
    links: [
      { label: "Intégration & données", key: "integrationData" },
      { label: "À propos de Praedixa", key: "about" },
      { label: "Ressources essentielles", key: "resources" },
    ],
    ctaLabel: "Demander un pilote ROI",
  },

  resources: {
    key: "resources",
    kicker: "Ressources",
    title: "Ressources essentielles",
    description:
      "Le point d'entrée unique pour comprendre les contextes couverts, les sujets business traités et les contenus utiles.",
    lead: "Cette page remplace les micro-pages trop dispersées. Elle rassemble dans un même endroit les contextes couverts, les cas d'usage prioritaires et les contenus utiles pour comprendre Praedixa.",
    sections: [
      {
        title: "À lire en priorité",
        paragraphs: [
          "Commencez par Produit & méthode, Comment ça marche, Intégration & données et Dossier ROI.",
          "Le parcours est volontairement court: moins de pages, plus de clarté.",
        ],
      },
      {
        title: "Contextes couverts",
        paragraphs: [
          "Praedixa s'adresse aux organisations multi-sites qui doivent arbitrer entre RH, finance, opérations et supply chain.",
          "Automobile, concessions et ateliers, logistique, transport, retail et réseaux HCR sont couverts dans une même méthode au lieu d'être dispersés dans des pages séparées.",
        ],
        bullets: [
          "Variations de charge et de staffing",
          "Absentéisme et continuité de service",
          "Comparaison et priorisation multi-sites",
          "Suivi du ROI et arbitrages direction",
        ],
      },
      {
        title: "Quand aller plus loin",
        paragraphs: [
          "Les contenus détaillés vivent désormais dans le blog, les ressources SEO et les échanges commerciaux, pas dans une forêt de pages annexes.",
          "Le site garde seulement les pages qui aident vraiment à comprendre l'offre et à passer à l'action.",
        ],
      },
    ],
    links: [
      { label: "Produit & méthode", key: "productMethod" },
      { label: "Comment ça marche", key: "howItWorksPage" },
      { label: "Dossier ROI", key: "decisionLogProof" },
      { label: "Intégration & données", key: "integrationData" },
    ],
    ctaLabel: "Obtenir le diagnostic ROI gratuit",
  },

  productMethod: {
    key: "productMethod",
    kicker: "Produit",
    title: "Produit & méthode",
    description:
      "Comment Praedixa réunit les données et les transforme en priorités business lisibles.",
    lead: "Praedixa réunit vos données RH, finance, opérations et supply chain dans une même base, sans remplacer vos outils, pour transformer des signaux dispersés en priorités business utiles.",
    sections: [
      {
        title: "Réunir",
        paragraphs: [
          "La plateforme part des outils en place et remet les données utiles dans un même langage.",
          "L'objectif n'est pas d'avoir plus de chiffres, mais une base commune compréhensible par toutes les équipes.",
        ],
      },
      {
        title: "Anticiper",
        paragraphs: [
          "Praedixa fait ressortir les besoins plus tôt pour éviter les arbitrages en retard.",
          "Les écarts deviennent visibles avant qu'ils coûtent cher.",
        ],
      },
      {
        title: "Optimiser",
        paragraphs: [
          "Les décisions sont priorisées selon l'impact business attendu, pas selon le bruit du moment.",
          "Chaque action garde une logique claire pour les équipes et la direction.",
        ],
      },
    ],
    links: [
      { label: "Comment ça marche", key: "howItWorksPage" },
      { label: "Dossier ROI", key: "decisionLogProof" },
      { label: "Intégration & données", key: "integrationData" },
      { label: "Ressources essentielles", key: "resources" },
    ],
    ctaLabel: "Obtenir le diagnostic ROI gratuit",
  },

  howItWorksPage: {
    key: "howItWorksPage",
    kicker: "Méthode",
    title: "Comment ça marche",
    description:
      "Le parcours Praedixa pour réunir les données, rendre les besoins visibles, prioriser les actions et suivre le ROI.",
    lead: "Praedixa commence par réunir les données utiles, puis aide à rendre les besoins visibles plus tôt, à prioriser les actions et à suivre le ROI.",
    sections: [
      {
        title: "1. Réunir les données utiles",
        paragraphs: [
          "Praedixa part des exports, API et outils déjà en place pour constituer une base commune.",
        ],
      },
      {
        title: "2. Faire ressortir les besoins",
        paragraphs: [
          "Les signaux business deviennent lisibles: où ça bloque, où l'argent fuit, où il faut agir.",
        ],
      },
      {
        title: "3. Prioriser les actions",
        paragraphs: [
          "Les équipes voient ce qu'il faut lancer en premier et ce qui peut rapporter le plus.",
        ],
      },
      {
        title: "4. Suivre le ROI",
        paragraphs: [
          "Le résultat est relu dans un dossier ROI simple: situation de départ, priorités, actions et gains observés.",
        ],
      },
    ],
    links: [
      { label: "Produit & méthode", key: "productMethod" },
      { label: "Dossier ROI", key: "decisionLogProof" },
      { label: "Intégration & données", key: "integrationData" },
    ],
    ctaLabel: "Obtenir le diagnostic ROI gratuit",
  },

  decisionLogProof: {
    key: "decisionLogProof",
    kicker: "Preuve",
    title: "Dossier ROI",
    description:
      "Le format simple pour relier priorités, actions et gains observés dans le temps.",
    lead: "Le dossier ROI Praedixa relie chaque arbitrage opérationnel à une lecture simple, structurée et relisible par la direction, la finance et les opérations.",
    sections: [
      {
        title: "Ce qu'il contient",
        paragraphs: [
          "Situation de départ, priorités retenues, actions lancées et résultats observés.",
          "Le but est de prouver ce qui rapporte, pas d'empiler des tableaux.",
        ],
      },
      {
        title: "Ce qu'il change",
        paragraphs: [
          "Les comités ne repartent plus de zéro à chaque réunion.",
          "Les décisions deviennent plus faciles à défendre, à relire et à corriger.",
        ],
      },
      {
        title: "Pourquoi nous le gardons",
        paragraphs: [
          "C'est une des rares pages annexes qui apporte encore une vraie valeur commerciale.",
          "Elle montre comment Praedixa transforme la donnée en preuve business.",
        ],
      },
    ],
    links: [
      { label: "Produit & méthode", key: "productMethod" },
      { label: "Comment ça marche", key: "howItWorksPage" },
      { label: "Ressources essentielles", key: "resources" },
    ],
    ctaLabel: "Obtenir le diagnostic ROI gratuit",
  },

  integrationData: {
    key: "integrationData",
    kicker: "Intégration",
    title: "Intégration & données",
    description:
      "Comment Praedixa se branche sur l'existant sans créer un nouveau projet lourd.",
    lead: "Praedixa se branche sur vos exports/API pour réunir vos données dans une même base, sans imposer de remplacement SI pour démarrer.",
    sections: [
      {
        title: "Démarrage léger",
        paragraphs: [
          "Lecture seule, exports, API et outils en place: le point de départ reste simple.",
        ],
      },
      {
        title: "Base commune",
        paragraphs: [
          "Les données RH, finance, opérations et supply chain sont remises dans un même cadre pour accélérer la décision.",
        ],
      },
      {
        title: "Cadre de confiance",
        paragraphs: [
          "RBAC, chiffrement, journalisation et hébergement en France sur Scaleway.",
        ],
      },
    ],
    links: [
      { label: "Produit & méthode", key: "productMethod" },
      { label: "Sécurité de l'espace Praedixa", key: "security" },
      { label: "Ressources essentielles", key: "resources" },
    ],
    ctaLabel: "Obtenir le diagnostic ROI gratuit",
  },
};
