import type {
  DemoActionItem,
  DemoAlert,
  DemoDatasetHealth,
  DemoDecision,
  DemoForecastPoint,
  DemoGovernanceItem,
  DemoKpiCard,
} from "./types";

export const MOCK_GENERATED_AT = "2026-02-20T09:18:00.000Z";

export const MOCK_KPIS: DemoKpiCard[] = [
  {
    id: "kpi-risk-zones",
    label: "Zones de risque actives",
    value: "14",
    delta: "-3 vs. semaine passée",
    trend: "down",
  },
  {
    id: "kpi-covered-hours",
    label: "Heures couvertes à horizon 7j",
    value: "92.4%",
    delta: "+1.8 pts",
    trend: "up",
  },
  {
    id: "kpi-arbitrages",
    label: "Arbitrages validés",
    value: "27",
    delta: "5 en attente de revue",
    trend: "steady",
  },
  {
    id: "kpi-cost-avoidance",
    label: "Coût évité estimé",
    value: "€184k",
    delta: "Projection trimestrielle",
    trend: "up",
  },
];

export const MOCK_ALERTS: DemoAlert[] = [
  {
    id: "alert-lyon-matin",
    title: "Sous-couverture probable équipe matin",
    site: "Lyon",
    risk: "high",
    eta: "J+1 06:00",
    recommendation: "Déployer option renfort A + rebalancing intra-site",
  },
  {
    id: "alert-lille-weekend",
    title: "Risque de dérive weekend logistique",
    site: "Lille",
    risk: "medium",
    eta: "J+3 04:00",
    recommendation: "Pré-activer vivier pool B et limiter overtime",
  },
  {
    id: "alert-nantes-retour",
    title: "Retour capacité sous seuil nominal",
    site: "Nantes",
    risk: "low",
    eta: "J+2 14:00",
    recommendation: "Maintenir surveillance sans action immédiate",
  },
];

export const MOCK_FORECAST_POINTS: DemoForecastPoint[] = [
  { day: "Lun", predictedCoverage: 94, requiredCoverage: 96, risk: "medium" },
  { day: "Mar", predictedCoverage: 95, requiredCoverage: 95, risk: "low" },
  { day: "Mer", predictedCoverage: 91, requiredCoverage: 96, risk: "high" },
  { day: "Jeu", predictedCoverage: 93, requiredCoverage: 95, risk: "medium" },
  { day: "Ven", predictedCoverage: 96, requiredCoverage: 95, risk: "low" },
  { day: "Sam", predictedCoverage: 89, requiredCoverage: 93, risk: "high" },
  { day: "Dim", predictedCoverage: 92, requiredCoverage: 92, risk: "low" },
];

export const MOCK_DECISIONS: DemoDecision[] = [
  {
    id: "decision-1",
    title: "Option A - Réaffectation inter-site ciblée",
    impact: "Risque -18% sur 72h",
    costBand: "€€",
    confidence: 88,
  },
  {
    id: "decision-2",
    title: "Option B - Renfort externe limité",
    impact: "Risque -25% sur 72h",
    costBand: "€€€",
    confidence: 81,
  },
  {
    id: "decision-3",
    title: "Option C - Ajustement planification locale",
    impact: "Risque -11% sur 48h",
    costBand: "€",
    confidence: 76,
  },
];

export const MOCK_DATASETS: DemoDatasetHealth[] = [
  {
    id: "dataset-capacity",
    name: "Capacity snapshots",
    status: "healthy",
    freshnessMinutes: 12,
    records: 18422,
    lastSync: "09:06",
  },
  {
    id: "dataset-absences",
    name: "Absence events",
    status: "degraded",
    freshnessMinutes: 64,
    records: 3921,
    lastSync: "08:14",
  },
  {
    id: "dataset-workload",
    name: "Workload signals",
    status: "healthy",
    freshnessMinutes: 8,
    records: 27418,
    lastSync: "09:10",
  },
  {
    id: "dataset-actions",
    name: "Action outcomes",
    status: "critical",
    freshnessMinutes: 181,
    records: 1187,
    lastSync: "06:09",
  },
];

export const MOCK_ACTIONS: DemoActionItem[] = [
  {
    id: "action-1",
    action: "Activer renfort pool A",
    owner: "Ops Lyon",
    site: "Lyon",
    dueInHours: 6,
    status: "in_progress",
  },
  {
    id: "action-2",
    action: "Revue arbitrage CFO/COO",
    owner: "Comité central",
    site: "Paris HQ",
    dueInHours: 18,
    status: "planned",
  },
  {
    id: "action-3",
    action: "Valider fenêtre overtime maîtrisée",
    owner: "Ops Lille",
    site: "Lille",
    dueInHours: 30,
    status: "planned",
  },
  {
    id: "action-4",
    action: "Boucler preuve d'impact semaine N-1",
    owner: "PMO Ops",
    site: "Nantes",
    dueInHours: 3,
    status: "completed",
  },
];

export const MOCK_GOVERNANCE: DemoGovernanceItem[] = [
  {
    id: "gov-1",
    title: "Revue hebdomadaire COO / Finance",
    description:
      "Validation des arbitrages et des hypothèses de coût de non-action.",
  },
  {
    id: "gov-2",
    title: "Journal de décisions auditable",
    description:
      "Traçabilité complète des décisions, motifs, options et impacts.",
  },
  {
    id: "gov-3",
    title: "Cadence d'amélioration continue",
    description: "Révision des seuils et calibrations toutes les 2 semaines.",
  },
];
