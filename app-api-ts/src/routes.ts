import { demo } from "./mock-data.js";
import { paginated, success } from "./response.js";
import { route } from "./router.js";
import type { RouteContext, RouteDefinition } from "./types.js";

const ORGANIZATION_ID = "11111111-1111-1111-1111-111111111111";
const NOW = new Date();
const DAY_MS = 24 * 60 * 60 * 1000;

function isoDateOffset(days: number): string {
  return new Date(NOW.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

function isoDateTimeOffset(days: number, hours = 0): string {
  return new Date(
    NOW.getTime() + days * DAY_MS + hours * 60 * 60 * 1000,
  ).toISOString();
}

type CoverageAlertRecord = {
  id: string;
  organizationId: string;
  siteId: string;
  alertDate: string;
  shift: "am" | "pm";
  horizon: "j3" | "j7" | "j14";
  pRupture: number;
  gapH: number;
  predictionIntervalLow?: number;
  predictionIntervalHigh?: number;
  modelVersion?: string;
  calibrationBucket?: string;
  impactEur?: number;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "acknowledged" | "resolved" | "expired";
  driversJson: string[];
  acknowledgedAt?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
};

type DecisionQueueRecord = {
  id: string;
  siteId: string;
  alertDate: string;
  shift: "am" | "pm";
  severity: "low" | "medium" | "high" | "critical";
  horizon: "j3" | "j7" | "j14";
  gapH: number;
  pRupture: number;
  driversJson: string[];
  priorityScore: number;
  estimatedImpactEur: number;
  timeToBreachHours: number;
};

type CanonicalRecord = {
  id: string;
  organizationId: string;
  siteId: string;
  date: string;
  shift: "am" | "pm";
  chargeUnits: number;
  capacitePlanH: number;
  realiseH: number;
  absH: number;
  hsH: number;
  interimH: number;
  backlogH: number;
  safetyIncidents: number;
  qualityBlocking: number;
  coutInterneEst: number;
  createdAt: string;
  updatedAt: string;
};

type GoldRowRecord = {
  client_slug: string;
  site_id: string;
  site_code: string;
  date: string;
  shift: "am" | "pm";
  model_version: string;
  load_hours: number;
  capacity_hours: number;
  abs_h: number;
  hs_h: number;
  interim_h: number;
  gap_h: number;
  risk_score: number;
  has_alert: boolean;
};

type DailyForecastRecord = {
  forecastDate: string;
  dimension: string;
  siteId: string;
  predictedDemand: number;
  predictedCapacity: number;
  capacityPlannedCurrent: number;
  capacityPlannedPredicted: number;
  capacityOptimalPredicted: number;
  gap: number;
  riskScore: number;
  confidenceLower: number;
  confidenceUpper: number;
};

type MlMonitoringPoint = {
  date: string;
  mapePct: number;
  dataDriftScore: number;
  conceptDriftScore: number;
  featureCoveragePct: number;
  inferenceLatencyMs: number;
  retrainRecommended: boolean;
};

type ProofPackRecord = {
  id: string;
  siteId: string;
  month: string;
  coutBauEur: number;
  cout100Eur: number;
  coutReelEur: number;
  gainNetEur: number;
  serviceBauPct: number;
  serviceReelPct: number;
  captureRate: number;
  bauMethodVersion: string;
  attributionConfidence: number;
  adoptionPct: number;
  alertesEmises: number;
  alertesTraitees: number;
};

const COVERAGE_ALERTS: CoverageAlertRecord[] = [
  {
    id: "alt-001",
    organizationId: ORGANIZATION_ID,
    siteId: "site-lyon",
    alertDate: isoDateOffset(0),
    shift: "am",
    horizon: "j3",
    pRupture: 0.86,
    gapH: 14.5,
    predictionIntervalLow: 12.8,
    predictionIntervalHigh: 16.9,
    modelVersion: "sarimax-2.4.1",
    calibrationBucket: "0.8-0.9",
    impactEur: 2350,
    severity: "critical",
    status: "open",
    driversJson: ["pic_activite", "absences_prevues", "turnover"],
    createdAt: isoDateTimeOffset(-1, 7),
    updatedAt: isoDateTimeOffset(0, 8),
  },
  {
    id: "alt-002",
    organizationId: ORGANIZATION_ID,
    siteId: "site-orleans",
    alertDate: isoDateOffset(1),
    shift: "pm",
    horizon: "j7",
    pRupture: 0.68,
    gapH: 9.2,
    predictionIntervalLow: 7.4,
    predictionIntervalHigh: 11.1,
    modelVersion: "sarimax-2.4.1",
    calibrationBucket: "0.6-0.7",
    impactEur: 1420,
    severity: "high",
    status: "open",
    driversJson: ["conges_simultanes", "sous_effectif_chronique"],
    createdAt: isoDateTimeOffset(-2, 10),
    updatedAt: isoDateTimeOffset(0, 7),
  },
  {
    id: "alt-003",
    organizationId: ORGANIZATION_ID,
    siteId: "site-lyon",
    alertDate: isoDateOffset(2),
    shift: "pm",
    horizon: "j14",
    pRupture: 0.42,
    gapH: 4.3,
    impactEur: 540,
    severity: "medium",
    status: "acknowledged",
    acknowledgedAt: isoDateTimeOffset(-1, 15),
    driversJson: ["formation", "absences_prevues"],
    createdAt: isoDateTimeOffset(-4, 11),
    updatedAt: isoDateTimeOffset(-1, 15),
  },
  {
    id: "alt-004",
    organizationId: ORGANIZATION_ID,
    siteId: "site-orleans",
    alertDate: isoDateOffset(-1),
    shift: "am",
    horizon: "j7",
    pRupture: 0.29,
    gapH: 2.1,
    impactEur: 260,
    severity: "low",
    status: "resolved",
    resolvedAt: isoDateTimeOffset(-1, 19),
    driversJson: ["pic_activite"],
    createdAt: isoDateTimeOffset(-3, 9),
    updatedAt: isoDateTimeOffset(-1, 19),
  },
  {
    id: "alt-005",
    organizationId: ORGANIZATION_ID,
    siteId: "site-lyon",
    alertDate: isoDateOffset(-2),
    shift: "pm",
    horizon: "j3",
    pRupture: 0.53,
    gapH: 5.8,
    impactEur: 820,
    severity: "medium",
    status: "expired",
    driversJson: ["meteo", "absence_courte"],
    createdAt: isoDateTimeOffset(-5, 8),
    updatedAt: isoDateTimeOffset(-2, 23),
  },
];

const CANONICAL_ROWS: CanonicalRecord[] = [
  {
    id: "can-lyon-1-am",
    organizationId: ORGANIZATION_ID,
    siteId: "site-lyon",
    date: isoDateOffset(-1),
    shift: "am",
    chargeUnits: 324,
    capacitePlanH: 310,
    realiseH: 305,
    absH: 18,
    hsH: 12,
    interimH: 8,
    backlogH: 7,
    safetyIncidents: 0,
    qualityBlocking: 0,
    coutInterneEst: 6820,
    createdAt: isoDateTimeOffset(-1, 6),
    updatedAt: isoDateTimeOffset(-1, 18),
  },
  {
    id: "can-lyon-1-pm",
    organizationId: ORGANIZATION_ID,
    siteId: "site-lyon",
    date: isoDateOffset(-1),
    shift: "pm",
    chargeUnits: 336,
    capacitePlanH: 314,
    realiseH: 307,
    absH: 21,
    hsH: 16,
    interimH: 9,
    backlogH: 9,
    safetyIncidents: 0,
    qualityBlocking: 1,
    coutInterneEst: 7040,
    createdAt: isoDateTimeOffset(-1, 6),
    updatedAt: isoDateTimeOffset(-1, 18),
  },
  {
    id: "can-lyon-0-am",
    organizationId: ORGANIZATION_ID,
    siteId: "site-lyon",
    date: isoDateOffset(0),
    shift: "am",
    chargeUnits: 342,
    capacitePlanH: 316,
    realiseH: 301,
    absH: 26,
    hsH: 18,
    interimH: 11,
    backlogH: 10,
    safetyIncidents: 1,
    qualityBlocking: 1,
    coutInterneEst: 7410,
    createdAt: isoDateTimeOffset(0, 6),
    updatedAt: isoDateTimeOffset(0, 8),
  },
  {
    id: "can-lyon-0-pm",
    organizationId: ORGANIZATION_ID,
    siteId: "site-lyon",
    date: isoDateOffset(0),
    shift: "pm",
    chargeUnits: 330,
    capacitePlanH: 312,
    realiseH: 299,
    absH: 24,
    hsH: 15,
    interimH: 12,
    backlogH: 8,
    safetyIncidents: 0,
    qualityBlocking: 0,
    coutInterneEst: 7180,
    createdAt: isoDateTimeOffset(0, 6),
    updatedAt: isoDateTimeOffset(0, 8),
  },
  {
    id: "can-orleans-1-am",
    organizationId: ORGANIZATION_ID,
    siteId: "site-orleans",
    date: isoDateOffset(-1),
    shift: "am",
    chargeUnits: 252,
    capacitePlanH: 246,
    realiseH: 241,
    absH: 12,
    hsH: 7,
    interimH: 4,
    backlogH: 3,
    safetyIncidents: 0,
    qualityBlocking: 0,
    coutInterneEst: 5480,
    createdAt: isoDateTimeOffset(-1, 6),
    updatedAt: isoDateTimeOffset(-1, 18),
  },
  {
    id: "can-orleans-1-pm",
    organizationId: ORGANIZATION_ID,
    siteId: "site-orleans",
    date: isoDateOffset(-1),
    shift: "pm",
    chargeUnits: 265,
    capacitePlanH: 250,
    realiseH: 243,
    absH: 15,
    hsH: 8,
    interimH: 6,
    backlogH: 5,
    safetyIncidents: 0,
    qualityBlocking: 0,
    coutInterneEst: 5660,
    createdAt: isoDateTimeOffset(-1, 6),
    updatedAt: isoDateTimeOffset(-1, 18),
  },
  {
    id: "can-orleans-0-am",
    organizationId: ORGANIZATION_ID,
    siteId: "site-orleans",
    date: isoDateOffset(0),
    shift: "am",
    chargeUnits: 270,
    capacitePlanH: 256,
    realiseH: 247,
    absH: 17,
    hsH: 10,
    interimH: 7,
    backlogH: 6,
    safetyIncidents: 0,
    qualityBlocking: 0,
    coutInterneEst: 5880,
    createdAt: isoDateTimeOffset(0, 6),
    updatedAt: isoDateTimeOffset(0, 8),
  },
  {
    id: "can-orleans-0-pm",
    organizationId: ORGANIZATION_ID,
    siteId: "site-orleans",
    date: isoDateOffset(0),
    shift: "pm",
    chargeUnits: 262,
    capacitePlanH: 0,
    realiseH: 238,
    absH: 19,
    hsH: 9,
    interimH: 8,
    backlogH: 7,
    safetyIncidents: 1,
    qualityBlocking: 0,
    coutInterneEst: 5750,
    createdAt: isoDateTimeOffset(0, 6),
    updatedAt: isoDateTimeOffset(0, 8),
  },
];

const GOLD_ROWS: GoldRowRecord[] = CANONICAL_ROWS.map((row) => {
  const isLyon = row.siteId === "site-lyon";
  const siteCode = isLyon ? "LYN" : "ORL";
  return {
    client_slug: "praedixa-demo",
    site_id: row.siteId,
    site_code: siteCode,
    date: row.date,
    shift: row.shift,
    model_version: "sarimax-2.4.1",
    load_hours: row.chargeUnits,
    capacity_hours: row.capacitePlanH,
    abs_h: row.absH,
    hs_h: row.hsH,
    interim_h: row.interimH,
    gap_h: Math.max(0, row.chargeUnits - row.capacitePlanH),
    risk_score:
      row.capacitePlanH <= 0 ? 1 : Number(((row.absH + row.backlogH) / row.capacitePlanH).toFixed(4)),
    has_alert: row.capacitePlanH > 0 && row.chargeUnits > row.capacitePlanH,
  };
});

const FORECAST_DAILY: DailyForecastRecord[] = [
  {
    forecastDate: isoDateOffset(0),
    dimension: "human",
    siteId: "site-lyon",
    predictedDemand: 314,
    predictedCapacity: 298,
    capacityPlannedCurrent: 296,
    capacityPlannedPredicted: 300,
    capacityOptimalPredicted: 312,
    gap: 16,
    riskScore: 0.71,
    confidenceLower: 296,
    confidenceUpper: 329,
  },
  {
    forecastDate: isoDateOffset(1),
    dimension: "human",
    siteId: "site-lyon",
    predictedDemand: 321,
    predictedCapacity: 302,
    capacityPlannedCurrent: 298,
    capacityPlannedPredicted: 304,
    capacityOptimalPredicted: 315,
    gap: 19,
    riskScore: 0.76,
    confidenceLower: 300,
    confidenceUpper: 336,
  },
  {
    forecastDate: isoDateOffset(2),
    dimension: "human",
    siteId: "site-lyon",
    predictedDemand: 309,
    predictedCapacity: 301,
    capacityPlannedCurrent: 297,
    capacityPlannedPredicted: 302,
    capacityOptimalPredicted: 311,
    gap: 8,
    riskScore: 0.58,
    confidenceLower: 292,
    confidenceUpper: 321,
  },
  {
    forecastDate: isoDateOffset(3),
    dimension: "human",
    siteId: "site-lyon",
    predictedDemand: 305,
    predictedCapacity: 304,
    capacityPlannedCurrent: 301,
    capacityPlannedPredicted: 304,
    capacityOptimalPredicted: 309,
    gap: 1,
    riskScore: 0.34,
    confidenceLower: 289,
    confidenceUpper: 318,
  },
  {
    forecastDate: isoDateOffset(4),
    dimension: "human",
    siteId: "site-orleans",
    predictedDemand: 252,
    predictedCapacity: 244,
    capacityPlannedCurrent: 242,
    capacityPlannedPredicted: 245,
    capacityOptimalPredicted: 251,
    gap: 8,
    riskScore: 0.52,
    confidenceLower: 238,
    confidenceUpper: 263,
  },
  {
    forecastDate: isoDateOffset(5),
    dimension: "human",
    siteId: "site-orleans",
    predictedDemand: 246,
    predictedCapacity: 244,
    capacityPlannedCurrent: 241,
    capacityPlannedPredicted: 244,
    capacityOptimalPredicted: 248,
    gap: 2,
    riskScore: 0.27,
    confidenceLower: 234,
    confidenceUpper: 258,
  },
  {
    forecastDate: isoDateOffset(6),
    dimension: "human",
    siteId: "site-orleans",
    predictedDemand: 260,
    predictedCapacity: 245,
    capacityPlannedCurrent: 241,
    capacityPlannedPredicted: 246,
    capacityOptimalPredicted: 255,
    gap: 15,
    riskScore: 0.66,
    confidenceLower: 244,
    confidenceUpper: 273,
  },
  {
    forecastDate: isoDateOffset(0),
    dimension: "merchandise",
    siteId: "site-lyon",
    predictedDemand: 342,
    predictedCapacity: 326,
    capacityPlannedCurrent: 322,
    capacityPlannedPredicted: 329,
    capacityOptimalPredicted: 338,
    gap: 16,
    riskScore: 0.69,
    confidenceLower: 324,
    confidenceUpper: 355,
  },
  {
    forecastDate: isoDateOffset(1),
    dimension: "merchandise",
    siteId: "site-lyon",
    predictedDemand: 351,
    predictedCapacity: 329,
    capacityPlannedCurrent: 323,
    capacityPlannedPredicted: 330,
    capacityOptimalPredicted: 342,
    gap: 22,
    riskScore: 0.81,
    confidenceLower: 332,
    confidenceUpper: 366,
  },
  {
    forecastDate: isoDateOffset(2),
    dimension: "merchandise",
    siteId: "site-orleans",
    predictedDemand: 280,
    predictedCapacity: 266,
    capacityPlannedCurrent: 261,
    capacityPlannedPredicted: 267,
    capacityOptimalPredicted: 276,
    gap: 14,
    riskScore: 0.63,
    confidenceLower: 266,
    confidenceUpper: 292,
  },
  {
    forecastDate: isoDateOffset(3),
    dimension: "merchandise",
    siteId: "site-orleans",
    predictedDemand: 274,
    predictedCapacity: 268,
    capacityPlannedCurrent: 263,
    capacityPlannedPredicted: 268,
    capacityOptimalPredicted: 273,
    gap: 6,
    riskScore: 0.41,
    confidenceLower: 260,
    confidenceUpper: 285,
  },
  {
    forecastDate: isoDateOffset(4),
    dimension: "merchandise",
    siteId: "site-orleans",
    predictedDemand: 268,
    predictedCapacity: 267,
    capacityPlannedCurrent: 263,
    capacityPlannedPredicted: 267,
    capacityOptimalPredicted: 271,
    gap: 1,
    riskScore: 0.19,
    confidenceLower: 255,
    confidenceUpper: 279,
  },
];

const ML_MONITORING_DAILY: MlMonitoringPoint[] = [
  {
    date: isoDateOffset(-6),
    mapePct: 13.2,
    dataDriftScore: 0.31,
    conceptDriftScore: 0.27,
    featureCoveragePct: 97.4,
    inferenceLatencyMs: 122,
    retrainRecommended: false,
  },
  {
    date: isoDateOffset(-5),
    mapePct: 12.8,
    dataDriftScore: 0.29,
    conceptDriftScore: 0.24,
    featureCoveragePct: 97.8,
    inferenceLatencyMs: 118,
    retrainRecommended: false,
  },
  {
    date: isoDateOffset(-4),
    mapePct: 14.1,
    dataDriftScore: 0.36,
    conceptDriftScore: 0.3,
    featureCoveragePct: 96.9,
    inferenceLatencyMs: 126,
    retrainRecommended: false,
  },
  {
    date: isoDateOffset(-3),
    mapePct: 14.9,
    dataDriftScore: 0.44,
    conceptDriftScore: 0.38,
    featureCoveragePct: 95.8,
    inferenceLatencyMs: 133,
    retrainRecommended: false,
  },
  {
    date: isoDateOffset(-2),
    mapePct: 15.7,
    dataDriftScore: 0.58,
    conceptDriftScore: 0.47,
    featureCoveragePct: 94.2,
    inferenceLatencyMs: 139,
    retrainRecommended: true,
  },
  {
    date: isoDateOffset(-1),
    mapePct: 16.3,
    dataDriftScore: 0.62,
    conceptDriftScore: 0.51,
    featureCoveragePct: 93.6,
    inferenceLatencyMs: 142,
    retrainRecommended: true,
  },
];

const LIVE_PROOF_PACKS: ProofPackRecord[] = [
  {
    id: "pf-live-001",
    siteId: "site-lyon",
    month: `${NOW.getUTCFullYear()}-${String(NOW.getUTCMonth() + 1).padStart(2, "0")}-01`,
    coutBauEur: 52400,
    cout100Eur: 49720,
    coutReelEur: 48110,
    gainNetEur: 4290,
    serviceBauPct: 94.2,
    serviceReelPct: 97.1,
    captureRate: 0.81,
    bauMethodVersion: "bau-v2",
    attributionConfidence: 0.88,
    adoptionPct: 0.74,
    alertesEmises: 28,
    alertesTraitees: 25,
  },
  {
    id: "pf-live-002",
    siteId: "site-orleans",
    month: `${NOW.getUTCFullYear()}-${String(NOW.getUTCMonth() + 1).padStart(2, "0")}-01`,
    coutBauEur: 37120,
    cout100Eur: 35850,
    coutReelEur: 34980,
    gainNetEur: 2140,
    serviceBauPct: 95.1,
    serviceReelPct: 97.8,
    captureRate: 0.76,
    bauMethodVersion: "bau-v2",
    attributionConfidence: 0.84,
    adoptionPct: 0.69,
    alertesEmises: 19,
    alertesTraitees: 17,
  },
];

const LIVE_FORECAST_RUNS = [
  {
    id: "fr-live-001",
    modelType: "sarimax",
    horizonDays: 14,
    status: "completed",
    accuracyScore: 0.93,
    startedAt: isoDateTimeOffset(-3, 4),
    completedAt: isoDateTimeOffset(-3, 5),
  },
  {
    id: "fr-live-002",
    modelType: "ensemble",
    horizonDays: 14,
    status: "completed",
    accuracyScore: 0.91,
    startedAt: isoDateTimeOffset(-2, 4),
    completedAt: isoDateTimeOffset(-2, 5),
  },
  {
    id: "fr-live-003",
    modelType: "sarimax",
    horizonDays: 14,
    status: "running",
    accuracyScore: null,
    startedAt: isoDateTimeOffset(0, 5),
    completedAt: null,
  },
];

function parsePositiveInt(rawValue: string | null, fallback: number): number {
  const parsed = Number(rawValue ?? String(fallback));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function pageQuery(ctx: RouteContext): { page: number; pageSize: number } {
  return {
    page: parsePositiveInt(ctx.query.get("page"), 1),
    pageSize: parsePositiveInt(
      ctx.query.get("page_size") ?? ctx.query.get("pageSize"),
      20,
    ),
  };
}

function paginateFrom<T>(items: T[], ctx: RouteContext) {
  const { page, pageSize } = pageQuery(ctx);
  const start = (page - 1) * pageSize;
  const sliced = items.slice(start, start + pageSize);
  return paginated(sliced, page, pageSize, items.length, ctx.requestId);
}

function getConversationMessages(conversationId: string): Record<string, unknown>[] {
  const messages = demo.messages as Record<string, unknown>[];
  return messages.filter(
    (entry) => String(entry.conversationId ?? "") === conversationId,
  );
}

function standardMeta(view: string): Record<string, unknown> {
  return {
    view,
    generatedAt: new Date().toISOString(),
  };
}

function minByDate(values: string[]): string | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a.localeCompare(b));
  return sorted[0] ?? null;
}

function maxByDate(values: string[]): string | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a.localeCompare(b));
  return sorted[sorted.length - 1] ?? null;
}

