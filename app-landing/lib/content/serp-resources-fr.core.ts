import { sharedExecutionSection, type SerpResourceEntry } from "./serp-resources-fr.shared";

export const serpResourceTargetsFrCore: readonly SerpResourceEntry[] = [
  {
    id: 1,
    query: "sous-couverture définition",
    slug: "sous-couverture-definition",
    title: "Sous-couverture: définition, symptômes, causes et coûts",
    intent: "Info",
    description:
      "Définition opérationnelle de la sous-couverture, signaux d'alerte, causes racines et impacts financiers en environnement multi-sites.",
    openingSnippet:
      "La sous-couverture est l'écart durable entre charge opérationnelle et capacité réellement mobilisable au bon moment.",
    asset: {
      type: "template",
      title: "Diagnostic express en 5 questions",
      description:
        "Grille rapide pour qualifier exposition, criticité et niveau de réponse requis.",
    },
    sections: [
      {
        title: "Définir correctement la sous-couverture",
        paragraphs: [
          "Le signal utile ne se limite pas à un taux d'absence. Il relie charge attendue, capacité réellement disponible et contraintes de service.",
        ],
      },
      sharedExecutionSection,
    ],
  },
  {
    id: 2,
    query: "sous-couverture logistique",
    slug: "sous-couverture-logistique",
    title: "Sous-couverture logistique: comment anticiper avant rupture",
    intent: "Info/Decision",
    description:
      "Méthode de prévention de la sous-couverture logistique avec priorisation des risques et options d'action comparables.",
    openingSnippet:
      "En logistique, la sous-couverture se paie d'abord en retards, en pénalités, puis en coûts d'urgence.",
    asset: {
      type: "guide",
      title: "Cas chiffré multi-sites",
      description:
        "Exemple détaillé de priorisation des sites sous tension et choix des leviers.",
    },
    sections: [
      {
        title: "Signaux d'exposition logistique",
        paragraphs: [
          "Combiner niveau de charge, sensibilité SLA et capacité de remplacement permet de cibler les sites où la rupture est probable.",
        ],
      },
      sharedExecutionSection,
    ],
  },
  {
    id: 3,
    query: "trous de couverture planning",
    slug: "trous-de-couverture-planning",
    title: "Trous de couverture planning: causes, détection, plan d'action",
    intent: "Info",
    description:
      "Comprendre pourquoi des trous de couverture apparaissent et mettre en place une boucle de détection/réponse robuste.",
    openingSnippet:
      "Un trou de couverture n'est pas un incident isolé: c'est souvent un défaut de pilotage récurrent.",
    asset: {
      type: "template",
      title: "Template de revue hebdomadaire",
      description:
        "Modèle de rituel pour qualifier les trous, décider des actions et suivre leur impact.",
    },
    sections: [
      {
        title: "Pourquoi les trous se répètent",
        paragraphs: [
          "Décisions tardives, informations fragmentées et règles non standardisées transforment des variations normales en incidents répétés.",
        ],
      },
      sharedExecutionSection,
    ],
  },
  {
    id: 4,
    query: "écart capacité charge logistique",
    slug: "ecart-capacite-charge",
    title: "Écart capacité/charge logistique: modèle, formules et erreurs",
    intent: "Info",
    description:
      "Construire un modèle capacité/charge lisible pour objectiver les écarts avant qu'ils ne deviennent critiques.",
    openingSnippet:
      "L'écart capacité/charge doit être lu comme un risque de service futur, pas comme une photo statique.",
    asset: {
      type: "calculateur",
      title: "Modèle capacité/charge prêt à l'emploi",
      description:
        "Feuille de calcul avec hypothèses explicites, seuils et visualisation par site.",
    },
    sections: [
      {
        title: "Formule d'écart exploitable en gouvernance",
        paragraphs: [
          "L'équation utile est celle qui reste compréhensible par Ops et Finance, avec hypothèses visibles et mises à jour traçables.",
        ],
      },
      sharedExecutionSection,
    ],
  },
  {
    id: 5,
    query: "taux de couverture planning",
    slug: "taux-de-couverture-planning",
    title: "Taux de couverture planning: calcul, variantes et seuils",
    intent: "Info",
    description:
      "Formules de taux de couverture, limites d'interprétation et seuils de pilotage adaptés aux opérations multi-sites.",
    openingSnippet:
      "Un taux de couverture unique est insuffisant: il faut distinguer exposition, criticité et options d'action.",
    asset: {
      type: "calculateur",
      title: "Calculateur de taux de couverture",
      description:
        "Calcul automatique par site, équipe et horizon avec indicateurs de criticité.",
    },
    sections: [
      {
        title: "Choisir les bons seuils",
        paragraphs: [
          "Les seuils de couverture doivent refléter la sensibilité opérationnelle réelle et non des standards génériques.",
        ],
      },
      sharedExecutionSection,
    ],
  },
  {
    id: 6,
    query: "early warning sous-effectif",
    slug: "early-warning-sous-effectif",
    title: "Early-warning sous-effectif: détecter à J+3, J+7, J+14",
    intent: "Info/Decision",
    description:
      "Cadre early-warning pour anticiper les sous-effectifs et décider tôt des actions de couverture.",
    openingSnippet:
      "Un early-warning utile transforme un risque latent en décision actionnable avant la rupture terrain.",
    asset: {
      type: "guide",
      title: "Démo de détection des zones à risque",
      description:
        "Exemple d'alerte et de priorisation des actions selon horizon et criticité.",
    },
    sections: [
      {
        title: "Construire un signal précoce fiable",
        paragraphs: [
          "Le signal combine trajectoire de charge, capacité mobilisable, volatilité locale et contraintes de service.",
        ],
      },
      sharedExecutionSection,
    ],
  },
  {
    id: 7,
    query: "anticiper sous-effectif entrepôt",
    slug: "anticiper-sous-effectif-entrepot",
    title:
      "Anticiper le sous-effectif en entrepôt: signaux faibles et checklists",
    intent: "Info",
    description:
      "Méthode pratique pour repérer les signaux faibles de sous-effectif et structurer la réponse opérationnelle.",
    openingSnippet:
      "L'anticipation ne repose pas sur l'intuition: elle repose sur des signaux faibles mesurés et comparables.",
    asset: {
      type: "template",
      title: "Checklist de scoring terrain",
      description:
        "Grille simple pour prioriser les risques de sous-effectif par zone opérationnelle.",
    },
    sections: [
      {
        title: "Signaux faibles à surveiller",
        paragraphs: [
          "Dérive de backlog, baisse de flexibilité, saturation des équipes clés et dépendance aux renforts d'urgence sont des indicateurs précoces.",
        ],
      },
      sharedExecutionSection,
    ],
  },
  {
    id: 8,
    query: "carte des risques de sous-couverture",
    slug: "carte-des-risques-sous-couverture",
    title: "Carte des risques de sous-couverture: méthode et livrable",
    intent: "Decision",
    description:
      "Concevoir une carte des risques de sous-couverture lisible pour arbitrer rapidement en comité Ops/DAF.",
    openingSnippet:
      "Une carte de risques utile relie probabilité, impact et options d'action immédiatement mobilisables.",
    asset: {
      type: "template",
      title: "Livrable carte des risques",
      description:
        "Modèle de restitution prêt pour revue hebdomadaire de couverture.",
    },
    sections: [
      {
        title: "Du signal au plan d'action",
        paragraphs: [
          "La carte doit pointer les zones critiques et l'ordre d'arbitrage, pas seulement catégoriser les risques.",
        ],
      },
      sharedExecutionSection,
    ],
  },
  {
    id: 9,
    query: "planification des effectifs logistique",
    slug: "planification-effectifs-logistique",
    title:
      "Planification des effectifs logistique: méthode, données et pilotage",
    intent: "Info/Decision",
    description:
      "Structurer la planification des effectifs logistiques avec une lecture commune Ops/Finance et un pilotage continu.",
    openingSnippet:
      "La planification effectifs performante combine cadence opérationnelle, coûts et résilience de service.",
    asset: {
      type: "playbook",
      title: "Maturity model planification",
      description:
        "Matrice niveau 0→4 pour cadrer le niveau de maturité et les prochaines priorités.",
    },
    sections: [
      {
        title: "Données minimales pour planifier correctement",
        paragraphs: [
          "Charge prévisionnelle, capacité réelle, contraintes contractuelles et historique d'actions sont le socle minimum.",
        ],
      },
      sharedExecutionSection,
    ],
  },
  {
    id: 10,
    query: "dimensionnement effectifs entrepôt",
    slug: "dimensionnement-effectifs-entrepot",
    title: "Dimensionnement effectifs entrepôt: méthode et erreurs à éviter",
    intent: "Info/Decision",
    description:
      "Méthode de dimensionnement des effectifs en entrepôt, avec hypothèses explicites et scénarios de stress.",
    openingSnippet:
      "Le bon dimensionnement n'est pas une moyenne: c'est une stratégie de robustesse face aux pics.",
    asset: {
      type: "calculateur",
      title: "Simulateur de dimensionnement",
      description:
        "Outil gratuit pour tester volumes, standards et buffers avant décision.",
    },
    sections: [
      {
        title: "Dimensionner sans sous-estimer la variabilité",
        paragraphs: [
          "Les paramètres de variabilité doivent être explicités pour éviter un sous-dimensionnement chronique.",
        ],
      },
      sharedExecutionSection,
    ],
  },
];
