export type DemoViewId =
  | "dashboard"
  | "forecasts"
  | "actions"
  | "datasets"
  | "settings";

export type DemoRiskLevel = "low" | "medium" | "high";

export type DemoStatus = "healthy" | "degraded" | "critical";

export interface DemoKpiCard {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down" | "steady";
}

export interface DemoAlert {
  id: string;
  title: string;
  site: string;
  risk: DemoRiskLevel;
  eta: string;
  recommendation: string;
}

export interface DemoForecastPoint {
  day: string;
  predictedCoverage: number;
  requiredCoverage: number;
  risk: DemoRiskLevel;
}

export interface DemoDecision {
  id: string;
  title: string;
  impact: string;
  costBand: string;
  confidence: number;
}

export interface DemoDatasetHealth {
  id: string;
  name: string;
  status: DemoStatus;
  freshnessMinutes: number;
  records: number;
  lastSync: string;
}

export interface DemoActionItem {
  id: string;
  action: string;
  owner: string;
  site: string;
  dueInHours: number;
  status: "planned" | "in_progress" | "completed";
}

export interface DemoGovernanceItem {
  id: string;
  title: string;
  description: string;
}

export interface DemoDashboardPayload {
  kpis: DemoKpiCard[];
  alerts: DemoAlert[];
  decisions: DemoDecision[];
}

export interface DemoForecastsPayload {
  points: DemoForecastPoint[];
  confidenceWindow: string;
}

export interface DemoActionsPayload {
  actions: DemoActionItem[];
}

export interface DemoDatasetsPayload {
  datasets: DemoDatasetHealth[];
}

export interface DemoSettingsPayload {
  governance: DemoGovernanceItem[];
}

export interface DemoMockResponse<T> {
  data: T;
  generatedAt: string;
}
