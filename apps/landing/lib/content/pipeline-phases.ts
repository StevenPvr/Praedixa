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
    title: "Ingestion des données existantes",
    description:
      "On ingère vos exports existants, sans intégration lourde. Praedixa standardise et fiabilise progressivement vos données de capacité et de charge.",
    capabilities: [
      "Imports multi-formats (CSV, Excel, exports métier)",
      "Réconciliation automatique des sources",
      "Qualité des données monitorée en continu",
      "Base fiable pour la détection de sous-couverture",
    ],
  },
  {
    id: "predictions",
    title: "Prédiction de sous-couverture à 3, 7 et 14 jours",
    description:
      "Modèles prédictifs pour estimer le risque de sous-couverture par site, équipe et compétence. Early-warning opérationnel.",
    capabilities: [
      "Risque de sous-couverture par site et compétence",
      "Horizons courts : 3, 7 et 14 jours — vous choisissez",
      "Écart capacité vs charge anticipé",
      "Détection des trous semaines à l'avance",
    ],
    callout:
      "Toutes les prédictions sont agrégées au niveau équipe ou site. Aucune prédiction individuelle. Conformité RGPD native.",
    calloutVariant: "info",
  },
  {
    id: "notifications",
    title: "Arbitrage économique : coût de l'inaction vs options",
    description:
      "Quand un risque est détecté, Praedixa chiffre le coût de l'inaction et propose un playbook d'actions évaluées économiquement.",
    capabilities: [
      "Playbook d'actions : HS, intérim, réallocation, priorisation",
      "Acceptation contrôlée d'une dégradation de service",
      "Chaque option chiffrée avec son impact économique",
      "Décision traçable avec audit trail",
    ],
    callout:
      "Praedixa ne donne pas de conseil. Praedixa présente des options avec leur impact économique chiffré. La décision reste entièrement celle de l'entreprise.",
    calloutVariant: "critical",
  },
  {
    id: "kpis",
    title: "Preuve d'impact : mesure avant/après",
    description:
      "Après chaque décision, Praedixa logge l'action et mesure l'impact réel. Preuve économique auditable pour CODIR et DAF.",
    capabilities: [
      "Décision log : chaque arbitrage est tracé",
      "Mesure avant/après avec rigueur mathématique",
      "Preuve économique auditable pour CODIR et DAF",
      "Boucle de feedback pour affiner les prédictions",
    ],
  },
];
