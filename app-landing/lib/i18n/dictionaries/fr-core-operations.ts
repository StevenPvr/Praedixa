import type { Dictionary } from "../types";

export const frCoreOperations: Partial<Dictionary> = {
  howItWorks: {
    kicker: "Comment ça marche",
    heading: "Un cycle simple, orienté décision. Pas un dashboard de plus.",
    subheading:
      "Praedixa lit les signaux utiles, compare les arbitrages, cadre la décision et relit l’impact dans le temps.",
    steps: [
      {
        number: "01",
        title: "Lecture anticipative",
        subtitle: "Signaux utiles · lecture seule",
        description:
          "Praedixa part des données déjà présentes dans vos outils pour faire remonter les zones de tension avant la casse.",
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
          "L’équipe décide avec une base commune plutôt qu’en réaction dispersée, sans remplacer ses outils existants.",
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
    kicker: "Preuve",
    heading: "Ce que vous obtenez quand Praedixa entre dans la boucle.",
    subheading:
      "Pas un signal de plus. Un cadre exploitable pour décider, expliquer et relire l’impact.",
    roiFrames: [
      {
        label: "Situation de départ",
        value: "Le conflit économique visible",
        note: "Tension prioritaire, sites exposés, coûts d’urgence et zones de marge fragilisées.",
        sourceLabel: "Source: protocole de mise en place Praedixa",
        sourceUrl: "/fr/protocole-deploiement",
      },
      {
        label: "Arbitrage retenu",
        value: "Les options comparées",
        note: "Hypothèses explicites, arbitrage choisi, garde-fous et ordre d’action.",
        sourceLabel: "Source: protocole de mise en place Praedixa",
        sourceUrl: "/fr/protocole-deploiement",
      },
      {
        label: "Impact relu",
        value: "Ce qui a vraiment changé",
        note: "Avant, recommandé, réel, avec hypothèses, limites et prochain pas.",
        sourceLabel: "Source: protocole de mise en place Praedixa",
        sourceUrl: "/fr/protocole-deploiement",
      },
    ],
    checklist: [
      "Cartographie des tensions prioritaires",
      "Hypothèses économiques explicites",
      "Scénarios comparés",
      "Priorisation par criticité",
      "Journal de décision partagé",
      "Relecture avant / après des impacts observés",
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
    kicker: "Pilote",
    heading: "3 mois pour construire un premier cadre de décision utile.",
    subheading:
      "Le pilote ne vend pas une transformation floue. Il installe une première lecture, calibre les hypothèses, documente les arbitrages et prépare la suite sans lourdeur inutile.",
    statusLabels: ["Lecture initiale", "Calibration", "Cadence pilote"],
    included: {
      title: "Ce que le pilote construit",
      items: [
        "Une première lecture utile sur vos données existantes",
        "Les arbitrages prioritaires rendus visibles",
        "Des hypothèses coût / service / risque explicites",
        "Un dossier de décision relisible par Ops et Finance",
        "Une méthode réutilisable pour la suite",
      ],
    },
    excluded: {
      title: "Ce que le pilote n’est pas",
      items: [
        "Une refonte de votre stack",
        "Un projet SI avant la preuve de valeur",
        "Un audit sans suite opérable",
        "Un tableau de bord de plus",
        "Une promesse d’optimiser toute l’entreprise d’un coup",
      ],
    },
    kpis: {
      title: "Ce que le pilote cadre",
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
        "Journal de décision partagé",
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
      title: "Après le pilote",
      description:
        "Si la preuve est là, Praedixa s’étend progressivement aux arbitrages où la marge gagne le plus à être protégée.",
    },
    urgency:
      "Réponse sous 48h ouvrées. Démarrage possible sans intégration SI lourde.",
    ctaPrimary: "Parler du pilote",
    ctaMeta: "Référent identifié · rythme hebdomadaire · mise en place cadrée",
  },
};
