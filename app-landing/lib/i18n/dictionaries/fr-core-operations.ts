import type { Dictionary } from "../types";

export const frCoreOperations: Partial<Dictionary> = {
  howItWorks: {
    kicker: "Comment ça marche",
    heading: "Un cycle simple, orienté décision. Pas un dashboard de plus.",
    subheading:
      "Praedixa lit les signaux utiles, compare les arbitrages, cadre la décision et relit l’impact dans le temps, à partir d’un conflit économique concret.",
    steps: [
      {
        number: "01",
        title: "Lecture anticipative",
        subtitle: "Signaux utiles · lecture seule",
        description:
          "Praedixa part des données déjà présentes dans vos outils pour faire remonter plus tôt les sites, équipes ou flux qui vont passer sous pression.",
      },
      {
        number: "02",
        title: "Arbitrage économique",
        subtitle: "Coût · non-action · risque",
        description:
          "Les options sont comparées avec des hypothèses explicites: coût d’action, coût de non-action, impact opérationnel et niveau de risque. Les comparaisons s’appuient sur des modèles de prévision, d’apprentissage statistique et d’optimisation sous contrainte adaptés au contexte métier.",
      },
      {
        number: "03",
        title: "Décision cadrée",
        subtitle: "Cadre commun Ops · Finance",
        description:
          "L’équipe décide avec une base commune plutôt qu’en réaction dispersée: quand renforcer, réallouer, reporter ou ajuster le niveau de service.",
      },
      {
        number: "04",
        title: "Preuve d’impact",
        subtitle: "Avant · recommandé · réel",
        description:
          "Les décisions et leurs effets sont relus pour construire une boucle ROI exploitable par les opérations et la finance. La relecture mobilise des modèles économétriques pour distinguer plus proprement ce qui relève du contexte, de la décision prise et de l’impact réellement observé.",
      },
    ],
  },

  useCases: {
    kicker: "Cas d’usage",
    heading: "Des arbitrages concrets, pas des promesses vagues.",
    subheading:
      "Praedixa rend visibles les décisions récurrentes qui détruisent la marge quand elles sont prises trop tard ou sans cadre partagé.",
    labels: {
      context: "Ce qui bloque",
      action: "Ce que Praedixa structure",
      impact: "Ce que cela change",
    },
    cases: [
      {
        id: "volatilite",
        title: "Volatilité de charge",
        context:
          "Identifier trop tard les sites qui vont absorber un pic finit en surcharge locale, coûts d’urgence et promesse de service dégradée.",
        action:
          "Praedixa compare les options disponibles site par site avant la dernière minute, avec des hypothèses visibles par Ops et Finance.",
        result:
          "Moins d’urgence, plus de marge de manœuvre et des arbitrages défendables.",
      },
      {
        id: "couverture",
        title: "Dérive de couverture",
        context:
          "Des zones structurellement fragiles glissent jusqu’au moment où le recours d’urgence devient la seule option.",
        action:
          "Praedixa repère plus tôt les dérives et met les scénarios sur une même base coût / service / risque.",
        result:
          "Les décisions ne reposent plus seulement sur l’intuition locale.",
      },
      {
        id: "intersite",
        title: "Arbitrages inter-sites",
        context:
          "Déplacer la pression d’un site à l’autre peut donner l’illusion d’une solution sans réduire le coût global.",
        action:
          "Praedixa compare proprement plusieurs options d’allocation ou de renfort avant de déplacer la contrainte.",
        result:
          "Les renforts deviennent comparables, justifiables et relisibles.",
      },
      {
        id: "roi",
        title: "Boucle ROI opérationnelle",
        context:
          "Après la décision, il reste souvent impossible de dire ce qu’elle a réellement protégé ou coûté.",
        action:
          "Praedixa documente le raisonnement, la décision prise et les écarts observés ensuite.",
        result:
          "Ops et Finance peuvent enfin relire les arbitrages sur une base commune.",
      },
    ],
  },

  deliverables: {
    kicker: "Exemple concret",
    heading:
      "Avant de demander quoi que ce soit, voyez à quoi ressemble une preuve utile.",
    subheading:
      "Un exemple simple de conflit opérationnel, d’options comparées, de décision retenue et d’impact relu. La preuve publique doit montrer Praedixa à l’œuvre, pas seulement le protocole.",
    roiFrames: [
      {
        label: "Situation initiale",
        value: "Pic de charge sur 3 sites logistiques",
        note: "Retard OTIF en hausse, heures supplémentaires déjà consommées, intérim d’urgence envisagé sur deux sites.",
        sourceLabel: "Voir la preuve d’impact publique",
        sourceUrl: "/fr/decision-log-preuve-roi",
      },
      {
        label: "Options comparées",
        value: "HS vs intérim vs réallocation",
        note: "Chaque option est comparée selon coût, risque de service, capacité disponible et effet attendu sur le backlog.",
        sourceLabel: "Voir la preuve d’impact publique",
        sourceUrl: "/fr/decision-log-preuve-roi",
      },
      {
        label: "Impact relu",
        value: "Décision retenue puis relue",
        note: "La décision prise, les limites assumées et l’impact observé sont relus ensemble pour préparer le prochain arbitrage.",
        sourceLabel: "Voir la preuve d’impact publique",
        sourceUrl: "/fr/decision-log-preuve-roi",
      },
    ],
    checklist: [
      "La situation de départ est décrite en mots métier, pas seulement en KPI",
      "Les options comparées sont visibles avec leurs hypothèses",
      "La décision retenue est expliquée clairement",
      "La limite de l’exemple est rendue explicite",
      "L’impact relu distingue contexte et décision",
      "Le lien avec ERP / BI / planning / Excel est clarifié",
    ],
  },

  security: {
    kicker: "Sécurité & IT",
    heading:
      "Déploiement sobre au départ, compatible avec une revue IT sérieuse.",
    subheading:
      "Praedixa commence en lecture seule sur vos exports, API ou outils existants. L’objectif est de créer vite une première lecture utile sans ouvrir un chantier SI lourd avant la preuve d’intérêt.",
    tiles: [
      {
        title: "Connexion à l’existant",
        description:
          "Le premier périmètre se branche sur l’existant pour objectiver les arbitrages avant toute intégration plus poussée.",
      },
      {
        title: "Données agrégées",
        description:
          "Le démarrage présenté ici travaille au niveau site, équipe ou activité, pas au niveau individuel.",
      },
      {
        title: "Exports CSV / Excel ou API",
        description:
          "Praedixa démarre sur ce que vous avez déjà, sans exiger un remplacement d’outil ou une refonte de process.",
      },
      {
        title: "Cadre de sécurité clair",
        description:
          "Chiffrement, contrôle d’accès et journalisation sont pensés pour entrer dans une discussion IT sérieuse sans lourdeur inutile.",
      },
      {
        title: "Hébergement France",
        description:
          "La plateforme et les données sont hébergées en France sur Scaleway.",
      },
      {
        title: "Montée en charge progressive",
        description:
          "L’intégration s’élargit seulement quand la valeur business est prouvée et que le contexte le justifie.",
      },
    ],
    compatibility: {
      title: "Compatible avec votre stack actuelle",
      description:
        "Praedixa se branche au-dessus de l’existant pour structurer la décision, pas pour imposer un remplacement.",
      tools: ["ERP", "Planning", "CRM", "BI", "Excel"],
    },
    honesty:
      "L’intégration doit rassurer la revue IT, pas monopoliser la conversation avant que la valeur business soit prouvée.",
  },

  pilot: {
    kicker: "Déploiement",
    heading: "Déploiement Praedixa: logiciel + mise en place cadrée.",
    subheading:
      "Le déploiement Praedixa installe le logiciel sur vos données existantes, cadre le premier périmètre et met en place la relecture d’impact sans projet SI lourd au départ.",
    statusLabels: ["Point d’entrée", "Mise en place", "Cadence"],
    included: {
      title: "Ce que le déploiement installe",
      items: [
        "Une première lecture utile sur vos données existantes",
        "Les arbitrages prioritaires rendus visibles",
        "Des hypothèses coût / service / risque explicites",
        "Une base commune pour Ops, Finance et Réseau",
        "Une boucle de relecture d’impact réutilisable",
      ],
    },
    excluded: {
      title: "Ce que le déploiement n’est pas",
      items: [
        "Une refonte de votre stack",
        "Un projet SI avant la preuve de valeur",
        "Un tableau de bord de plus",
        "Une promesse d’optimiser toute l’entreprise d’un coup",
        "Un diagnostic isolé sans suite opérable",
      ],
    },
    kpis: {
      title: "Ce que le déploiement cadre",
      items: [
        "Tensions prioritaires",
        "Hypothèses économiques",
        "Options comparées",
        "Décisions prises",
        "Impacts relus",
      ],
    },
    governance: {
      title: "Rythme de travail",
      items: [
        "Référent opérationnel identifié",
        "Point court hebdomadaire",
        "Relecture Ops / Finance structurée",
        "Décisions relues sur une base commune",
      ],
    },
    selection: {
      title: "Pré-requis",
      items: [
        "Organisation multi-sites",
        "Exports ou API exploitables",
        "Sponsor opérationnel disponible",
      ],
    },
    upcoming: {
      title: "Après le premier périmètre",
      description:
        "Si la preuve est là, Praedixa s’étend progressivement aux arbitrages où la marge gagne le plus à être protégée.",
    },
    urgency:
      "Réponse sous 48h ouvrées. Démarrage possible sans intégration SI lourde.",
    ctaPrimary: "Parler du déploiement",
    ctaMeta:
      "Logiciel + mise en place cadrée · lecture seule au départ · premier périmètre resserré",
  },
};
