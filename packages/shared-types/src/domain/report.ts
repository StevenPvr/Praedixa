// Report types — weekly summaries, accuracy, cost analysis, proof packs

import type { UUID, ISODateString } from "../utils/common";

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
  captureRate?: number;
  bauMethodVersion?: string;
  attributionConfidence?: number;
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
