export interface PipelinePhase {
  id: string;
  title: string;
  description: string;
  capabilities: string[];
  callout?: string;
  calloutVariant?: "info" | "critical";
}

export const pipelinePhases: PipelinePhase[] = [
  {
    id: "standardisation",
    title: "Volatilité de charge",
    description:
      "Anticiper les pics ponctuels qui déséquilibrent les équipes et déclenchent des arbitrages en urgence.",
    capabilities: [
      "Lecture hebdomadaire des tendances par site",
      "Signal d'alerte en amont des pics",
      "Recommandations d'options selon criticité",
      "Hypothèses explicites pour validation managériale",
    ],
  },
  {
    id: "predictions",
    title: "Absentéisme et dérive de couverture",
    description:
      "Identifier les zones de fragilité structurelle et éviter les plans de dernière minute coûteux.",
    capabilities: [
      "Analyse des motifs récurrents de sous-couverture",
      "Hiérarchisation des zones les plus exposées",
      "Fenêtres d'action 3, 7 et 14 jours",
      "Vision consolidée direction opérations",
    ],
    callout:
      "Aucune donnée individuelle n'est nécessaire: la lecture se fait au niveau équipe et site.",
    calloutVariant: "info",
  },
  {
    id: "notifications",
    title: "Arbitrages inter-sites",
    description:
      "Comparer les scénarios de réallocation, renfort et priorisation en coût, risque et impact de service.",
    capabilities: [
      "Comparaison d'options en logique portefeuille",
      "Arbitrage coût direct vs coût de non-action",
      "Cadre de décision partagé COO/DAF",
      "Documentation standardisée des choix",
    ],
    callout:
      "Praedixa ne décide pas à votre place: la plateforme structure les options et clarifie les conséquences.",
    calloutVariant: "critical",
  },
  {
    id: "kpis",
    title: "Boucle ROI et gouvernance",
    description:
      "Mesurer l'effet des décisions pour renforcer la qualité des cycles futurs et crédibiliser les arbitrages.",
    capabilities: [
      "Journal de décisions exploitable en revue mensuelle",
      "Mesure avant/après sur couverture et coûts",
      "Traçabilité pour audit interne",
      "Amélioration continue du cadre d'arbitrage",
    ],
  },
];
