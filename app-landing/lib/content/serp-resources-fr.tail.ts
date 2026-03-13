import {
  sharedExecutionSection,
  type SerpResourceEntry,
} from "./serp-resources-fr.shared";

export const serpResourceTargetsFrTail: readonly SerpResourceEntry[] = [
  {
    id: 21,
    query: "coût absentéisme entrepôt",
    slug: "cout-absenteisme-entrepot",
    title: "Coût de l'absentéisme en entrepôt: scénarios et leviers",
    intent: "Decision",
    description:
      "Mesurer le coût de l'absentéisme en entrepôt et structurer des plans de réponse proportionnés.",
    openingSnippet:
      "L'absentéisme devient critique quand son impact sur la couverture n'est pas anticipé suffisamment tôt.",
    asset: {
      type: "calculateur",
      title: "Modèle de coût absentéisme",
      description: "Estimation par site, activité et scénario de compensation.",
    },
    sections: [
      {
        title: "Isoler l'impact opérationnel de l'absentéisme",
        paragraphs: [
          "Le coût doit relier taux d'absence, exposition de service et coût des réponses mobilisées.",
        ],
      },
      sharedExecutionSection,
    ],
  },
  {
    id: 22,
    query: "coût turnover logistique",
    slug: "cout-turnover-logistique",
    title: "Coût du turnover logistique: estimation complète et priorités",
    intent: "Decision",
    description:
      "Évaluer le coût complet du turnover logistique et prioriser les actions qui réduisent la dérive.",
    openingSnippet:
      "Le turnover fragilise la couverture en augmentant simultanément coût, variabilité et perte de savoir-faire.",
    asset: {
      type: "calculateur",
      title: "Calculateur coût turnover",
      description:
        "Structure standard pour chiffrer recrutement, onboarding et perte de productivité.",
    },
    sections: [
      {
        title: "Mesurer sans sous-estimer les coûts cachés",
        paragraphs: [
          "La perte de productivité transitoire et la pression managériale doivent être intégrées au modèle.",
        ],
      },
      sharedExecutionSection,
    ],
  },
  {
    id: 23,
    query: "pilotage masse salariale logistique",
    slug: "pilotage-masse-salariale-logistique",
    title: "Pilotage de la masse salariale logistique: cadre Ops x DAF",
    intent: "Commercial/Decision",
    description:
      "Structurer le pilotage de la masse salariale logistique en liant couverture, coût et niveau de service.",
    openingSnippet:
      "Le pilotage de masse salariale est robuste quand il relie dépenses, décisions et impact opérationnel.",
    asset: {
      type: "template",
      title: "Template dashboard Ops/DAF",
      description:
        "Vue consolidée coûts de couverture, risques et décisions validées.",
    },
    sections: [
      {
        title: "Passer d'un suivi budgétaire à un pilotage décisionnel",
        paragraphs: [
          "Le tableau de bord doit expliquer les écarts et guider les arbitrages à venir.",
        ],
      },
      sharedExecutionSection,
    ],
  },
  {
    id: 24,
    query: "coût de l'inaction logistique",
    slug: "cout-inaction-logistique",
    title: "Coût de l'inaction logistique: rendre visible l'impact caché",
    intent: "Decision",
    description:
      "Rendre quantifiable le coût de l'inaction en logistique pour décider plus tôt et plus proprement.",
    openingSnippet:
      "Le coût de l'inaction est le différentiel entre risque subi et action préventive correctement calibrée.",
    asset: {
      type: "calculateur",
      title: "Calculator CFO du coût d'inaction",
      description: "Consolidation multi-sites et scénarios de non-décision.",
    },
    sections: [
      {
        title: "Objectiver ce qui n'apparaît pas en comptabilité immédiate",
        paragraphs: [
          "Le cadre met en évidence les coûts reportés, les dégradations de service et les arbitrages perdus.",
        ],
      },
      sharedExecutionSection,
    ],
  },
  {
    id: 25,
    query: "playbook actions sous-effectif",
    slug: "playbook-actions-sous-effectif",
    title:
      "Playbook actions sous-effectif: prioriser HS, intérim et réallocation",
    intent: "Decision",
    description:
      "Bibliothèque d'actions sous-effectif avec critères de déclenchement, limites et impacts attendus.",
    openingSnippet:
      "Un playbook efficace évite les réponses improvisées et améliore la cohérence multi-sites.",
    asset: {
      type: "playbook",
      title: "Bibliothèque d'actions téléchargeable",
      description:
        "Matrice impact/effort + conditions d'activation par type de tension.",
    },
    sections: [
      {
        title: "Standardiser les réponses sans rigidifier",
        paragraphs: [
          "Chaque action doit préciser conditions d'usage, responsable, coût attendu et critère de sortie.",
        ],
      },
      sharedExecutionSection,
    ],
  },
  {
    id: 26,
    query: "traçabilité des décisions opérationnelles",
    slug: "traceabilite-decisions-operationnelles",
    title:
      "Traçabilité des décisions opérationnelles: construire un audit trail utile",
    intent: "Decision",
    description:
      "Mettre en place un journal des décisions opérationnelles pour auditer les arbitrages et mesurer leur effet.",
    openingSnippet:
      "La traçabilité crée de la vitesse: elle évite de redébattre chaque semaine les mêmes décisions.",
    asset: {
      type: "template",
      title: "Template Decision Log",
      description:
        "Format prêt à l'emploi pour tracer contexte, décision, hypothèses et résultat.",
    },
    sections: [
      {
        title: "Ce qu'un decision log doit contenir",
        paragraphs: [
          "Contexte, options évaluées, décision retenue, hypothèses, propriétaire, horizon de revue et résultat observé.",
        ],
      },
      sharedExecutionSection,
    ],
  },
  {
    id: 27,
    query: "mesure avant après performance logistique",
    slug: "mesure-avant-apres-performance",
    title: "Mesure avant/après performance logistique: méthode robuste",
    intent: "Info/Decision",
    description:
      "Évaluer correctement l'impact des décisions de couverture avec un protocole avant/après robuste et défendable.",
    openingSnippet:
      "Mesurer avant/après exige de contrôler les biais, pas seulement de comparer deux moyennes.",
    asset: {
      type: "guide",
      title: "Toolkit de mesure d'impact",
      description:
        "Checklist méthode, design d'analyse et template de restitution.",
    },
    sections: [
      {
        title: "Éviter les faux positifs d'amélioration",
        paragraphs: [
          "Le protocole doit tenir compte de la saisonnalité, des chocs exogènes et des changements de périmètre.",
        ],
      },
      sharedExecutionSection,
    ],
  },
  {
    id: 28,
    query: "logiciel planification personnel logistique",
    slug: "logiciel-planification-personnel-logistique",
    title: "Logiciel de planification du personnel logistique: guide d'achat",
    intent: "Achat",
    description:
      "Buyer guide pour choisir un logiciel de planification du personnel logistique selon besoins réels et niveau de maturité.",
    openingSnippet:
      "La bonne solution n'est pas celle qui promet tout, mais celle qui couvre les usages critiques de votre contexte.",
    asset: {
      type: "comparatif",
      title: "Checklist d'achat + grille de scoring",
      description:
        "Critères fonctionnels, techniques et économiques avec pondération prête à l'emploi.",
    },
    sections: [
      {
        title: "Comparer des catégories, pas seulement des marques",
        paragraphs: [
          "Le comparatif distingue planification terrain, WFM, BI et couche d'intelligence de couverture décisionnelle.",
        ],
      },
      sharedExecutionSection,
    ],
  },
  {
    id: 29,
    query: "logiciel workforce management WFM logistique",
    slug: "wfm-logistique",
    title: "WFM logistique: ce que ça couvre, ce que ça ne couvre pas",
    intent: "Achat",
    description:
      "Comprendre le périmètre réel des outils WFM en logistique et leur complémentarité avec une couche de décision de couverture.",
    openingSnippet:
      "Le WFM structure l'exécution de planning; la décision de couverture exige une lecture économique complémentaire.",
    asset: {
      type: "comparatif",
      title: "Matrice WFM vs intelligence de couverture",
      description:
        "Comparatif usages, limites et conditions de succès par contexte opérationnel.",
    },
    sections: [
      {
        title: "Où le WFM excelle, où il faut compléter",
        paragraphs: [
          "Le guide explicite les zones de couverture du WFM et les décisions qu'il ne structure pas nativement.",
        ],
      },
      sharedExecutionSection,
    ],
  },
  {
    id: 30,
    query: "taux de service logistique calcul",
    slug: "taux-de-service-logistique",
    title: "Taux de service logistique: calcul, variantes et lien staffing",
    intent: "Info",
    description:
      "Calculer correctement le taux de service logistique et le relier aux décisions de staffing/couverture.",
    openingSnippet:
      "Un taux de service utile n'est pas un KPI isolé: il guide des arbitrages d'effectifs mesurables.",
    asset: {
      type: "calculateur",
      title: "Calculateur taux de service + staffing",
      description:
        "Modèle combinant mesure de service et hypothèses de couverture.",
    },
    sections: [
      {
        title: "Relier service et couverture",
        paragraphs: [
          "Le pilotage doit visualiser l'impact d'un choix de couverture sur le niveau de service attendu.",
        ],
      },
      sharedExecutionSection,
    ],
  },
] as const;