function filteredCoverageAlerts(ctx: RouteContext): CoverageAlertRecord[] {
  const status = ctx.query.get("status");
  const severity = ctx.query.get("severity");
  const siteId = ctx.query.get("site_id");
  const dateFrom = ctx.query.get("date_from");
  const dateTo = ctx.query.get("date_to");

  return COVERAGE_ALERTS.filter((alert) => {
    if (status != null && status.length > 0 && alert.status !== status) {
      return false;
    }
    if (severity != null && severity.length > 0 && alert.severity !== severity) {
      return false;
    }
    if (siteId != null && siteId.length > 0 && alert.siteId !== siteId) {
      return false;
    }
    if (dateFrom != null && dateFrom.length > 0 && alert.alertDate < dateFrom) {
      return false;
    }
    if (dateTo != null && dateTo.length > 0 && alert.alertDate > dateTo) {
      return false;
    }
    return true;
  });
}

function toDecisionQueueItems(items: CoverageAlertRecord[]): DecisionQueueRecord[] {
  return items
    .filter((item) => item.status === "open")
    .map((item, index) => {
      const severityWeight =
        item.severity === "critical"
          ? 4
          : item.severity === "high"
            ? 3
            : item.severity === "medium"
              ? 2
              : 1;
      return {
        id: item.id,
        siteId: item.siteId,
        alertDate: item.alertDate,
        shift: item.shift,
        severity: item.severity,
        horizon: item.horizon,
        gapH: item.gapH,
        pRupture: item.pRupture,
        driversJson: item.driversJson,
        priorityScore: Number((severityWeight * item.pRupture * 100).toFixed(2)),
        estimatedImpactEur: item.impactEur ?? Math.round(item.gapH * 140),
        timeToBreachHours: Math.max(2, 48 - index * 6),
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

function filteredCanonicalRows(ctx: RouteContext): CanonicalRecord[] {
  const siteId = ctx.query.get("site_id");
  const shift = ctx.query.get("shift");
  const dateFrom = ctx.query.get("date_from");
  const dateTo = ctx.query.get("date_to");

  return CANONICAL_ROWS.filter((row) => {
    if (siteId != null && siteId.length > 0 && row.siteId !== siteId) {
      return false;
    }
    if (shift != null && shift.length > 0 && row.shift !== shift) {
      return false;
    }
    if (dateFrom != null && dateFrom.length > 0 && row.date < dateFrom) {
      return false;
    }
    if (dateTo != null && dateTo.length > 0 && row.date > dateTo) {
      return false;
    }
    return true;
  });
}

function filteredGoldRows(ctx: RouteContext): GoldRowRecord[] {
  const siteId = ctx.query.get("site_id");
  const dateFrom = ctx.query.get("date_from");
  const dateTo = ctx.query.get("date_to");
  const search = (ctx.query.get("search") ?? "").trim().toLowerCase();

  return GOLD_ROWS.filter((row) => {
    if (siteId != null && siteId.length > 0 && row.site_id !== siteId) {
      return false;
    }
    if (dateFrom != null && dateFrom.length > 0 && row.date < dateFrom) {
      return false;
    }
    if (dateTo != null && dateTo.length > 0 && row.date > dateTo) {
      return false;
    }
    if (search.length > 0) {
      const haystack = Object.values(row)
        .map((value) => String(value).toLowerCase())
        .join(" ");
      if (!haystack.includes(search)) {
        return false;
      }
    }
    return true;
  });
}

function findCoverageAlert(alertId: string): CoverageAlertRecord | null {
  return COVERAGE_ALERTS.find((entry) => entry.id === alertId) ?? null;
}

function buildScenarioOptions(alertId: string) {
  const alert = findCoverageAlert(alertId) ?? COVERAGE_ALERTS[0];
  const coverageAlertId = alert?.id ?? alertId;
  const orgId = alert?.organizationId ?? ORGANIZATION_ID;

  const options = [
    {
      id: `${coverageAlertId}-opt-hs`,
      organizationId: orgId,
      coverageAlertId,
      costParameterId: "cp-001",
      optionType: "hs",
      label: "Heures supplementaires ciblees",
      coutTotalEur: 980,
      serviceAttenduPct: 97.2,
      heuresCouvertes: 6.5,
      feasibilityScore: 0.92,
      riskScore: 0.28,
      policyCompliance: true,
      dominanceReason: "Activation immediate sur les equipes deja certifiees.",
      recommendationPolicyVersion: "policy-v3",
      isParetoOptimal: true,
      isRecommended: true,
      contraintesJson: { maxHsParJour: 2.5, reposLegalRespecte: true },
      createdAt: isoDateTimeOffset(0, 6),
      updatedAt: isoDateTimeOffset(0, 6),
    },
    {
      id: `${coverageAlertId}-opt-interim`,
      organizationId: orgId,
      coverageAlertId,
      costParameterId: "cp-001",
      optionType: "interim",
      label: "Renfort interim",
      coutTotalEur: 1320,
      serviceAttenduPct: 99.1,
      heuresCouvertes: 8.4,
      feasibilityScore: 0.74,
      riskScore: 0.22,
      policyCompliance: true,
      dominanceReason: "Couverture forte mais cout plus eleve.",
      recommendationPolicyVersion: "policy-v3",
      isParetoOptimal: true,
      isRecommended: false,
      contraintesJson: { delaiContractualisationHeures: 6, vivierLocal: true },
      createdAt: isoDateTimeOffset(0, 6),
      updatedAt: isoDateTimeOffset(0, 6),
    },
    {
      id: `${coverageAlertId}-opt-realloc`,
      organizationId: orgId,
      coverageAlertId,
      costParameterId: "cp-001",
      optionType: "realloc_intra",
      label: "Reallocation intra-site",
      coutTotalEur: 760,
      serviceAttenduPct: 95.4,
      heuresCouvertes: 5.1,
      feasibilityScore: 0.81,
      riskScore: 0.35,
      policyCompliance: true,
      dominanceReason:
        "Option economique mais couverture partielle selon competences.",
      recommendationPolicyVersion: "policy-v3",
      isParetoOptimal: false,
      isRecommended: false,
      contraintesJson: { competencesCritiquesDisponibles: false },
      createdAt: isoDateTimeOffset(0, 6),
      updatedAt: isoDateTimeOffset(0, 6),
    },
  ] as const;

  return options;
}

const adminAllowedRoles =
  process.env.NODE_ENV === "production"
    ? (["super_admin"] as const)
    : (["super_admin", "org_admin"] as const);
const adminOnly = { allowedRoles: adminAllowedRoles };

export const routes: RouteDefinition[] = [
  route(
    "GET",
    "/api/v1/health",
    (ctx) =>
      success(
        {
          status: "healthy",
          version: "2.0.0",
          environment: process.env.NODE_ENV ?? "development",
          timestamp: new Date().toISOString(),
          checks: [{ name: "api-ts", status: "pass" }],
        },
        ctx.requestId,
      ),
    { authRequired: false },
  ),

  // Webapp surface
  route("GET", "/api/v1/live/dashboard/summary", (ctx) =>
    success(
      (() => {
        const siteId = ctx.query.get("site_id");
        const scopedCanonical = CANONICAL_ROWS.filter((row) =>
          siteId == null || siteId.length === 0 ? true : row.siteId === siteId,
        );
        const scopedAlerts = COVERAGE_ALERTS.filter((alert) => {
          if (alert.status !== "open") return false;
          return siteId == null || siteId.length === 0
            ? true
            : alert.siteId === siteId;
        });

        const coverageHuman =
          scopedCanonical.length === 0
            ? 100
            : Number(
                (
                  100 -
                  scopedCanonical.reduce((sum, row) => {
                    if (row.capacitePlanH <= 0) return sum + 100;
                    return (
                      sum +
                      (Math.max(0, row.chargeUnits - row.capacitePlanH) /
                        row.capacitePlanH) *
                        100
                    );
                  }, 0) /
                    scopedCanonical.length
                ).toFixed(1),
              );

        const latestForecastDate = maxByDate(
          FORECAST_DAILY.filter((row) =>
            siteId == null || siteId.length === 0 ? true : row.siteId === siteId,
          ).map((row) => row.forecastDate),
        );

        return {
          coverageHuman,
          coverageMerchandise: Number((coverageHuman + 1.8).toFixed(1)),
          activeAlertsCount: scopedAlerts.length,
          forecastAccuracy: 92.4,
          lastForecastDate: latestForecastDate,
        };
      })(),
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/live/forecasts", (ctx) =>
    success(
      LIVE_FORECAST_RUNS.filter((row) => {
        const status = ctx.query.get("status");
        if (status == null || status.length === 0 || status === "all") {
          return true;
        }
        return row.status === status;
      }),
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/live/forecasts/latest/daily", (ctx) =>
    success(
      FORECAST_DAILY.filter((row) => {
        const dimension = (ctx.query.get("dimension") ?? "human").trim();
        const siteId = ctx.query.get("site_id");
        if (row.dimension !== dimension) return false;
        if (siteId != null && siteId.length > 0 && row.siteId !== siteId) {
          return false;
        }
        return true;
      }).sort((a, b) => a.forecastDate.localeCompare(b.forecastDate)),
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/live/ml-monitoring/summary", (ctx) =>
    success(
      (() => {
        const avg = (
          values: number[],
          digits = 2,
        ): number | null => {
          if (values.length === 0) return null;
          return Number(
            (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(
              digits,
            ),
          );
        };

        const rows = ML_MONITORING_DAILY;
        return {
          latestModelVersion: "ensemble-2026.02.25",
          latestDate: rows.at(-1)?.date ?? null,
          avgMapePct: avg(rows.map((row) => row.mapePct), 2),
          avgDataDriftScore: avg(rows.map((row) => row.dataDriftScore), 4),
          avgConceptDriftScore: avg(rows.map((row) => row.conceptDriftScore), 4),
          avgFeatureCoveragePct: avg(
            rows.map((row) => row.featureCoveragePct),
            2,
          ),
          avgInferenceLatencyMs: avg(
            rows.map((row) => row.inferenceLatencyMs),
            1,
          ),
          retrainRecommendedDays: rows.some((row) => row.retrainRecommended)
            ? 3
            : 0,
        };
      })(),
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/live/ml-monitoring/drift", (ctx) =>
    success(
      (() => {
        const limitDays = parsePositiveInt(ctx.query.get("limit_days"), 60);
        return ML_MONITORING_DAILY.slice(-limitDays);
      })(),
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/live/onboarding/status", (ctx) =>
    success(
      (() => {
        const steps = [
          {
            id: "data_connected",
            label: "Connecter les donnees canonique et Gold",
            description:
              "Validation de l'alimentation de la couche canonical et de l'explorer Gold.",
            completed: true,
          },
          {
            id: "forecast_ready",
            label: "Produire la premiere prevision",
            description:
              "Execution du run de prevision quotidienne et verification des scores.",
            completed: true,
          },
          {
            id: "monitoring_ready",
            label: "Activer le monitoring IA/ML",
            description:
              "Suivi des derives, de la couverture de features et de la latence.",
            completed: true,
          },
          {
            id: "decision_ready",
            label: "Configurer la war room decisionnelle",
            description:
              "Priorisation des alertes et generation des options d'arbitrage.",
            completed: true,
          },
          {
            id: "reporting_ready",
            label: "Publier le premier proof pack",
            description:
              "Consolidation des indicateurs budget/service pour le comite de pilotage.",
            completed: LIVE_PROOF_PACKS.length > 0,
          },
        ];
        const completedSteps = steps.filter((step) => step.completed).length;
        const totalSteps = steps.length;
        return {
          completedSteps,
          totalSteps,
          completionPct:
            totalSteps === 0
              ? 0
              : Number(((completedSteps / totalSteps) * 100).toFixed(1)),
          steps,
        };
      })(),
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/live/gold/schema", (ctx) =>
    success(
      (() => {
        const scopedRows = filteredGoldRows(ctx);
        const sample = scopedRows[0] ?? GOLD_ROWS[0] ?? null;
        const columns = [
          {
            name: "client_slug",
            dtype: "string",
            nullable: false,
            sample: sample?.client_slug ?? "praedixa-demo",
          },
          {
            name: "site_id",
            dtype: "string",
            nullable: false,
            sample: sample?.site_id ?? "site-lyon",
          },
          {
            name: "site_code",
            dtype: "string",
            nullable: false,
            sample: sample?.site_code ?? "LYN",
          },
          {
            name: "date",
            dtype: "date",
            nullable: false,
            sample: sample?.date ?? isoDateOffset(0),
          },
          {
            name: "shift",
            dtype: "string",
            nullable: false,
            sample: sample?.shift ?? "am",
          },
          {
            name: "model_version",
            dtype: "string",
            nullable: false,
            sample: sample?.model_version ?? "sarimax-2.4.1",
          },
          {
            name: "load_hours",
            dtype: "number",
            nullable: false,
            sample: sample?.load_hours ?? 320,
          },
          {
            name: "capacity_hours",
            dtype: "number",
            nullable: false,
            sample: sample?.capacity_hours ?? 300,
          },
          {
            name: "gap_h",
            dtype: "number",
            nullable: false,
            sample: sample?.gap_h ?? 8,
          },
          {
            name: "risk_score",
            dtype: "number",
            nullable: false,
            sample: sample?.risk_score ?? 0.42,
          },
          {
            name: "has_alert",
            dtype: "boolean",
            nullable: false,
            sample: sample?.has_alert ?? false,
          },
        ] as const;

        return {
          revision: "gold-2026.02.25-r1",
          loadedAt: new Date().toISOString(),
          totalRows: scopedRows.length,
          totalColumns: columns.length,
          columns,
        };
      })(),
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/live/gold/rows", (ctx) =>
    paginateFrom(filteredGoldRows(ctx), ctx),
  ),
  route("GET", "/api/v1/live/gold/coverage", (ctx) =>
    success(
      (() => {
        const columns = [
          {
            name: "site_id",
            exposedInExplorer: true,
            usedInBusinessViews: true,
            mappedViews: ["war_room", "donnees", "rapports"],
          },
          {
            name: "date",
            exposedInExplorer: true,
            usedInBusinessViews: true,
            mappedViews: ["previsions", "donnees"],
          },
          {
            name: "shift",
            exposedInExplorer: true,
            usedInBusinessViews: true,
            mappedViews: ["war_room", "actions"],
          },
          {
            name: "load_hours",
            exposedInExplorer: true,
            usedInBusinessViews: true,
            mappedViews: ["previsions", "donnees"],
          },
          {
            name: "capacity_hours",
            exposedInExplorer: true,
            usedInBusinessViews: true,
            mappedViews: ["previsions", "war_room"],
          },
          {
            name: "model_version",
            exposedInExplorer: true,
            usedInBusinessViews: false,
            mappedViews: [],
          },
          {
            name: "risk_score",
            exposedInExplorer: true,
            usedInBusinessViews: true,
            mappedViews: ["previsions", "actions"],
          },
          {
            name: "has_alert",
            exposedInExplorer: true,
            usedInBusinessViews: true,
            mappedViews: ["war_room", "actions"],
          },
        ] as const;
        const explorerExposedColumns = columns.filter(
          (column) => column.exposedInExplorer,
        ).length;
        const businessMappedColumns = columns.filter(
          (column) => column.usedInBusinessViews,
        ).length;
        return {
          totalColumns: columns.length,
          explorerExposedColumns,
          businessMappedColumns,
          columns,
        };
      })(),
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/live/gold/provenance", (ctx) =>
    success(
      (() => {
        const scopedRows = filteredGoldRows(ctx);
        return {
          revision: "gold-2026.02.25-r1",
          loadedAt: new Date().toISOString(),
          sourcePath: "data-ready/gold/gold_site_day.csv",
          scopedRows: scopedRows.length,
          totalRows: GOLD_ROWS.length,
          totalColumns: 11,
          policy: {
            allowedMockDomains: ["forecasting"],
            forecastMockColumns: [],
            nonForecastMockColumns: [],
            strictDataPolicyOk: true,
          },
          qualityReports: {
            silverQualityAvailable: true,
            goldFeatureQualityAvailable: true,
            lastRunSummaryAvailable: true,
            lastRunAt: isoDateTimeOffset(0, 7),
            lastRunGoldRows: GOLD_ROWS.length,
          },
        };
      })(),
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/live/proof", (ctx) =>
    paginateFrom(
      LIVE_PROOF_PACKS.filter((proof) => {
        const siteId = ctx.query.get("site_id");
        if (siteId == null || siteId.length === 0) return true;
        return proof.siteId === siteId;
      }),
      ctx,
    ),
  ),
  route("GET", "/api/v1/organizations/me", (ctx) =>
    success(demo.organization, ctx.requestId),
  ),
  route("GET", "/api/v1/departments", (ctx) =>
    success(demo.departments, ctx.requestId),
  ),
  route("GET", "/api/v1/sites", (ctx) =>
    success(
      demo.sites.map((site, index) => ({
        ...site,
        code: index === 0 ? "LYN" : "ORL",
        headcount: index === 0 ? 180 : 140,
      })),
      ctx.requestId,
    ),
  ),

  route("GET", "/api/v1/forecasts", (ctx) =>
    paginateFrom(demo.forecasts as Record<string, unknown>[], ctx),
  ),
  route("GET", "/api/v1/forecasts/:forecastId/summary", (ctx) =>
    success(
      {
        forecastId: ctx.params.forecastId,
        status: "completed",
        drivers: ["turnover", "seasonality", "absences"],
      },
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/forecasts/:forecastId/daily", (ctx) =>
    success(
      [
        {
          forecastId: ctx.params.forecastId,
          date: new Date().toISOString().slice(0, 10),
          expectedGapHours: 6,
          riskProbability: 0.42,
        },
      ],
      ctx.requestId,
    ),
  ),
  route("POST", "/api/v1/forecasts", (ctx) =>
    success(
      {
        id: "fr-new",
        status: "queued",
        input: ctx.body,
      },
      ctx.requestId,
      "Forecast request accepted",
      201,
    ),
  ),
  route("POST", "/api/v1/forecasts/what-if", (ctx) =>
    success(
      {
        scenario: "what-if",
        input: ctx.body,
        deltaCostEur: -480,
        deltaServicePct: 1.2,
      },
      ctx.requestId,
    ),
  ),

  route("GET", "/api/v1/decisions", (ctx) =>
    paginateFrom(demo.decisions as Record<string, unknown>[], ctx),
  ),
  route("GET", "/api/v1/decisions/:decisionId", (ctx) =>
    success(
      {
        id: ctx.params.decisionId,
        title: "Increase PM staffing",
        status: "suggested",
      },
      ctx.requestId,
    ),
  ),
  route("PATCH", "/api/v1/decisions/:decisionId/review", (ctx) =>
    success(
      {
        id: ctx.params.decisionId,
        status: "reviewed",
        review: ctx.body,
      },
      ctx.requestId,
    ),
  ),
  route("POST", "/api/v1/decisions/:decisionId/outcome", (ctx) =>
    success(
      {
        id: ctx.params.decisionId,
        outcome: ctx.body,
      },
      ctx.requestId,
    ),
  ),

  route("GET", "/api/v1/arbitrage/:alertId/options", (ctx) =>
    success(
      {
        alertId: ctx.params.alertId,
        options: [
          { id: "opt-hs", label: "HS", costEur: 920, servicePct: 100 },
          {
            id: "opt-interim",
            label: "Interim",
            costEur: 1140,
            servicePct: 100,
          },
        ],
      },
      ctx.requestId,
    ),
  ),
  route("POST", "/api/v1/arbitrage/:alertId/validate", (ctx) =>
    success(
      {
        alertId: ctx.params.alertId,
        decision: ctx.body,
      },
      ctx.requestId,
    ),
  ),

  route("GET", "/api/v1/alerts", (ctx) => success(demo.alerts, ctx.requestId)),
  route("PATCH", "/api/v1/alerts/:alertId/dismiss", (ctx) =>
    success(
      {
        id: ctx.params.alertId,
        status: "dismissed",
      },
      ctx.requestId,
    ),
  ),

  route("GET", "/api/v1/analytics/costs", (ctx) =>
    success(
      {
        period: {
          startDate: ctx.query.get("startDate"),
          endDate: ctx.query.get("endDate"),
        },
        totals: {
          overtimeEur: 12400,
          interimEur: 19800,
          avoidedEur: 5400,
        },
      },
      ctx.requestId,
    ),
  ),

  route("POST", "/api/v1/exports/:resource", (ctx) =>
    success(
      {
        exportId: `exp-${ctx.params.resource}`,
        status: "pending",
        requested: ctx.body,
      },
      ctx.requestId,
      "Export queued",
      202,
    ),
  ),

  route("GET", "/api/v1/datasets", (ctx) =>
    paginateFrom(demo.datasets as Record<string, unknown>[], ctx),
  ),
  route("GET", "/api/v1/datasets/:datasetId", (ctx) =>
    success(
      {
        id: ctx.params.datasetId,
        name: "canonical_records",
        status: "ready",
        tableName: "canonical_records",
        temporalIndex: "date",
        groupBy: ["site_id"],
        rowCount: 120,
        lastIngestionAt: new Date().toISOString(),
        columns: [
          { name: "site_id", dataType: "text" },
          { name: "date", dataType: "date" },
          { name: "charge_hours", dataType: "number" },
        ],
      },
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/datasets/:datasetId/data", (ctx) =>
    success(
      {
        columns: ["site_id", "date", "charge_hours"],
        rows: [
          { site_id: "site-lyon", date: "2026-02-24", charge_hours: 312 },
          { site_id: "site-orleans", date: "2026-02-24", charge_hours: 248 },
        ],
        maskedColumns: [],
        total: 2,
      },
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/datasets/:datasetId/columns", (ctx) =>
    success(
      [
        {
          id: "col-site",
          datasetId: ctx.params.datasetId,
          name: "site_id",
          dataType: "text",
        },
      ],
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/datasets/:datasetId/ingestion-log", (ctx) =>
    success(
      {
        entries: [
          {
            id: "ing-001",
            datasetId: ctx.params.datasetId,
            status: "success",
            createdAt: new Date().toISOString(),
          },
        ],
        total: 1,
      },
      ctx.requestId,
    ),
  ),

  route("GET", "/api/v1/live/canonical", (ctx) =>
    paginateFrom(filteredCanonicalRows(ctx), ctx),
  ),
  route("GET", "/api/v1/live/canonical/quality", (ctx) =>
    success(
      (() => {
        const scoped = filteredCanonicalRows(ctx);
        const totalRecords = scoped.length;
        const validCapacityRows = scoped.filter((row) => row.capacitePlanH > 0);
        const missingRows = scoped.length - validCapacityRows.length;
        const missingShiftsPct =
          totalRecords === 0
            ? 0
            : Number(((missingRows / totalRecords) * 100).toFixed(2));
        const coveragePct = Number((100 - missingShiftsPct).toFixed(2));
        const avgAbsPct =
          validCapacityRows.length === 0
            ? 0
            : Number(
                (
                  validCapacityRows.reduce(
                    (sum, row) => sum + (row.absH / row.capacitePlanH) * 100,
                    0,
                  ) / validCapacityRows.length
                ).toFixed(2),
              );
        const dateValues = scoped.map((row) => row.date);
        const minDate = minByDate(dateValues);
        const maxDate = maxByDate(dateValues);
        return {
          totalRecords,
          coveragePct,
          sites: new Set(scoped.map((row) => row.siteId)).size,
          dateRange:
            minDate != null && maxDate != null
              ? [minDate, maxDate]
              : [isoDateOffset(0), isoDateOffset(0)],
          missingShiftsPct,
          avgAbsPct,
        };
      })(),
      ctx.requestId,
    ),
  ),

  route("GET", "/api/v1/live/coverage-alerts", (ctx) => {
    const alerts = filteredCoverageAlerts(ctx).sort((a, b) => {
      if (a.alertDate === b.alertDate) {
        return b.pRupture - a.pRupture;
      }
      return a.alertDate.localeCompare(b.alertDate);
    });

    if (ctx.query.get("page") != null) {
      return paginateFrom(alerts, ctx);
    }

    const limitQuery = ctx.query.get("page_size");
    if (limitQuery != null) {
      const limit = parsePositiveInt(limitQuery, alerts.length || 1);
      return success(alerts.slice(0, limit), ctx.requestId);
    }

    return success(alerts, ctx.requestId);
  }),
  route("GET", "/api/v1/live/coverage-alerts/queue", (ctx) =>
    success(
      (() => {
        const scoped = filteredCoverageAlerts(ctx).filter((alert) => {
          const status = ctx.query.get("status");
          if (status == null || status.length === 0) {
            return alert.status === "open";
          }
          return alert.status === status;
        });

        const queue = toDecisionQueueItems(scoped);
        const limit = parsePositiveInt(ctx.query.get("limit"), 50);
        return queue.slice(0, limit);
      })(),
      ctx.requestId,
    ),
  ),
  route("PATCH", "/api/v1/coverage-alerts/:alertId/acknowledge", (ctx) =>
    success(
      (() => {
        const now = new Date().toISOString();
        const alert =
          findCoverageAlert(ctx.params.alertId ?? "") ??
          COVERAGE_ALERTS[0] ??
          null;
        if (alert == null) {
          return {
            id: ctx.params.alertId ?? "unknown",
            status: "acknowledged",
            acknowledgedAt: now,
          };
        }
        return {
          ...alert,
          status: "acknowledged",
          acknowledgedAt: now,
          updatedAt: now,
        };
      })(),
      ctx.requestId,
    ),
  ),
  route("PATCH", "/api/v1/coverage-alerts/:alertId/resolve", (ctx) =>
    success(
      (() => {
        const now = new Date().toISOString();
        const alert =
          findCoverageAlert(ctx.params.alertId ?? "") ??
          COVERAGE_ALERTS[0] ??
          null;
        if (alert == null) {
          return {
            id: ctx.params.alertId ?? "unknown",
            status: "resolved",
            resolvedAt: now,
          };
        }
        return {
          ...alert,
          status: "resolved",
          resolvedAt: now,
          updatedAt: now,
        };
      })(),
      ctx.requestId,
    ),
  ),

  route("GET", "/api/v1/live/scenarios/alert/:alertId", (ctx) =>
    success(
      (() => {
        const alertId = ctx.params.alertId ?? "alt-001";
        const options = buildScenarioOptions(alertId);
        return {
          alertId,
          options,
          paretoFrontier: options.filter((option) => option.isParetoOptimal),
          recommended: options.find((option) => option.isRecommended) ?? null,
        };
      })(),
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/live/decision-workspace/:alertId", (ctx) =>
    success(
      (() => {
        const requestedAlertId = ctx.params.alertId ?? "alt-001";
        const alert =
          findCoverageAlert(requestedAlertId) ?? COVERAGE_ALERTS[0] ?? null;
        const resolvedAlert =
          alert == null
            ? {
                id: requestedAlertId,
                organizationId: ORGANIZATION_ID,
                siteId: "site-lyon",
                alertDate: isoDateOffset(0),
                shift: "am" as const,
                horizon: "j3" as const,
                pRupture: 0.6,
                gapH: 6,
                severity: "medium" as const,
                status: "open" as const,
                driversJson: ["pic_activite"],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : alert;
        const options = buildScenarioOptions(resolvedAlert.id);

        return {
          alert: resolvedAlert,
          options,
          recommendedOptionId:
            options.find((option) => option.isRecommended)?.id ?? null,
          diagnostic: {
            topDrivers: resolvedAlert.driversJson.slice(0, 3),
            confidencePct: Math.round(resolvedAlert.pRupture * 100),
            riskTrend:
              resolvedAlert.pRupture > 0.75
                ? "worsening"
                : resolvedAlert.pRupture < 0.4
                  ? "improving"
                  : "stable",
            note:
              "L'option recommandee equilibre cout et niveau de service selon la politique active.",
          },
        };
      })(),
      ctx.requestId,
    ),
  ),
  route("POST", "/api/v1/scenarios/generate/:alertId", (ctx) =>
    success(
      (() => {
        const alertId = ctx.params.alertId ?? "alt-001";
        const options = buildScenarioOptions(alertId);
        return {
          alertId,
          options,
          paretoFrontier: options.filter((option) => option.isParetoOptimal),
          recommended: options.find((option) => option.isRecommended) ?? null,
        };
      })(),
      ctx.requestId,
    ),
  ),

  route("POST", "/api/v1/operational-decisions", (ctx) =>
    success(
      (() => {
        const payload =
          (ctx.body as {
            coverageAlertId?: unknown;
            chosenOptionId?: unknown;
            siteId?: unknown;
            decisionDate?: unknown;
            shift?: unknown;
            horizon?: unknown;
            gapH?: unknown;
          } | null) ?? null;

        const now = new Date().toISOString();
        return {
          id: `opd-${Date.now()}`,
          organizationId: ctx.user?.organizationId ?? ORGANIZATION_ID,
          coverageAlertId:
            typeof payload?.coverageAlertId === "string"
              ? payload.coverageAlertId
              : "alt-001",
          recommendedOptionId: null,
          chosenOptionId:
            typeof payload?.chosenOptionId === "string"
              ? payload.chosenOptionId
              : null,
          siteId:
            typeof payload?.siteId === "string" ? payload.siteId : "site-lyon",
          decisionDate:
            typeof payload?.decisionDate === "string"
              ? payload.decisionDate
              : isoDateOffset(0),
          shift:
            payload?.shift === "am" || payload?.shift === "pm"
              ? payload.shift
              : "am",
          horizon:
            payload?.horizon === "j3" ||
            payload?.horizon === "j7" ||
            payload?.horizon === "j14"
              ? payload.horizon
              : "j7",
          gapH:
            typeof payload?.gapH === "number" && Number.isFinite(payload.gapH)
              ? payload.gapH
              : 0,
          isOverride: true,
          overrideReason: "manager_override",
          overrideCategory: "capacity_constraints",
          recommendationPolicyVersion: "policy-v3",
          coutAttenduEur: 980,
          serviceAttenduPct: 97.2,
          decidedBy: ctx.user?.userId ?? "user-demo",
          createdAt: now,
          updatedAt: now,
        };
      })(),
      ctx.requestId,
      "Operational decision recorded",
      201,
    ),
  ),
  route("GET", "/api/v1/operational-decisions", (ctx) =>
    paginateFrom(
      [
        {
          id: "opd-001",
          organizationId: ORGANIZATION_ID,
          coverageAlertId: "alt-001",
          recommendedOptionId: "alt-001-opt-hs",
          chosenOptionId: "alt-001-opt-hs",
          siteId: "site-lyon",
          decisionDate: "2026-02-24",
          shift: "am",
          horizon: "j3",
          gapH: 12.5,
          isOverride: false,
          decidedBy: "user-ops-001",
          coutAttenduEur: 980,
          serviceAttenduPct: 97.2,
          createdAt: isoDateTimeOffset(-1, 17),
          updatedAt: isoDateTimeOffset(-1, 17),
        },
      ],
      ctx,
    ),
  ),
  route("GET", "/api/v1/operational-decisions/override-stats", (ctx) =>
    success(
      {
        totalDecisions: 14,
        overrideCount: 3,
        overridePct: 21.43,
        topOverrideReasons: [
          { reason: "absence_non_planifiee", count: 2 },
          { reason: "capacite_interim_limitee", count: 1 },
        ],
        avgCostDelta: 124.5,
      },
      ctx.requestId,
    ),
  ),

  route("GET", "/api/v1/cost-parameters", (ctx) =>
    success(
      [
        {
          id: "cp-001",
          siteId: "site-lyon",
          internalHourlyCostEur: 19.9,
          overtimeMultiplier: 1.25,
          interimHourlyCostEur: 30,
        },
      ],
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/cost-parameters/effective", (ctx) =>
    success(
      {
        siteId: "site-lyon",
        internalHourlyCostEur: 19.9,
        overtimeMultiplier: 1.25,
        interimHourlyCostEur: 30,
      },
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/cost-parameters/history", (ctx) =>
    success(
      [
        {
          id: "cp-001",
          version: 1,
          effectiveAt: "2026-01-01",
        },
      ],
      ctx.requestId,
    ),
  ),

  route("GET", "/api/v1/proof", (ctx) =>
    success(LIVE_PROOF_PACKS, ctx.requestId),
  ),
  route("GET", "/api/v1/proof/summary", (ctx) =>
    success(
      (() => {
        const records = LIVE_PROOF_PACKS;
        const totalGainNetEur = records.reduce(
          (sum, entry) => sum + entry.gainNetEur,
          0,
        );
        const avgAdoptionPct =
          records.length === 0
            ? null
            : Number(
                (
                  records.reduce(
                    (sum, entry) => sum + (entry.adoptionPct ?? 0),
                    0,
                  ) / records.length
                ).toFixed(3),
              );
        return {
          totalGainNetEur,
          avgAdoptionPct,
          totalAlertesEmises: records.reduce(
            (sum, entry) => sum + entry.alertesEmises,
            0,
          ),
          totalAlertesTraitees: records.reduce(
            (sum, entry) => sum + entry.alertesTraitees,
            0,
          ),
          records,
        };
      })(),
      ctx.requestId,
    ),
  ),
  route("POST", "/api/v1/proof/generate", (ctx) =>
    success(
      (() => {
        const payload =
          (ctx.body as { siteId?: unknown; month?: unknown } | null) ?? null;
        const siteId =
          typeof payload?.siteId === "string"
            ? payload.siteId
            : "site-lyon";
        const month =
          typeof payload?.month === "string" ? payload.month : isoDateOffset(0);
        return {
          id: `pf-${Date.now()}`,
          siteId,
          month,
          coutBauEur: 49800,
          cout100Eur: 47400,
          coutReelEur: 46320,
          gainNetEur: 3480,
          serviceBauPct: 94.7,
          serviceReelPct: 97.5,
          captureRate: 0.79,
          bauMethodVersion: "bau-v2",
          attributionConfidence: 0.86,
          adoptionPct: 0.73,
          alertesEmises: 22,
          alertesTraitees: 20,
        };
      })(),
      ctx.requestId,
      "Proof pack generated",
      201,
    ),
  ),
  route("GET", "/api/v1/proof/pdf", (ctx) =>
    success(
      {
        url: `/proof/${ctx.query.get("proof_pack_id") ?? "latest"}.pdf`,
      },
      ctx.requestId,
    ),
  ),

  route("GET", "/api/v1/users/me/preferences", (ctx) =>
    success(
      {
        userId: ctx.user?.userId ?? "user-demo",
        language: "fr",
        density: "compact",
        defaultLanding: "/dashboard",
        dismissedCoachmarks: [],
        nav: {
          sidebarCollapsed: false,
          sidebarWidth: 268,
          starredItems: ["/dashboard", "/actions"],
          recentItems: ["/previsions", "/donnees"],
        },
        theme: { mode: "light" },
      },
      ctx.requestId,
    ),
  ),
  route("PATCH", "/api/v1/users/me/preferences", (ctx) =>
    success(
      Object.assign(
        {
          userId: ctx.user?.userId ?? "user-demo",
          language: "fr",
          density: "compact",
          defaultLanding: "/dashboard",
          dismissedCoachmarks: [],
          nav: {
            sidebarCollapsed: false,
            sidebarWidth: 268,
          },
          theme: { mode: "light" },
        },
        ctx.body ?? {},
      ),
      ctx.requestId,
    ),
  ),

  route("POST", "/api/v1/product-events/batch", (ctx) => {
    const payload = (ctx.body as { events?: unknown[] } | null) ?? null;
    const accepted = Array.isArray(payload?.events) ? payload.events.length : 0;
    return success({ accepted }, ctx.requestId, "Events accepted", 202);
  }),
  route("POST", "/api/v1/mock-forecast", (ctx) =>
    success(
      {
        queued: true,
      },
      ctx.requestId,
      "Mock forecast queued",
      202,
    ),
  ),
  route(
    "POST",
    "/api/v1/public/contact-requests",
    (ctx) =>
      success(
        {
          id: "contact-001",
          status: "received",
          payload: ctx.body,
        },
        ctx.requestId,
        "Contact request received",
        201,
      ),
    { authRequired: false },
  ),

  route("GET", "/api/v1/conversations", (ctx) =>
    success(demo.conversations, ctx.requestId),
  ),
  route("POST", "/api/v1/conversations", (ctx) =>
    success(
      {
        id: "conv-new",
        organizationId: ctx.user?.organizationId ?? demo.organization.id,
        subject:
          typeof (ctx.body as { subject?: unknown } | null)?.subject === "string"
            ? ((ctx.body as { subject: string }).subject as string)
            : "New conversation",
        status: "open",
        initiatedBy: "client",
        lastMessageAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ctx.requestId,
      "Conversation created",
      201,
    ),
  ),
  route("GET", "/api/v1/conversations/:convId/messages", (ctx) =>
    success(getConversationMessages(ctx.params.convId ?? ""), ctx.requestId),
  ),
  route("POST", "/api/v1/conversations/:convId/messages", (ctx) =>
    success(
      {
        id: "msg-new",
        conversationId: ctx.params.convId,
        senderUserId: ctx.user?.userId ?? "unknown",
        senderRole: ctx.user?.role ?? "viewer",
        content:
          typeof (ctx.body as { content?: unknown } | null)?.content === "string"
            ? ((ctx.body as { content: string }).content as string)
            : "",
        isRead: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ctx.requestId,
      "Message sent",
      201,
    ),
  ),
  route("GET", "/api/v1/conversations/unread-count", (ctx) =>
    success(
      {
        unreadCount: 1,
        total: 1,
        byOrg: [
          {
            orgId: demo.organization.id,
            orgName: demo.organization.name,
            count: 1,
          },
        ],
      },
      ctx.requestId,
    ),
  ),

  // Admin surface (super_admin)
  route(
    "GET",
    "/api/v1/admin",
    (ctx) =>
      success(
        {
          status: "ok",
          modules: ["organizations", "users", "monitoring", "audit"],
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/platform",
    (ctx) =>
      success(
        {
          totalOrganizations: 4,
          activeOrganizations: 3,
          totalUsers: 42,
          totalDatasets: 10,
          totalForecasts: 25,
          totalDecisions: 15,
          ingestionSuccessRate: 98.5,
          apiErrorRate: 0.3,
          avgLatencyMs: 42,
          metadata: standardMeta("platform"),
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/trends",
    (ctx) =>
      success(
        {
          points: [
            { date: "2026-02-22", value: 49 },
            { date: "2026-02-23", value: 51 },
          ],
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/errors",
    (ctx) => success({ count24h: 0, incidents: [] }, ctx.requestId),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/organizations/:orgId",
    (ctx) =>
      success(
        {
          orgId: ctx.params.orgId,
          health: "ok",
          adoptionRatePct: 62,
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/organizations/:orgId/mirror",
    (ctx) =>
      success(
        {
          orgId: ctx.params.orgId,
          mirror: true,
        },
        ctx.requestId,
      ),
    adminOnly,
  ),

  route(
    "GET",
    "/api/v1/admin/organizations",
    (ctx) =>
      paginateFrom(
        [
          {
            id: demo.organization.id,
            name: demo.organization.name,
            slug: "praedixa-demo-org",
            status: demo.organization.status,
            plan: "professional",
            contactEmail: "ops.client@praedixa.com",
            userCount: 42,
            siteCount: demo.sites.length,
            createdAt: demo.organization.createdAt,
          },
        ],
        ctx,
      ),
    adminOnly,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations",
    (ctx) =>
      success(
        {
          id: "org-new",
          created: true,
          input: ctx.body,
        },
        ctx.requestId,
        "Organization created",
        201,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId",
    (ctx) =>
      success(
        {
          id: ctx.params.orgId,
          name: demo.organization.name,
          slug: "praedixa-demo-org",
          status: demo.organization.status,
          plan: "professional",
          contactEmail: "ops.client@praedixa.com",
          sector: "Logistique",
          size: "200-500",
          userCount: 42,
          siteCount: demo.sites.length,
          createdAt: demo.organization.createdAt,
          sites: [
            {
              id: "site-lyon",
              name: "Lyon",
              city: "Lyon",
              departments: [{ id: "dpt-ops", name: "Operations", employeeCount: 120 }],
            },
            {
              id: "site-orleans",
              name: "Orleans",
              city: "Orleans",
              departments: [{ id: "dpt-log", name: "Logistique", employeeCount: 80 }],
            },
          ],
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/hierarchy",
    (ctx) =>
      success(
        {
          organizationId: ctx.params.orgId,
          sites: demo.sites,
          departments: demo.departments,
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/suspend",
    (ctx) =>
      success({ id: ctx.params.orgId, status: "suspended" }, ctx.requestId),
    adminOnly,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/reactivate",
    (ctx) => success({ id: ctx.params.orgId, status: "active" }, ctx.requestId),
    adminOnly,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/churn",
    (ctx) => success({ id: ctx.params.orgId, status: "churned" }, ctx.requestId),
    adminOnly,
  ),

  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/users",
    (ctx) =>
      success(
        [
          {
            id: "user-001",
            organizationId: ctx.params.orgId,
            email: "ops.client@praedixa.com",
            role: "org_admin",
          },
        ],
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/users/:userId",
    (ctx) =>
      success(
        {
          id: ctx.params.userId,
          organizationId: ctx.params.orgId,
          role: "org_admin",
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "PATCH",
    "/api/v1/admin/organizations/:orgId/users/:userId/role",
    (ctx) =>
      success(
        {
          id: ctx.params.userId,
          organizationId: ctx.params.orgId,
          patch: ctx.body,
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/users/invite",
    (ctx) =>
      success(
        {
          organizationId: ctx.params.orgId,
          invited: true,
          input: ctx.body,
        },
        ctx.requestId,
        "User invited",
        201,
      ),
    adminOnly,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/users/:userId/deactivate",
    (ctx) => success({ id: ctx.params.userId, status: "deactivated" }, ctx.requestId),
    adminOnly,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/users/:userId/reactivate",
    (ctx) => success({ id: ctx.params.userId, status: "active" }, ctx.requestId),
    adminOnly,
  ),

  route(
    "GET",
    "/api/v1/admin/billing/organizations/:orgId",
    (ctx) =>
      success(
        {
          organizationId: ctx.params.orgId,
          plan: "professional",
          billingCycle: "monthly",
          monthlyAmount: 7500,
          currentUsage: 42,
          usageLimit: 100,
          nextBillingDate: "2026-03-01",
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "POST",
    "/api/v1/admin/billing/organizations/:orgId/change-plan",
    (ctx) =>
      success(
        {
          organizationId: ctx.params.orgId,
          changed: true,
          input: ctx.body,
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/billing/organizations/:orgId/history",
    (ctx) =>
      success(
        [
          {
            organizationId: ctx.params.orgId,
            from: "starter",
            to: "professional",
            at: "2026-01-01",
          },
        ],
        ctx.requestId,
      ),
    adminOnly,
  ),

  route(
    "GET",
    "/api/v1/admin/audit-log",
    (ctx) =>
      paginateFrom(
        [
          {
            id: "aud-001",
            action: "decision.review",
            actor: "super_admin",
            createdAt: new Date().toISOString(),
          },
        ],
        ctx,
      ),
    adminOnly,
  ),

  route(
    "GET",
    "/api/v1/admin/onboarding",
    (ctx) =>
      paginateFrom(
        [
          {
            id: "onb-001",
            organizationId: demo.organization.id,
            currentStep: 2,
            totalSteps: 5,
          },
        ],
        ctx,
      ),
    adminOnly,
  ),
  route(
    "POST",
    "/api/v1/admin/onboarding",
    (ctx) =>
      success(
        {
          id: "onb-new",
          created: true,
          input: ctx.body,
        },
        ctx.requestId,
        "Onboarding started",
        201,
      ),
    adminOnly,
  ),
  route(
    "PATCH",
    "/api/v1/admin/onboarding/:onboardingId/step/:step",
    (ctx) =>
      success(
        {
          id: ctx.params.onboardingId,
          currentStep: Number(ctx.params.step),
        },
        ctx.requestId,
      ),
    adminOnly,
  ),

  route(
    "GET",
    "/api/v1/admin/monitoring/alerts/summary",
    (ctx) => success({ totalAlerts: 12 }, ctx.requestId),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/alerts/by-org",
    (ctx) =>
      success(
        [{ organizationId: demo.organization.id, alerts: 12 }],
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/scenarios/summary",
    (ctx) => success({ scenariosGenerated: 31 }, ctx.requestId),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/decisions/summary",
    (ctx) => success({ totalDecisions: 48 }, ctx.requestId),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/decisions/overrides",
    (ctx) => success({ overrideRatePct: 21.4 }, ctx.requestId),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/decisions/adoption",
    (ctx) => success({ adoptionRatePct: 62.5 }, ctx.requestId),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/proof-packs/summary",
    (ctx) => success({ generatedMonthly: 1 }, ctx.requestId),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/canonical-coverage",
    (ctx) => success({ coveragePct: 98.7 }, ctx.requestId),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/cost-params/missing",
    (ctx) => success({ missingCount: 0, items: [] }, ctx.requestId),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/roi/by-org",
    (ctx) =>
      success(
        [
          {
            organizationId: demo.organization.id,
            gainNetVsBauEur: 15200,
          },
        ],
        ctx.requestId,
      ),
    adminOnly,
  ),

  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/canonical",
    (ctx) =>
      success(
        [
          {
            organizationId: ctx.params.orgId,
            siteId: "site-lyon",
            date: "2026-02-24",
            shift: "PM",
          },
        ],
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/canonical/quality",
    (ctx) =>
      success(
        {
          organizationId: ctx.params.orgId,
          completenessPct: 98.7,
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/cost-params",
    (ctx) =>
      success(
        [
          {
            organizationId: ctx.params.orgId,
            siteId: "site-lyon",
            internalHourlyCostEur: 19.9,
          },
        ],
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/alerts",
    (ctx) =>
      success(
        [
          {
            organizationId: ctx.params.orgId,
            id: "alt-001",
            severity: "high",
          },
        ],
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/scenarios",
    (ctx) =>
      success(
        [
          {
            organizationId: ctx.params.orgId,
            id: "scn-001",
            recommended: true,
          },
        ],
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/proof-packs",
    (ctx) =>
      success(
        [
          {
            organizationId: ctx.params.orgId,
            id: "pf-001",
            month: "2026-02",
          },
        ],
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/ingestion-log",
    (ctx) =>
      success(
        [
          {
            organizationId: ctx.params.orgId,
            id: "ing-001",
            status: "success",
          },
        ],
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/medallion-quality-report",
    (ctx) =>
      success(
        {
          organizationId: ctx.params.orgId,
          qualityScore: 98.2,
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/datasets/:datasetId/data",
    (ctx) =>
      success(
        {
          organizationId: ctx.params.orgId,
          datasetId: ctx.params.datasetId,
          rows: [{ id: "row-001" }],
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/datasets/:datasetId/features",
    (ctx) =>
      success(
        {
          organizationId: ctx.params.orgId,
          datasetId: ctx.params.datasetId,
          features: ["lag_7", "rolling_mean_14"],
        },
        ctx.requestId,
      ),
    adminOnly,
  ),

  route(
    "GET",
    "/api/v1/admin/conversations",
    (ctx) => success(demo.conversations, ctx.requestId),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/conversations",
    (ctx) =>
      success(
        [
          {
            ...((demo.conversations as Record<string, unknown>[])[0] ?? {}),
            organizationId: ctx.params.orgId,
          },
        ],
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/conversations/:convId/messages",
    (ctx) => success(getConversationMessages(ctx.params.convId ?? ""), ctx.requestId),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/conversations/unread-count",
    (ctx) =>
      success(
        {
          unreadCount: 1,
          total: 1,
          byOrg: [
            {
              orgId: demo.organization.id,
              orgName: demo.organization.name,
              count: 1,
            },
          ],
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/conversations/:convId",
    (ctx) =>
      success(
        {
          id: ctx.params.convId,
          status: "open",
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "POST",
    "/api/v1/admin/conversations/:convId/messages",
    (ctx) =>
      success(
        {
          id: "msg-admin-new",
          conversationId: ctx.params.convId,
          content:
            typeof (ctx.body as { content?: unknown } | null)?.content === "string"
              ? ((ctx.body as { content: string }).content as string)
              : "",
        },
        ctx.requestId,
        "Message sent",
        201,
      ),
    adminOnly,
  ),
  route(
    "PATCH",
    "/api/v1/admin/conversations/:convId",
    (ctx) =>
      success(
        {
          id: ctx.params.convId,
          patch: ctx.body,
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/contact-requests",
    (ctx) =>
      paginateFrom(
        [
          {
            id: "cr-001",
            companyName: "Acme Logistics",
            status: "new",
          },
        ],
        ctx,
      ),
    adminOnly,
  ),
  route(
    "PATCH",
    "/api/v1/admin/contact-requests/:requestId/status",
    (ctx) =>
      success(
        {
          id: ctx.params.requestId,
          patch: ctx.body,
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
];
