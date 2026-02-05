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
    title: "Standardisation & affinage continu",
    description:
      "Vos données terrain sont rarement propres. Praedixa les standardise progressivement. C'est un processus de maturation qui s'améliore dans le temps.",
    capabilities: [
      "Imports multi-formats (CSV, Excel, exports SIRH)",
      "Réconciliation automatique des sources",
      "Qualité des données monitorée en continu",
      "Base fiable pour les prédictions",
    ],
  },
  {
    id: "predictions",
    title: "Prédictions par machine learning et économétrie",
    description:
      "Modèles prédictifs pour estimer les risques de sous-couverture à J+7, J+14, J+30+.",
    capabilities: [
      "Prédiction absences et turnover (agrégé, anonyme)",
      "Prédiction demande client",
      "Prédiction capacité fournisseurs",
      "Détection des problèmes semaines à l'avance",
    ],
    callout:
      "Toutes les prédictions sont agrégées au niveau équipe ou site. Aucune prédiction individuelle. Conformité RGPD native.",
    calloutVariant: "info",
  },
  {
    id: "notifications",
    title: "Notifications informatives : les options, pas les ordres",
    description:
      "Quand un écart est détecté, Praedixa génère des notifications présentant les options possibles, évaluées économiquement sous contraintes réelles.",
    capabilities: [
      "Optimisation mathématique sous contraintes",
      "Réallocation inter-sites",
      "Arbitrage HS / intérim / dégradation de service",
      "Chaque option chiffrée avec son impact économique",
    ],
    callout:
      "Praedixa ne donne pas de conseil. Praedixa présente des options avec leur impact économique chiffré. La décision reste entièrement celle de l'entreprise.",
    calloutVariant: "critical",
  },
  {
    id: "kpis",
    title: "Suivi des gains réalisés et KPIs économiques",
    description:
      "Après chaque action, Praedixa mesure l'impact réel avec rigueur mathématique. Preuve auditable pour CODIR et DAF.",
    capabilities: [
      "Suivi gains réalisés vs prévisions",
      "KPIs économiques continus",
      "Preuve auditable pour CODIR et DAF",
      "Boucle de feedback pour améliorer les prédictions",
    ],
  },
];
