import type { Dictionary } from "../types";

export const frCoreOperations: Partial<Dictionary> = {
  howItWorks: {
    kicker: "Comment ça marche",
    heading: "Un cycle simple, orienté résultat.",
    subheading:
      "Praedixa détecte, compare, aide à décider et mesure l\u2019impact. Automatiquement.",
    steps: [
      {
        number: "01",
        title: "Détection anticipée",
        subtitle: "Signaux utiles",
        description:
          "Praedixa analyse vos données existantes et fait remonter les risques avant qu\u2019ils ne coûtent cher.",
      },
      {
        number: "02",
        title: "Comparaison des options",
        subtitle: "Coût · impact · risque",
        description:
          "Les scénarios sont chiffrés et comparés pour que vous choisissiez la meilleure option.",
      },
      {
        number: "03",
        title: "Décision éclairée",
        subtitle: "Cadre commun",
        description:
          "L\u2019équipe décide sur une base partagée plutôt que dans l\u2019urgence.",
      },
      {
        number: "04",
        title: "Preuve de ROI",
        subtitle: "Avant · après",
        description:
          "Les décisions et leurs effets sont mesurés pour prouver le ROI réel.",
      },
    ],
  },

  useCases: {
    kicker: "Cas d\u2019usage",
    heading: "Des cas concrets, pas des promesses.",
    subheading:
      "Praedixa s\u2019applique aux décisions qui coûtent le plus quand elles sont prises trop tard.",
    labels: {
      context: "Ce qui bloque",
      action: "Ce que Praedixa apporte",
      impact: "Ce que cela change",
    },
    cases: [
      {
        id: "volatilite",
        title: "Pics d\u2019activité",
        context:
          "Un pic de charge identifié trop tard entraîne des surcoûts et un service dégradé.",
        action:
          "Praedixa anticipe les pics et compare les options site par site avant la dernière minute.",
        result:
          "Moins d\u2019urgence, plus de marge de manœuvre et des décisions défendables.",
      },
      {
        id: "couverture",
        title: "Sous-couverture",
        context:
          "Des zones fragiles dérivent jusqu\u2019au moment où le recours d\u2019urgence devient la seule option.",
        action:
          "Praedixa détecte les dérives et compare les scénarios sur une base commune\u00a0: coût, impact, risque.",
        result:
          "Les décisions reposent sur des données, pas seulement sur l\u2019intuition.",
      },
      {
        id: "intersite",
        title: "Répartition des ressources",
        context:
          "Déplacer la pression d\u2019un site à l\u2019autre donne l\u2019illusion d\u2019une solution sans réduire le coût global.",
        action:
          "Praedixa compare les options de répartition et de renfort avant de déplacer la contrainte.",
        result:
          "Les décisions de répartition deviennent comparables et justifiables.",
      },
      {
        id: "roi",
        title: "Mesure du ROI",
        context:
          "Après la décision, personne ne sait ce qu\u2019elle a réellement coûté ou protégé.",
        action:
          "Praedixa documente chaque décision et mesure ses effets réels.",
        result: "Le ROI est prouvé, pas estimé.",
      },
    ],
  },

  deliverables: {
    kicker: "Exemple concret",
    heading: "Voyez à quoi ressemble une décision optimisée de bout en bout.",
    subheading:
      "Un exemple simple\u00a0: un problème détecté, des options comparées, une décision prise et un impact mesuré.",
    roiFrames: [
      {
        label: "Situation initiale",
        value: "Pic de charge sur 3 sites",
        note: "Retards en hausse, heures supplémentaires déjà consommées, renfort d\u2019urgence envisagé.",
        sourceLabel: "Voir la preuve d\u2019impact",
        sourceUrl: "/fr/decision-log-preuve-roi",
      },
      {
        label: "Options comparées",
        value: "Heures sup vs renfort vs réallocation",
        note: "Chaque option est comparée selon coût, impact sur le service et capacité disponible.",
        sourceLabel: "Voir la preuve d\u2019impact",
        sourceUrl: "/fr/decision-log-preuve-roi",
      },
      {
        label: "Impact mesuré",
        value: "Décision retenue et résultat vérifié",
        note: "La décision, ses limites et son impact réel sont mesurés pour améliorer les suivantes.",
        sourceLabel: "Voir la preuve d\u2019impact",
        sourceUrl: "/fr/decision-log-preuve-roi",
      },
    ],
    checklist: [
      "La situation de départ est décrite simplement",
      "Les options sont comparées avec leurs hypothèses",
      "La décision retenue est expliquée clairement",
      "Les limites de l\u2019exemple sont rendues explicites",
      "L\u2019impact est mesuré après coup",
      "Le lien avec vos outils existants est clarifié",
    ],
  },

  security: {
    kicker: "Sécurité & IT",
    heading: "Sécurisé, souverain, non intrusif.",
    subheading:
      "Praedixa démarre en lecture seule sur vos données existantes, sans projet IT lourd.",
    tiles: [
      {
        title: "Connexion à l\u2019existant",
        description:
          "Praedixa se branche sur vos outils actuels sans les remplacer.",
      },
      {
        title: "Données agrégées",
        description:
          "Le démarrage travaille au niveau site, équipe ou activité, pas au niveau individuel.",
      },
      {
        title: "Exports CSV / Excel ou API",
        description:
          "Praedixa démarre sur ce que vous avez déjà, sans refonte de process.",
      },
      {
        title: "Cadre de sécurité clair",
        description:
          "Chiffrement, contrôle d\u2019accès et journalisation intégrés.",
      },
      {
        title: "Hébergement France",
        description: "Plateforme et données hébergées en France sur Scaleway.",
      },
      {
        title: "Montée en charge progressive",
        description:
          "L\u2019intégration s\u2019élargit seulement quand la valeur est prouvée.",
      },
    ],
    compatibility: {
      title: "Compatible avec votre stack actuelle",
      description:
        "Praedixa se branche sur l\u2019existant pour ajouter l\u2019intelligence, pas pour imposer un remplacement.",
      tools: ["ERP", "Planning", "CRM", "BI", "Excel"],
    },
    honesty:
      "L\u2019intégration doit rassurer la revue IT, pas monopoliser la conversation avant que la valeur soit prouvée.",
  },

  pilot: {
    kicker: "Déploiement",
    heading: "Opérationnel en 30 jours.",
    subheading:
      "Un démarrage simple\u00a0: un sponsor opérations, vos données existantes, des résultats mesurables.",
    statusLabels: ["Point d\u2019entrée", "Mise en place", "Cadence"],
    included: {
      title: "Ce que le déploiement installe",
      items: [
        "Une première lecture utile sur vos données existantes",
        "Les décisions prioritaires identifiées",
        "Des options comparées avec leur coût et leur impact",
        "Une base commune pour vos équipes",
        "Une mesure du ROI réutilisable",
      ],
    },
    excluded: {
      title: "Ce que le déploiement n\u2019est pas",
      items: [
        "Une refonte de votre stack",
        "Un projet IT avant la preuve de valeur",
        "Un tableau de bord de plus",
        "Une promesse sans résultat mesurable",
        "Un diagnostic isolé sans suite opérable",
      ],
    },
    kpis: {
      title: "Ce que le déploiement cadre",
      items: [
        "Risques prioritaires",
        "Options chiffrées",
        "Décisions prises",
        "Résultats mesurés",
        "ROI prouvé",
      ],
    },
    governance: {
      title: "Rythme de travail",
      items: [
        "Un sponsor opérationnel identifié",
        "Un point court hebdomadaire",
        "Une revue structurée des résultats",
        "Des décisions mesurées dans le temps",
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
        "Si les résultats sont là, Praedixa s\u2019étend progressivement aux décisions qui ont le plus d\u2019impact.",
    },
    urgency: "Réponse sous 48h. Démarrage possible sans projet IT.",
    ctaPrimary: "Nous contacter",
    ctaMeta:
      "Logiciel + mise en place cadrée · lecture seule au départ · résultats en 30 jours",
  },
};
