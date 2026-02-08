// Report types — weekly summaries, accuracy, cost analysis, proof packs

import type { UUID, ISODateString } from "../utils/common";
import type { AlertHorizon } from "./coverage-alert";

/** Weekly operational summary */
export interface WeeklySummary {
  weekStart: ISODateString;
  weekEnd: ISODateString;
  totalAlerts: number;
  alertsResolved: number;
  alertsPending: number;
  totalCostEur: number;
  avgServicePct: number;
  topSites: { siteId: string; alertCount: number; costEur: number }[];
}

/** Single forecast-vs-actual data point */
export interface ForecastAccuracyPoint {
  date: ISODateString;
  predicted: number;
  actual: number;
  error: number;
  horizon: AlertHorizon;
}

/** Cost analysis over a period */
export interface CostAnalysis {
  period: { from: ISODateString; to: ISODateString };
  /** Business-as-usual cost */
  totalBauEur: number;
  /** Cost if 100 % coverage */
  total100Eur: number;
  /** Actual cost realised */
  totalReelEur: number;
  /** Net gain: BAU - reel */
  gainNetEur: number;
  breakdown: WaterfallComponent[];
}

/** Single bar in a waterfall chart */
export interface WaterfallComponent {
  label: string;
  value: number;
  type: "positive" | "negative" | "total";
}

/** Monthly proof-of-value pack per site */
export interface ProofPack {
  id: UUID;
  siteId: string;
  month: ISODateString;
  coutBauEur: number;
  cout100Eur: number;
  coutReelEur: number;
  gainNetEur: number;
  serviceBauPct?: number;
  serviceReelPct?: number;
  adoptionPct?: number;
  alertesEmises: number;
  alertesTraitees: number;
}

/** Aggregated proof-pack summary across sites */
export interface ProofPackSummary {
  totalGainNetEur: number;
  avgAdoptionPct: number | null;
  totalAlertesEmises: number;
  totalAlertesTraitees: number;
  records: ProofPack[];
}
