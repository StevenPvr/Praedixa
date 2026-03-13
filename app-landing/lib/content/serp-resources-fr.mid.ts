import {
  sharedExecutionSection,
  type SerpResourceEntry,
} from "./serp-resources-fr.shared";

export const serpResourceTargetsFrMid: readonly SerpResourceEntry[] = [
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
];
