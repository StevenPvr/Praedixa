export type SerpIntent =
  | "Info"
  | "Info/Decision"
  | "Decision"
  | "Tool"
  | "Achat"
  | "Commercial/Decision";

export type SerpSchemaType = "Article" | "WebPage";

export interface SerpResourceAsset {
  title: string;
  description: string;
  type: "calculateur" | "template" | "playbook" | "comparatif" | "guide";
}

export interface SerpResourceEntry {
  id: number;
  query: string;
  slug: string;
  title: string;
  intent: SerpIntent;
  description: string;
  openingSnippet: string;
  asset: SerpResourceAsset;
  sections: Array<{
    title: string;
    paragraphs: string[];
    bullets?: string[];
  }>;
}

const sharedExecutionSection = {
  title: "Application opérationnelle Praedixa",
  paragraphs: [
    "La page applique le même cadre: signal early-warning 3 à 14 jours, facteurs explicatifs lisibles, arbitrage économique chiffré, et journal des décisions.",
    "L'objectif est d'outiller la revue Ops/DAF avec une méthode actionnable, pas un contenu éditorial abstrait.",
  ],
};

export const serpResourceTargetsFr: readonly SerpResourceEntry[] = [
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
  {
    id: 11,
    query: "calcul besoin en effectifs entrepôt",
    slug: "calcul-besoin-effectifs-entrepot",
    title: "Calcul besoin en effectifs entrepôt: méthode FTE opérationnelle",
    intent: "Tool",
    description:
      "Calculer le besoin en effectifs (FTE) avec hypothèses transparentes et lecture décisionnelle par zone.",
    openingSnippet:
      "Le besoin FTE devient actionnable quand les hypothèses et les limites sont visibles dès le calcul.",
    asset: {
      type: "calculateur",
      title: "Calculateur FTE avec export",
      description:
        "Saisie simplifiée + export Excel pour diffusion en comité de pilotage.",
    },
    sections: [
      {
        title: "Décomposer le besoin FTE",
        paragraphs: [
          "Découper par activité, créneau et criticité permet d'éviter les arbitrages globaux trop imprécis.",
        ],
      },
      sharedExecutionSection,
    ],
  },
  {
    id: 12,
    query: "prévision charge de travail entrepôt",
    slug: "prevision-charge-travail-entrepot",
    title:
      "Prévision de charge de travail entrepôt: saisonnalité, pics et fiabilité",
    intent: "Info",
    description:
      "Construire une prévision de charge exploitable en entrepôt et la relier aux décisions de couverture.",
    openingSnippet:
      "Une prévision utile ne cherche pas à être parfaite: elle doit réduire l'incertitude décisionnelle.",
    asset: {
      type: "guide",
      title: "Dataset d'exemple prêt à analyser",
      description:
        "Jeu de données pédagogique pour tester la méthode charge/capacité.",
    },
    sections: [
      {
        title: "Prévision et décisions de renfort",
        paragraphs: [
          "La valeur business vient du lien entre prévision, alternatives de renfort et coût attendu de chaque option.",
        ],
      },
      sharedExecutionSection,
    ],
  },
  {
    id: 13,
    query: "capacity planning logistique",
    slug: "capacity-planning-logistique",
    title: "Capacity planning logistique: horizon, méthode et gouvernance",
    intent: "Info",
    description:
      "Cadre complet de capacity planning logistique pour anticiper les tensions et prioriser les actions.",
    openingSnippet:
      "Le capacity planning utile est un système de décision continue, pas un exercice ponctuel.",
    asset: {
      type: "playbook",
      title: "Template de revue capacité",
      description:
        "Cadence, indicateurs, seuils et décisions types pour comité de pilotage.",
    },
    sections: [
      {
        title: "Choisir l'horizon de planification",
        paragraphs: [
          "Le bon horizon combine réactivité terrain (J+3/J+7) et visibilité managériale (S+2/S+4).",
        ],
      },
      sharedExecutionSection,
    ],
  },
  {
    id: 14,
    query: "workforce planning multi-sites",
    slug: "workforce-planning-multi-sites",
    title: "Workforce planning multi-sites: centraliser sans perdre le terrain",
    intent: "Info/Decision",
    description:
      "Approche workforce planning multi-sites conciliant gouvernance centrale et réalité opérationnelle locale.",
    openingSnippet:
      "Le défi multi-sites n'est pas de centraliser tout, mais de standardiser la décision sans rigidifier l'exécution.",
    asset: {
      type: "playbook",
      title: "Playbook de gouvernance multi-sites",
      description:
        "Rôles, responsabilités, rituels et KPI partagés entre siège et sites.",
    },
    sections: [
      {
        title: "Aligner central et local",
        paragraphs: [
          "Un cadre commun de criticité et de coûts évite les arbitrages contradictoires entre sites.",
        ],
      },
      sharedExecutionSection,
    ],
  },
  {
    id: 15,
    query: "réallocation inter-sites effectifs",
    slug: "reallocation-inter-sites-effectifs",
    title: "Réallocation inter-sites des effectifs: heuristiques et garde-fous",
    intent: "Decision",
    description:
      "Méthode pour réallouer les effectifs entre sites avec critères explicites et risques maîtrisés.",
    openingSnippet:
      "La réallocation inter-sites est performante si la décision repose sur des règles claires et partagées.",
    asset: {
      type: "template",
      title: "Matrice décisionnelle de réallocation",
      description:
        "Quand déclencher, comment prioriser et quels garde-fous appliquer.",
    },
    sections: [
      {
        title: "Décider vite sans créer d'effets secondaires",
        paragraphs: [
          "Le protocole de réallocation doit intégrer coût, impact service et stabilité opérationnelle.",
        ],
      },
      sharedExecutionSection,
    ],
  },
  {
    id: 16,
    query: "coût de la sous-couverture",
    slug: "cout-sous-couverture",
    title: "Coût de la sous-couverture: méthode DAF et calcul opérationnel",
    intent: "Decision",
    description:
      "Calculer le coût total de la sous-couverture (direct + indirect) pour arbitrer les actions avec un cadre finance-friendly.",
    openingSnippet:
      "Le coût de la sous-couverture inclut les dépenses d'urgence et la valeur perdue par dégradation de service.",
    asset: {
      type: "calculateur",
      title: "Calculateur du coût de l'inaction",
      description:
        "Modèle multi-sites pour comparer coût d'attente vs coût d'action.",
    },
    sections: [
      {
        title: "Structure de coût complète",
        paragraphs: [
          "Le cadre sépare coûts directs, coûts cachés et coûts évitables selon horizon de décision.",
        ],
        bullets: [
          "Coûts directs: HS, intérim, transport, pénalités",
          "Coûts indirects: qualité, retards, turnover",
          "Coûts d'opportunité: perte de capacité commerciale",
        ],
      },
      sharedExecutionSection,
    ],
  },
  {
    id: 17,
    query: "coût du sous-effectif",
    slug: "cout-sous-effectif",
    title: "Coût du sous-effectif: direct, indirect et évitable",
    intent: "Info/Decision",
    description:
      "Quantifier le coût du sous-effectif et prioriser les leviers qui réduisent vraiment l'impact économique.",
    openingSnippet:
      "Le sous-effectif coûte plus que des heures d'urgence: il détériore durablement performance et fiabilité.",
    asset: {
      type: "guide",
      title: "Tableau des rubriques de coûts",
      description:
        "Structure prête à l'emploi pour cadrer un chiffrage standardisé.",
    },
    sections: [
      {
        title: "Isoler les coûts évitables",
        paragraphs: [
          "Distinguer ce qui est structurel de ce qui est évitable permet de cibler les actions à ROI rapide.",
        ],
      },
      sharedExecutionSection,
    ],
  },
  {
    id: 18,
    query: "coût de l'intérim d'urgence",
    slug: "cout-interim-urgence",
    title: "Coût de l'intérim d'urgence: comparer urgence et anticipation",
    intent: "Decision",
    description:
      "Comparer précisément le coût de l'intérim d'urgence à des options anticipées pour sécuriser la marge.",
    openingSnippet:
      "L'intérim d'urgence est utile mais souvent surcoûté faute d'anticipation et de règles d'usage.",
    asset: {
      type: "calculateur",
      title: "Simulateur intérim urgence vs anticipé",
      description:
        "Comparer scénarios de renfort selon délai, coût et impact opérationnel.",
    },
    sections: [
      {
        title: "Quand l'urgence devient systémique",
        paragraphs: [
          "L'enjeu n'est pas de supprimer l'urgence, mais d'en réduire la fréquence et le coût unitaire.",
        ],
      },
      sharedExecutionSection,
    ],
  },
  {
    id: 19,
    query: "coût des heures supplémentaires entreprise",
    slug: "cout-heures-supplementaires",
    title: "Coût des heures supplémentaires: calcul complet en entreprise",
    intent: "Info/Decision",
    description:
      "Calculer le coût total des heures supplémentaires et les intégrer correctement dans l'arbitrage de couverture.",
    openingSnippet:
      "Le coût réel des heures supplémentaires dépasse la majoration horaire affichée.",
    asset: {
      type: "calculateur",
      title: "Calculateur coût total HS",
      description:
        "Modèle incluant majorations, charges et effets de récurrence.",
    },
    sections: [
      {
        title: "Lecture économique des HS",
        paragraphs: [
          "Le pilotage doit distinguer usage tactique ponctuel et dérive structurelle coûteuse.",
        ],
      },
      sharedExecutionSection,
    ],
  },
  {
    id: 20,
    query: "arbitrage intérim vs heures supplémentaires",
    slug: "arbitrage-interim-vs-heures-supp",
    title: "Arbitrage intérim vs heures supplémentaires: modèle économique",
    intent: "Decision",
    description:
      "Arbitrer entre intérim et heures supplémentaires avec un modèle décisionnel fondé sur coût, risque et continuité.",
    openingSnippet:
      "Le bon arbitrage dépend du contexte de criticité, de disponibilité et de coût marginal.",
    asset: {
      type: "calculateur",
      title: "Comparateur HS vs intérim",
      description:
        "Arbre de décision et simulateur de coût pour chaque scénario.",
    },
    sections: [
      {
        title: "Comparer des options réellement comparables",
        paragraphs: [
          "La comparaison doit intégrer qualité, fatigue opérationnelle, SLA et marge de manœuvre future.",
        ],
      },
      sharedExecutionSection,
    ],
  },
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

const SERP_SCHEMA_TYPE_BY_ID: Partial<Record<number, SerpSchemaType>> = {
  11: "WebPage",
};

const SERP_PRIMARY_CTA_BY_ID: Record<number, string> = {
  1: "Telecharger la checklist diagnostic",
  2: "Voir un exemple de carte des risques",
  3: "Telecharger le template de revue hebdo",
  4: "Telecharger le modele capacite/charge",
  5: "Lancer le calculateur de couverture",
  6: "Tester le mini-diagnostic early-warning",
  7: "Obtenir la checklist de scoring",
  8: "Telecharger le modele de carte des risques",
  9: "Telecharger la checklist revue planning",
  10: "Ouvrir le simulateur FTE",
  11: "Lancer le calculateur FTE",
  12: "Telecharger le dataset d'exemple",
  13: "Telecharger le template revue capacite",
  14: "Telecharger le playbook multi-sites",
  15: "Telecharger la matrice de decision",
  16: "Calculer le cout de l'inaction",
  17: "Telecharger le tableau de couts",
  18: "Lancer le simulateur interim vs anticipe",
  19: "Lancer le calculateur heures sup",
  20: "Telecharger l'arbre de decision",
  21: "Telecharger le template absenteisme",
  22: "Lancer le calculateur turnover",
  23: "Telecharger le template revue Ops/DAF",
  24: "Calculer le cout de l'inaction logistique",
  25: "Telecharger le pack playbook",
  26: "Telecharger le template decision log",
  27: "Telecharger le toolkit avant/apres",
  28: "Telecharger la grille de scoring achat",
  29: "Telecharger la checklist WFM",
  30: "Telecharger le template KPI service",
};

const SERP_INTERNAL_LINK_GRAPH_BY_ID: Record<number, number[]> = {
  1: [4, 5, 16],
  2: [6, 10, 20],
  3: [1, 6, 25],
  4: [10, 11, 12],
  5: [1, 6, 16],
  6: [8, 20, 26],
  7: [6, 21, 25],
  8: [6, 25, 26],
  9: [13, 14, 28],
  10: [11, 12, 16],
  11: [10, 20, 24],
  12: [6, 10, 13],
  13: [9, 14, 23],
  14: [15, 26, 23],
  15: [20, 23, 14],
  16: [24, 23, 26],
  17: [21, 22, 20],
  18: [6, 20, 24],
  19: [20, 23, 16],
  20: [18, 19, 15],
  21: [6, 7, 27],
  22: [27, 16, 25],
  23: [26, 24, 30],
  24: [16, 23, 26],
  25: [3, 7, 20],
  26: [27, 24, 6],
  27: [26, 23, 16],
  28: [29, 9, 14],
  29: [28, 26, 6],
  30: [23, 16, 5],
};

const SERP_RESOURCES_BY_ID = new Map(
  serpResourceTargetsFr.map((entry) => [entry.id, entry]),
);

function fallbackRelatedResources(
  current: SerpResourceEntry,
  take: number,
): SerpResourceEntry[] {
  return serpResourceTargetsFr
    .filter((entry) => entry.slug !== current.slug)
    .slice(Math.max(0, current.id - 2), Math.max(0, current.id - 2) + take);
}

export function getSerpResourceBySlug(
  slug: string,
): SerpResourceEntry | undefined {
  return serpResourceTargetsFr.find((entry) => entry.slug === slug);
}

export function getSerpResourceSlugs(): string[] {
  return serpResourceTargetsFr.map((entry) => entry.slug);
}

export function getSerpResourceSchemaType(slug: string): SerpSchemaType {
  const entry = getSerpResourceBySlug(slug);
  if (!entry) return "Article";
  return SERP_SCHEMA_TYPE_BY_ID[entry.id] ?? "Article";
}

export function getSerpResourcePrimaryCta(slug: string): string {
  const entry = getSerpResourceBySlug(slug);
  if (!entry) return "Demander un pilote prevision effectifs";
  return (
    SERP_PRIMARY_CTA_BY_ID[entry.id] ?? "Demander un pilote prevision effectifs"
  );
}

export function getSerpResourceInternalLinks(
  slug: string,
  take = 3,
): SerpResourceEntry[] {
  const current = getSerpResourceBySlug(slug);
  if (!current) return [];

  const linkedIds = SERP_INTERNAL_LINK_GRAPH_BY_ID[current.id] ?? [];
  const linkedEntries = linkedIds
    .map((id) => SERP_RESOURCES_BY_ID.get(id))
    .filter((entry): entry is SerpResourceEntry => Boolean(entry))
    .filter((entry) => entry.slug !== slug);

  if (linkedEntries.length > 0) {
    return linkedEntries.slice(0, take);
  }

  return fallbackRelatedResources(current, take);
}

export function getRelatedSerpResources(
  slug: string,
  take = 3,
): SerpResourceEntry[] {
  return getSerpResourceInternalLinks(slug, take);
}
