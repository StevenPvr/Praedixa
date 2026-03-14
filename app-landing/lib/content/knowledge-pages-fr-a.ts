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
      "Mission, ancrage et positionnement de Praedixa comme couche de décision pour les organisations multi-sites.",
    lead: "Praedixa aide les organisations multi-sites à arbitrer plus tôt entre demande, capacité, coût, service et risque, puis à prouver l’impact réel des décisions prises.",
    sections: [
      {
        title: "Mission",
        paragraphs: [
          "Accompagner la croissance des entreprises françaises en révélant le potentiel dans leurs données, tout en gardant leur souveraineté.",
          "Praedixa transforme cette raison d’être en cadre opérable: voir plus tôt les arbitrages critiques, comparer les options sur une base commune et relire ce qui a réellement changé.",
        ],
      },
      {
        title: "Positionnement",
        paragraphs: [
          "Praedixa n'est pas une data platform générique, un ERP, un outil de planning ou un dashboard de plus.",
          "Praedixa se place au-dessus des outils existants pour structurer les arbitrages coût / service / risque, cadrer la décision et relire l’impact dans le temps.",
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
      "Comment Praedixa transforme des signaux dispersés en arbitrages lisibles, décidables et relisibles.",
    lead: "Praedixa aide les organisations multi-sites à voir plus tôt les arbitrages critiques, comparer les options et relire l’impact des décisions sans remplacer les outils déjà en place.",
    sections: [
      {
        title: "Voir",
        paragraphs: [
          "Praedixa part des outils en place pour rendre visibles plus tôt les tensions qui fragilisent la marge, le service ou la capacité.",
          "L'objectif n'est pas d'avoir plus de chiffres, mais une lecture utile des conflits économiques qui méritent un arbitrage.",
        ],
      },
      {
        title: "Comparer",
        paragraphs: [
          "Les options sont comparées avec des hypothèses explicites: coût d’action, coût de non-action, niveau de service et risque.",
          "Les comparaisons s’appuient sur des modèles de prévision, d’apprentissage statistique et d’optimisation sous contrainte pour rendre l’arbitrage plus défendable, sans imposer de boîte noire aux équipes.",
        ],
      },
      {
        title: "Prouver",
        paragraphs: [
          "Chaque décision garde son contexte, son raisonnement et ce qui a réellement changé ensuite.",
          "La relecture s’appuie sur des modèles économétriques pour relier plus proprement baseline, décision prise et impact observé. La valeur est dans la boucle complète: arbitrer, documenter, relire et améliorer le prochain arbitrage.",
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
      "Le cycle Praedixa pour rendre un arbitrage visible, comparable, décidé et relu.",
    lead: "Praedixa lit les signaux utiles, compare les arbitrages, cadre la décision et relit l’impact dans le temps.",
    sections: [
      {
        title: "1. Lecture anticipative",
        paragraphs: [
          "Praedixa part des exports, API et outils déjà en place pour faire remonter les zones de tension avant la casse.",
        ],
      },
      {
        title: "2. Arbitrage économique",
        paragraphs: [
          "Les options sont comparées avec des hypothèses explicites: coût d’action, coût de non-action, impact opérationnel et niveau de risque.",
          "Le calcul combine prévision, apprentissage statistique et optimisation sous contrainte pour comparer les scénarios dans un cadre exploitable par les équipes.",
        ],
      },
      {
        title: "3. Décision cadrée",
        paragraphs: [
          "L’équipe décide avec un cadre commun plutôt qu’en réaction dispersée, sans remplacer ses outils existants.",
        ],
      },
      {
        title: "4. Preuve d’impact",
        paragraphs: [
          "Le résultat est relu dans une boucle avant / recommandé / réel pour comprendre ce qui a effectivement protégé la marge et ce qu’il faut corriger ensuite.",
          "Cette relecture mobilise des modèles économétriques pour distinguer plus proprement ce qui relève du contexte, de la décision prise et de l’impact réellement observé.",
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
          "Situation de départ, options comparées, arbitrage retenu, hypothèses explicites et résultats observés.",
          "Le but est de prouver ce qui rapporte réellement, pas d'empiler des tableaux. La relecture s’appuie sur des modèles économétriques pour mieux attribuer l’impact et éviter de confondre changement de contexte et effet réel d’une décision.",
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
        title: "Pourquoi cela compte",
        paragraphs: [
          "Le dossier ROI ferme la boucle entre lecture, arbitrage, décision et impact relu.",
          "Il permet à la direction, à la finance et aux opérations de parler enfin du même arbitrage sur une base commune.",
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
      "Comment Praedixa se branche sur l'existant sans transformer le sujet en chantier SI avant la preuve d’intérêt.",
    lead: "Praedixa démarre sur vos exports et API existants en lecture seule pour créer une première lecture utile sans imposer un remplacement d’outil.",
    sections: [
      {
        title: "Démarrage léger",
        paragraphs: [
          "Lecture seule, exports, API et outils en place: le point de départ reste simple et rapide à cadrer.",
        ],
      },
      {
        title: "Cadre commun",
        paragraphs: [
          "Les données utiles sont remises dans un même cadre pour accélérer la décision sans écraser votre stack ni faire dériver la discussion vers la plomberie.",
        ],
      },
      {
        title: "Cadre de confiance",
        paragraphs: [
          "Chiffrement, contrôle d'accès, journalisation et hébergement en France sur Scaleway.",
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
