import type {
  KnowledgePageContent,
  KnowledgePageKey,
} from "./knowledge-pages-shared";

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
      "Mission, ancrage et positionnement de Praedixa comme plateforme française de DecisionOps pour les entreprises multi-sites.",
    lead: "Praedixa est la plateforme française de DecisionOps: elle relie les systèmes qui comptent pour une décision, gouverne les arbitrages critiques et prouve le ROI décision par décision.",
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
          "Praedixa n'est pas une data platform générique, un ERP, un outil de planning ou un dashboard de plus.",
          "La plateforme se place entre les systèmes existants et les arbitrages business à prendre plus tôt, avec une exécution contrôlée et une preuve relisible pour les équipes et les comités.",
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
    ctaLabel: "Parler du déploiement",
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
    ctaLabel: "Parler du déploiement",
  },

  resources: {
    key: "resources",
    kicker: "Ressources",
    title: "Ressources essentielles",
    description:
      "Le point d'entrée pour comprendre les sujets business traités, naviguer vers les pages sectorielles exactes et trouver les contenus utiles.",
    lead: "Cette page concentre les repères utiles sans recréer une forêt de micro-pages. Les pages sectorielles dédiées portent désormais le discours métier exact, et les ressources gardent le reste du contexte.",
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
          "Les pages sectorielles dédiées couvrent maintenant HCR, enseignement supérieur, logistique / transport / retail et automobile / concessions / ateliers avec une proposition de valeur et des preuves adaptées à chaque contexte.",
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
          "Les détails métier vivent désormais dans les pages sectorielles, le blog, les ressources SEO et les échanges commerciaux, pas dans une forêt de pages annexes.",
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
    ctaLabel: "Demander la preuve sur historique",
  },

  productMethod: {
    key: "productMethod",
    kicker: "Produit",
    title: "Produit & méthode",
    description:
      "Comment Praedixa relie les systèmes utiles et transforme des arbitrages récurrents en décisions gouvernées.",
    lead: "Praedixa relie vos systèmes RH, finance, opérations et supply chain sans remplacer vos outils pour transformer des signaux dispersés en décisions gouvernées, exécutables et auditables.",
    sections: [
      {
        title: "Réunir",
        paragraphs: [
          "La plateforme part des outils en place et relie les données utiles dans un même langage de décision.",
          "L'objectif n'est pas d'avoir plus de chiffres, mais un cadre commun compréhensible par toutes les équipes.",
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
          "Les decisions sont priorisees selon l'impact business attendu, pas selon le bruit du moment.",
          "Chaque action garde une logique claire pour les équipes, la direction et la finance.",
        ],
      },
    ],
    links: [
      { label: "Comment ça marche", key: "howItWorksPage" },
      { label: "Dossier ROI", key: "decisionLogProof" },
      { label: "Intégration & données", key: "integrationData" },
      { label: "Ressources essentielles", key: "resources" },
    ],
    ctaLabel: "Demander la preuve sur historique",
  },

  howItWorksPage: {
    key: "howItWorksPage",
    kicker: "Méthode",
    title: "Comment ça marche",
    description:
      "Le parcours Praedixa pour fédérer les données utiles, calculer les options, déclencher l'action validée et suivre le ROI.",
    lead: "Praedixa commence par fédérer les données utiles, puis aide à rendre les besoins visibles plus tôt, à calculer les options, à déclencher l'action validée et à suivre le ROI.",
    sections: [
      {
        title: "1. Réunir les données utiles",
        paragraphs: [
          "Praedixa part des exports, API et outils deja en place pour constituer une federation gouvernee sur l'existant.",
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
          "Les équipes voient ce qu'il faut lancer en premier, qui doit valider et quel arbitrage peut rapporter le plus.",
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
    ctaLabel: "Demander la preuve sur historique",
  },

  decisionLogProof: {
    key: "decisionLogProof",
    kicker: "Preuve",
    title: "Dossier ROI",
    description:
      "Le format simple pour relier options, actions et gains observes dans le temps.",
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
    ctaLabel: "Demander la preuve sur historique",
  },

  integrationData: {
    key: "integrationData",
    kicker: "Intégration",
    title: "Intégration & données",
    description:
      "Comment Praedixa se branche sur l'existant sans créer un nouveau projet lourd.",
    lead: "Praedixa se branche sur vos exports/API pour fédérer les systèmes qui comptent pour une décision, sans imposer de remplacement SI pour démarrer.",
    sections: [
      {
        title: "Démarrage léger",
        paragraphs: [
          "Lecture seule, exports, API et outils en place: le point de départ reste simple.",
        ],
      },
      {
        title: "Federation gouvernee",
        paragraphs: [
          "Les données RH, finance, opérations et supply chain sont remises dans un même cadre pour accélérer la décision sans écraser votre stack.",
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
    ctaLabel: "Demander la preuve sur historique",
  },
};
