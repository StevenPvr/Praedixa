import { randomUUID } from "node:crypto";
import { z } from "zod";

import {
  completeIntegrationAuthorization,
  IntegrationInputError,
  createIntegrationConnection,
  getIntegrationConnection,
  getIntegrationRawEventPayload,
  issueIntegrationIngestCredential,
  listIntegrationAuditEvents,
  listIntegrationCatalog,
  listIntegrationConnections,
  listIntegrationIngestCredentials,
  listIntegrationRawEvents,
  listIntegrationSyncRuns,
  revokeIntegrationIngestCredential,
  startIntegrationAuthorization,
  testIntegrationConnection,
  triggerIntegrationSync,
  updateIntegrationConnection,
} from "./admin-integrations.js";
import { demo } from "./mock-data.js";
import { failure, paginated, success } from "./response.js";
import { route } from "./router.js";
import {
  getDecisionConfigService,
  getDefaultHorizon,
  getHorizonById,
  pickRecommendedOptionId,
  type DecisionEngineConfigPayload,
} from "./services/decision-config.js";
import {
  getAdminBackofficeService,
  isAdminBackofficeError,
} from "./services/admin-backoffice.js";
import {
  acknowledgePersistentCoverageAlert,
  getPersistentCanonicalQuality,
  getPersistentLiveDashboardSummary,
  listPersistentCanonicalRecords,
  listPersistentCoverageAlerts,
  listPersistentForecastRuns,
  listPersistentLatestDailyForecasts,
  listPersistentOnboardings,
  listPersistentProofRecords,
  mapAdminAlertItem,
  mapAdminCanonicalItem,
  mapAdminCanonicalQuality,
  resolvePersistentCoverageAlert,
  summarizePersistentProofRecords,
  type SiteAccessScope,
} from "./services/operational-data.js";
import {
  PersistenceError,
  canUsePersistentStore,
  hasPersistentDatabase,
  isUuidString,
} from "./services/persistence.js";
import {
  getPersistentAdminOrgMetrics,
  getPersistentAdminOrgMirror,
  getPersistentMonitoringAlertsByOrg,
  getPersistentMonitoringAlertsSummary,
  getPersistentMonitoringCanonicalCoverage,
  getPersistentMonitoringMissingCostParams,
  getPersistentMonitoringDecisionsAdoption,
  getPersistentMonitoringDecisionsOverrides,
  getPersistentMonitoringDecisionsSummary,
  getPersistentMonitoringErrors,
  getPersistentMonitoringProofPacksSummary,
  getPersistentMonitoringRoiByOrg,
  getPersistentMonitoringScenariosSummary,
  getPersistentMonitoringTrends,
  getPersistentPlatformKpis,
} from "./services/admin-monitoring.js";
import {
  getPersistentGoldCoverage,
  getPersistentGoldProvenance,
  getPersistentGoldSchema,
  listPersistentGoldRows,
} from "./services/gold-explorer.js";
import type {
  RouteContext,
  RouteDefinition,
  RouteRateLimit,
  UserRole,
} from "./types.js";

const ORGANIZATION_ID = "11111111-1111-1111-1111-111111111111";
const NOW = new Date();
const DAY_MS = 24 * 60 * 60 * 1000;
const ORG_WIDE_SITE_ACCESS_ROLES = new Set<UserRole>([
  "super_admin",
  "org_admin",
  "hr_manager",
]);
const CONTACT_REQUEST_TYPES = [
  "founding_pilot",
  "product_demo",
  "partnership",
  "press_other",
] as const;
const publicContactRateLimit: RouteRateLimit = {
  maxRequests: 5,
  scope: "ip",
  windowMs: 10 * 60_000,
};
const messagingReadRateLimit: RouteRateLimit = {
  maxRequests: 120,
  scope: "principal",
  windowMs: 60_000,
};
const messagingWriteRateLimit: RouteRateLimit = {
  maxRequests: 20,
  scope: "principal",
  windowMs: 60_000,
};
const contactRequestSchema = z
  .object({
    locale: z.enum(["fr", "en"]).optional(),
    requestType: z.enum(CONTACT_REQUEST_TYPES).optional(),
    companyName: z.string().trim().min(1).max(100),
    firstName: z.string().trim().max(80).optional().default(""),
    lastName: z.string().trim().max(80).optional().default(""),
    role: z.string().trim().max(80).optional().default(""),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().max(30).optional().default(""),
    subject: z.string().trim().max(120).optional().default(""),
    message: z.string().trim().min(30).max(800),
    consent: z.literal(true),
    website: z.string().trim().max(200).optional().default(""),
  })
  .passthrough();
const conversationCreateSchema = z.object({
  subject: z.string().trim().min(1).max(120),
});
const messageCreateSchema = z.object({
  content: z.string().trim().min(1).max(4000),
});

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
  horizon: string;
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
  horizon: string;
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

let conversations: Array<Record<string, unknown>> = [
  ...((demo.conversations as Record<string, unknown>[]) ?? []),
];
let conversationMessages: Array<Record<string, unknown>> = [
  ...((demo.messages as Record<string, unknown>[]) ?? []),
];

function listConversationsForOrganization(
  organizationId: string,
): Record<string, unknown>[] {
  return conversations.filter(
    (entry) => String(entry.organizationId ?? "") === organizationId,
  );
}

function getConversationForOrganization(
  organizationId: string,
  conversationId: string,
): Record<string, unknown> | null {
  return (
    listConversationsForOrganization(organizationId).find(
      (entry) => String(entry.id ?? "") === conversationId,
    ) ?? null
  );
}

function getConversationMessages(conversationId: string): Record<string, unknown>[] {
  return conversationMessages.filter(
    (entry) => String(entry.conversationId ?? "") === conversationId,
  );
}

const SUPPORT_THREAD_ID = "support-thread-001";
let supportThreadMessages: Array<Record<string, unknown>> = [
  {
    id: "support-msg-001",
    organizationId: ORGANIZATION_ID,
    threadId: SUPPORT_THREAD_ID,
    authorType: "support",
    authorId: "agent-01",
    content: "Bonjour, nous suivons votre flux. N'hesitez pas a nous decrire le contexte.",
    createdAt: isoDateTimeOffset(-1, 10),
    updatedAt: isoDateTimeOffset(-1, 10),
  },
];

function getSupportThreadMessages(organizationId: string): Record<string, unknown>[] {
  return supportThreadMessages.filter(
    (entry) => String(entry.organizationId ?? "") === organizationId,
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

async function resolveDecisionConfig(
  ctx: RouteContext,
  siteId?: string | null,
): Promise<{
  organizationId: string;
  siteId: string | null;
  versionId: string;
  effectiveAt: string;
  payload: DecisionEngineConfigPayload;
  nextVersion: { id: string; effectiveAt: string } | null;
}> {
  const service = getDecisionConfigService();
  return service.resolveConfig({
    organizationId: ctx.user?.organizationId ?? ORGANIZATION_ID,
    siteId: siteId ?? null,
  });
}

function activeHorizonIds(payload: DecisionEngineConfigPayload): Set<string> {
  return new Set(
    payload.horizons
      .filter((horizon) => horizon.active)
      .map((horizon) => horizon.id),
  );
}

async function filteredCoverageAlerts(
  ctx: RouteContext,
): Promise<CoverageAlertRecord[]> {
  const status = ctx.query.get("status");
  const severity = ctx.query.get("severity");
  const siteId = ctx.query.get("site_id");
  const dateFrom = ctx.query.get("date_from");
  const dateTo = ctx.query.get("date_to");
  const horizonId =
    (ctx.query.get("horizon_id") ?? ctx.query.get("horizon"))?.trim() ?? "";
  const config = await resolveDecisionConfig(ctx, siteId);
  const activeHorizons = activeHorizonIds(config.payload);

  const service = getAdminBackofficeService();
  const source = shouldUsePersistentLiveData(ctx)
    ? await service.listCoverageAlerts({
        organizationId: scopedOrganizationId(ctx),
        status,
        severity,
        siteId,
        dateFrom,
        dateTo,
        horizonId,
      })
    : COVERAGE_ALERTS;

  return filterByAccessibleSites(ctx, source, (alert) => alert.siteId)
    .filter((alert) => {
    if (!activeHorizons.has(alert.horizon)) {
      return false;
    }
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
    if (horizonId.length > 0 && alert.horizon !== horizonId) {
      return false;
    }
    return true;
    })
    .map((alert) => ({
      ...alert,
      organizationId: scopedOrganizationId(ctx),
    }));
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

  return filterByAccessibleSites(ctx, CANONICAL_ROWS, (row) => row.siteId)
    .filter((row) => {
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
    })
    .map((row) => ({
      ...row,
      organizationId: scopedOrganizationId(ctx),
    }));
}

function filteredGoldRows(ctx: RouteContext): GoldRowRecord[] {
  const siteId = ctx.query.get("site_id");
  const dateFrom = ctx.query.get("date_from");
  const dateTo = ctx.query.get("date_to");
  const search = (ctx.query.get("search") ?? "").trim().toLowerCase();

  return filterByAccessibleSites(ctx, GOLD_ROWS, (row) => row.site_id).filter(
    (row) => {
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
    },
  );
}

function findCoverageAlert(alertId: string): CoverageAlertRecord | null {
  return COVERAGE_ALERTS.find((entry) => entry.id === alertId) ?? null;
}

async function findAccessibleCoverageAlert(
  ctx: RouteContext,
  alertId: string,
): Promise<CoverageAlertRecord | null> {
  const service = getAdminBackofficeService();
  const alert = service.hasDatabase()
    ? await service.getCoverageAlert(scopedOrganizationId(ctx), alertId)
    : findCoverageAlert(alertId);
  if (alert == null || !isSiteAccessibleToUser(ctx, alert.siteId)) {
    return null;
  }

  return {
    ...alert,
    organizationId: scopedOrganizationId(ctx),
  };
}

async function findAdminCoverageAlert(
  organizationId: string,
  alertId: string,
): Promise<CoverageAlertRecord | null> {
  const service = getAdminBackofficeService();
  const alert = service.hasDatabase()
    ? await service.getCoverageAlert(organizationId, alertId)
    : findCoverageAlert(alertId);

  return alert == null
    ? null
    : {
        ...alert,
        organizationId,
      };
}

function resolveActiveHorizon(
  payload: DecisionEngineConfigPayload,
  requestedHorizonId?: string | null,
): { id: string; label: string; days: number } | null {
  const trimmedRequested = requestedHorizonId?.trim() ?? "";
  const requested =
    trimmedRequested.length > 0
      ? getHorizonById(payload, trimmedRequested)
      : null;
  if (requested?.active) {
    return {
      id: requested.id,
      label: requested.label,
      days: requested.days,
    };
  }

  const activeDefault = getDefaultHorizon(payload);
  if (activeDefault?.active) {
    return {
      id: activeDefault.id,
      label: activeDefault.label,
      days: activeDefault.days,
    };
  }

  const firstActive =
    [...payload.horizons]
      .filter((horizon) => horizon.active)
      .sort((left, right) => left.rank - right.rank)[0] ?? null;
  if (firstActive) {
    return {
      id: firstActive.id,
      label: firstActive.label,
      days: firstActive.days,
    };
  }

  const fallback = [...payload.horizons].sort(
    (left, right) => left.rank - right.rank,
  )[0];
  if (!fallback) {
    return null;
  }
  return {
    id: fallback.id,
    label: fallback.label,
    days: fallback.days,
  };
}

function applyScenarioRecommendationPolicy(
  options: ReturnType<typeof buildScenarioOptions>,
  payload: DecisionEngineConfigPayload,
  preferredHorizonId: string | null,
  recommendationPolicyVersion: string,
): {
  options: ReturnType<typeof buildScenarioOptions>;
  recommendedOptionId: string | null;
  policyHorizonId: string | null;
} {
  const enabledOptionTypes = new Set<string>(
    payload.optionCatalog
      .filter((rule) => rule.enabled)
      .map((rule) => rule.optionType),
  );

  const filteredOptions = options.filter((option) =>
    enabledOptionTypes.has(option.optionType),
  );

  const activeHorizon = resolveActiveHorizon(payload, preferredHorizonId);
  if (!activeHorizon) {
    return {
      options: filteredOptions.map((option) => ({
        ...option,
        recommendationPolicyVersion,
        isRecommended: false,
      })),
      recommendedOptionId: null,
      policyHorizonId: null,
    };
  }

  const recommendedOptionId = pickRecommendedOptionId(
    filteredOptions,
    payload,
    activeHorizon.id,
  );

  return {
    options: filteredOptions.map((option) => ({
      ...option,
      recommendationPolicyVersion,
      isRecommended: option.id === recommendedOptionId,
    })),
    recommendedOptionId,
    policyHorizonId: activeHorizon.id,
  };
}

function buildScenarioOptions(
  alertId: string,
  recommendationPolicyVersion = "policy-v3",
) {
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
      recommendationPolicyVersion,
      isParetoOptimal: true,
      isRecommended: false,
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
      recommendationPolicyVersion,
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
      recommendationPolicyVersion,
      isParetoOptimal: false,
      isRecommended: false,
      contraintesJson: { competencesCritiquesDisponibles: false },
      createdAt: isoDateTimeOffset(0, 6),
      updatedAt: isoDateTimeOffset(0, 6),
    },
  ];

  return options;
}

const adminAllowedRoles = ["super_admin"] as const;
const adminOnly = { allowedRoles: adminAllowedRoles };
const adminConsoleAccess = {
  ...adminOnly,
  requiredPermissions: ["admin:console:access"] as const,
};
const adminMonitoringRead = {
  ...adminOnly,
  requiredPermissions: ["admin:monitoring:read"] as const,
};
const adminOrgRead = {
  ...adminOnly,
  requiredPermissions: ["admin:org:read"] as const,
};
const adminOrgWrite = {
  ...adminOnly,
  requiredPermissions: ["admin:org:write"] as const,
};
const adminUsersRead = {
  ...adminOnly,
  requiredPermissions: ["admin:users:read"] as const,
};
const adminUsersWrite = {
  ...adminOnly,
  requiredPermissions: ["admin:users:write"] as const,
};
const adminBillingRead = {
  ...adminOnly,
  requiredPermissions: ["admin:billing:read"] as const,
};
const adminBillingWrite = {
  ...adminOnly,
  requiredPermissions: ["admin:billing:write"] as const,
};
const adminAuditRead = {
  ...adminOnly,
  requiredPermissions: ["admin:audit:read"] as const,
};
const adminOnboardingRead = {
  ...adminOnly,
  requiredPermissions: ["admin:onboarding:read"] as const,
};
const adminOnboardingWrite = {
  ...adminOnly,
  requiredPermissions: ["admin:onboarding:write"] as const,
};
const adminMessagesRead = {
  ...adminOnly,
  requiredPermissions: ["admin:messages:read"] as const,
};
const adminMessagesWrite = {
  ...adminOnly,
  requiredPermissions: ["admin:messages:write"] as const,
};
const adminSupportRead = {
  ...adminOnly,
  requiredPermissions: ["admin:support:read"] as const,
};
const adminSupportWrite = {
  ...adminOnly,
  requiredPermissions: ["admin:support:write"] as const,
};
const adminIntegrationsRead = {
  ...adminOnly,
  requiredPermissions: ["admin:integrations:read"] as const,
};
const adminIntegrationsWrite = {
  ...adminOnly,
  requiredPermissions: ["admin:integrations:write"] as const,
};

function integrationFailureResponse(
  error: unknown,
  requestId: string,
  fallbackCode: string,
  fallbackMessage: string,
) {
  if (error instanceof IntegrationInputError) {
    return failure(
      fallbackCode,
      error.message,
      requestId,
      error.statusCode,
      error.details,
    );
  }

  return failure(
    fallbackCode,
    fallbackMessage,
    requestId,
    400,
  );
}

function backofficeFailureResponse(
  error: unknown,
  requestId: string,
  fallbackCode: string,
  fallbackMessage: string,
) {
  if (isAdminBackofficeError(error)) {
    return failure(
      error.code,
      error.message,
      requestId,
      error.statusCode,
      error.details,
    );
  }

  return failure(
    fallbackCode,
    fallbackMessage,
    requestId,
    400,
  );
}

function operationalFailureResponse(
  error: unknown,
  requestId: string,
  fallbackCode: string,
  fallbackMessage: string,
) {
  if (error instanceof PersistenceError) {
    return failure(
      error.code,
      error.message,
      requestId,
      error.statusCode,
      error.details,
    );
  }

  return failure(
    fallbackCode,
    fallbackMessage,
    requestId,
    400,
  );
}

const ADMIN_ASSIGNABLE_ROLES = [
  "org_admin",
  "hr_manager",
  "manager",
  "employee",
  "viewer",
] as const;

type AdminAssignableRole = (typeof ADMIN_ASSIGNABLE_ROLES)[number];

interface AdminUserRecord {
  id: string;
  organizationId: string;
  fullName: string | null;
  email: string;
  role: AdminAssignableRole;
  status: "pending_invite" | "active" | "deactivated";
  siteName: string | null;
  lastLoginAt: string | null;
  invitedAt: string;
  invitedBy: string | null;
  updatedAt: string;
}

const ADMIN_ASSIGNABLE_ROLE_SET = new Set<string>(ADMIN_ASSIGNABLE_ROLES);
const adminUsersByOrganization = new Map<string, AdminUserRecord[]>();

function listOrgUsers(orgId: string): AdminUserRecord[] {
  return adminUsersByOrganization.get(orgId) ?? [];
}

function getOrgUserCount(orgId: string): number {
  return listOrgUsers(orgId).length;
}

function findOrgUser(orgId: string, userId: string): AdminUserRecord | null {
  return listOrgUsers(orgId).find((user) => user.id === userId) ?? null;
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isDemoModeEnabled(): boolean {
  return process.env.DEMO_MODE?.trim().toLowerCase() === "true";
}

function noDemoFallbackResponse(
  requestId: string,
  feature: string,
  organizationId?: string,
) {
  if (isDemoModeEnabled()) {
    return null;
  }

  if (organizationId != null && organizationId.length > 0 && !isUuidString(organizationId)) {
    return failure(
      "INVALID_ORGANIZATION_ID",
      "Organization id must be a UUID outside explicit demo mode.",
      requestId,
      400,
      { organizationId, feature },
    );
  }

  if (!hasPersistentDatabase()) {
    return failure(
      "PERSISTENCE_UNAVAILABLE",
      `${feature} requires DATABASE_URL when DEMO_MODE is false.`,
      requestId,
      503,
      { feature },
    );
  }

  return failure(
    "PERSISTENCE_NOT_IMPLEMENTED",
    `${feature} is unavailable because DEMO_MODE is false and no persistent implementation is configured.`,
    requestId,
    501,
    { feature },
  );
}

function normalizeEmail(value: unknown): string | null {
  const email = normalizeOptionalText(value)?.toLowerCase() ?? null;
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function normalizeAdminRole(value: unknown): AdminAssignableRole | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!ADMIN_ASSIGNABLE_ROLE_SET.has(normalized)) return null;
  return normalized as AdminAssignableRole;
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function buildDefaultFullName(email: string): string {
  const prefix = email.split("@")[0] ?? "";
  const cleaned = prefix.replace(/[._-]+/g, " ").trim();
  if (cleaned.length === 0) {
    return "Utilisateur";
  }
  return cleaned
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function cloneAdminUser(user: AdminUserRecord): AdminUserRecord {
  return { ...user };
}

function isUserRole(value: unknown): value is UserRole {
  return (
    value === "super_admin" ||
    value === "org_admin" ||
    value === "hr_manager" ||
    value === "manager" ||
    value === "employee" ||
    value === "viewer"
  );
}

function scopedOrganizationId(ctx: RouteContext): string {
  return ctx.user?.organizationId ?? ORGANIZATION_ID;
}

function liveFallbackFailure(
  ctx: RouteContext,
  feature: string,
) {
  return noDemoFallbackResponse(
    ctx.requestId,
    feature,
    scopedOrganizationId(ctx),
  );
}

function withDemoFallback(
  ctx: RouteContext,
  feature: string,
  resolve: () => ReturnType<typeof success> | ReturnType<typeof paginated> | ReturnType<typeof failure>,
  organizationId = scopedOrganizationId(ctx),
) {
  const fallback = noDemoFallbackResponse(
    ctx.requestId,
    feature,
    organizationId,
  );
  return fallback ?? resolve();
}

const SAFE_PROOF_PACK_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

function normalizeProofPackId(
  value: string | null,
): string | null {
  const trimmed = normalizeOptionalText(value);
  if (trimmed == null) {
    return null;
  }

  return SAFE_PROOF_PACK_ID_PATTERN.test(trimmed) ? trimmed : null;
}

function normalizedAccessibleSiteIds(ctx: RouteContext): Set<string> {
  return new Set(
    (ctx.user?.siteIds ?? [])
      .map((siteId) => siteId.trim())
      .filter((siteId) => siteId.length > 0),
  );
}

function hasOrganizationWideSiteAccess(ctx: RouteContext): boolean {
  const role = ctx.user?.role;
  return role != null && ORG_WIDE_SITE_ACCESS_ROLES.has(role);
}

function isSiteAccessibleToUser(
  ctx: RouteContext,
  siteId: string | null | undefined,
): boolean {
  const normalizedSiteId = normalizeOptionalText(siteId);
  if (normalizedSiteId == null) {
    return true;
  }

  if (hasOrganizationWideSiteAccess(ctx)) {
    return true;
  }

  const accessibleSiteIds = normalizedAccessibleSiteIds(ctx);
  return accessibleSiteIds.size > 0 && accessibleSiteIds.has(normalizedSiteId);
}

function filterByAccessibleSites<T>(
  ctx: RouteContext,
  items: readonly T[],
  getSiteId: (item: T) => string | null | undefined,
): T[] {
  if (hasOrganizationWideSiteAccess(ctx)) {
    return [...items];
  }

  const accessibleSiteIds = normalizedAccessibleSiteIds(ctx);
  if (accessibleSiteIds.size === 0) {
    return [];
  }

  return items.filter((item) => {
    const siteId = normalizeOptionalText(getSiteId(item));
    return siteId != null && accessibleSiteIds.has(siteId);
  });
}

function forbiddenSiteScope(
  ctx: RouteContext,
  siteId: string | null | undefined,
) {
  const normalizedSiteId = normalizeOptionalText(siteId);
  if (normalizedSiteId == null || isSiteAccessibleToUser(ctx, normalizedSiteId)) {
    return null;
  }

  return failure(
    "FORBIDDEN",
    "Requested site is outside your access scope",
    ctx.requestId,
    403,
    { siteId: normalizedSiteId },
  );
}

function buildPersistentSiteScope(
  ctx: RouteContext,
  requestedSiteId: string | null | undefined,
): SiteAccessScope {
  return {
    orgWide: hasOrganizationWideSiteAccess(ctx),
    accessibleSiteIds: [...normalizedAccessibleSiteIds(ctx)],
    requestedSiteId: normalizeOptionalText(requestedSiteId),
  };
}

function shouldUsePersistentLiveData(ctx: RouteContext): boolean {
  return canUsePersistentStore(scopedOrganizationId(ctx));
}

function shouldUsePersistentAdminOrgData(orgId: string): boolean {
  return canUsePersistentStore(orgId);
}

export const routes: RouteDefinition[] = [
  route(
    "GET",
    "/api/v1/health",
    (ctx) =>
      success(
        {
          status: "healthy",
          timestamp: new Date().toISOString(),
          checks: [{ name: "api-ts", status: "pass" }],
        },
        ctx.requestId,
      ),
    { authRequired: false },
  ),

  // Webapp surface
  route("GET", "/api/v1/live/dashboard/summary", async (ctx) => {
    const siteId = ctx.query.get("site_id");
    const siteScopeError = forbiddenSiteScope(ctx, siteId);
    if (siteScopeError) {
      return siteScopeError;
    }
    if (shouldUsePersistentLiveData(ctx)) {
      try {
        const config = await resolveDecisionConfig(ctx, siteId);
        return success(
          await getPersistentLiveDashboardSummary({
            organizationId: scopedOrganizationId(ctx),
            scope: buildPersistentSiteScope(ctx, siteId),
            horizonIds: [...activeHorizonIds(config.payload)],
          }),
          ctx.requestId,
        );
      } catch (error) {
        return operationalFailureResponse(
          error,
          ctx.requestId,
          "LIVE_DASHBOARD_FAILED",
          "Unable to load live dashboard summary",
        );
      }
    }

    const fallbackFailure = liveFallbackFailure(ctx, "Live dashboard summary");
    if (fallbackFailure) {
      return fallbackFailure;
    }

    const scopedCanonical = CANONICAL_ROWS.filter((row) =>
      filterByAccessibleSites(ctx, CANONICAL_ROWS, (candidate) => candidate.siteId).includes(
        row,
      ) && (siteId == null || siteId.length === 0 ? true : row.siteId === siteId),
    );
    const config = await resolveDecisionConfig(ctx, siteId);
    const activeHorizons = activeHorizonIds(config.payload);
    const scopedAlerts = filterByAccessibleSites(ctx, COVERAGE_ALERTS, (alert) => alert.siteId)
      .filter((alert) => {
      if (alert.status !== "open") return false;
      if (!activeHorizons.has(alert.horizon)) return false;
      return siteId == null || siteId.length === 0 ? true : alert.siteId === siteId;
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

    return success(
      {
        coverageHuman,
        coverageMerchandise: Number((coverageHuman + 1.8).toFixed(1)),
        activeAlertsCount: scopedAlerts.length,
        forecastAccuracy: 92.4,
        lastForecastDate: latestForecastDate,
      },
      ctx.requestId,
    );
  }),
  route("GET", "/api/v1/live/forecasts", async (ctx) => {
    const status = normalizeOptionalText(ctx.query.get("status"));
    if (shouldUsePersistentLiveData(ctx)) {
      try {
        return success(
          await listPersistentForecastRuns({
            organizationId: scopedOrganizationId(ctx),
            status: status === "all" ? null : status,
          }),
          ctx.requestId,
        );
      } catch (error) {
        return operationalFailureResponse(
          error,
          ctx.requestId,
          "LIVE_FORECASTS_FAILED",
          "Unable to load live forecasts",
        );
      }
    }

    const fallbackFailure = noDemoFallbackResponse(
      ctx.requestId,
      "Live forecasts",
      scopedOrganizationId(ctx),
    );
    if (fallbackFailure) {
      return fallbackFailure;
    }

    return success(
      LIVE_FORECAST_RUNS.filter((row) => {
        if (status == null || status === "all") {
          return true;
        }
        return row.status === status;
      }),
      ctx.requestId,
    );
  }),
  route("GET", "/api/v1/live/forecasts/latest/daily", async (ctx) => {
    const dimension = (ctx.query.get("dimension") ?? "human").trim();
    const siteId = ctx.query.get("site_id");
    const siteScopeError = forbiddenSiteScope(ctx, siteId);
    if (siteScopeError) {
      return siteScopeError;
    }
    const requestedHorizonId =
      (ctx.query.get("horizon_id") ?? ctx.query.get("horizon"))?.trim() ?? "";
    const config = await resolveDecisionConfig(ctx, siteId);
    const resolvedHorizon = resolveActiveHorizon(
      config.payload,
      requestedHorizonId,
    );
    const horizonDays = resolvedHorizon?.days ?? 7;
    const dateFrom = NOW.toISOString().slice(0, 10);
    const dateTo = new Date(
      NOW.getTime() + Math.max(0, horizonDays - 1) * DAY_MS,
    )
      .toISOString()
      .slice(0, 10);

    if (shouldUsePersistentLiveData(ctx)) {
      try {
        return success(
          await listPersistentLatestDailyForecasts({
            organizationId: scopedOrganizationId(ctx),
            scope: buildPersistentSiteScope(ctx, siteId),
            dimension,
            dateFrom,
            dateTo,
          }),
          ctx.requestId,
        );
      } catch (error) {
        return operationalFailureResponse(
          error,
          ctx.requestId,
          "LIVE_LATEST_FORECASTS_FAILED",
          "Unable to load latest daily forecasts",
        );
      }
    }

    const fallbackFailure = noDemoFallbackResponse(
      ctx.requestId,
      "Live latest daily forecasts",
      scopedOrganizationId(ctx),
    );
    if (fallbackFailure) {
      return fallbackFailure;
    }

    return success(
      filterByAccessibleSites(ctx, FORECAST_DAILY, (row) => row.siteId)
        .filter((row) => {
          if (row.dimension !== dimension) return false;
          if (siteId != null && siteId.length > 0 && row.siteId !== siteId) {
            return false;
          }
          if (row.forecastDate < dateFrom) return false;
          if (row.forecastDate > dateTo) return false;
          return true;
        })
        .sort((a, b) => a.forecastDate.localeCompare(b.forecastDate)),
      ctx.requestId,
    );
  }),
  route("GET", "/api/v1/live/decision-config", async (ctx) => {
    const siteId = ctx.query.get("site_id");
    const siteScopeError = forbiddenSiteScope(ctx, siteId);
    if (siteScopeError) {
      return siteScopeError;
    }
    const requestedHorizonId =
      (ctx.query.get("horizon_id") ?? ctx.query.get("horizon"))?.trim() ?? "";
    const config = await resolveDecisionConfig(ctx, siteId);
    const selectedHorizon = resolveActiveHorizon(
      config.payload,
      requestedHorizonId,
    );

    return success(
      {
        ...config,
        selectedHorizon,
      },
      ctx.requestId,
    );
  }),
  route("GET", "/api/v1/live/gold/schema", async (ctx) => {
    if (shouldUsePersistentLiveData(ctx)) {
      try {
        return success(
          await getPersistentGoldSchema({
            organizationId: scopedOrganizationId(ctx),
            scope: buildPersistentSiteScope(ctx, ctx.query.get("site_id")),
          }),
          ctx.requestId,
        );
      } catch (error) {
        return operationalFailureResponse(
          error,
          ctx.requestId,
          "LIVE_GOLD_SCHEMA_FAILED",
          "Unable to load Gold schema",
        );
      }
    }

    const fallbackFailure = noDemoFallbackResponse(
      ctx.requestId,
      "Live Gold schema",
      scopedOrganizationId(ctx),
    );
    if (fallbackFailure) {
      return fallbackFailure;
    }

    return success(
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
    );
  }),
  route("GET", "/api/v1/live/gold/rows", async (ctx) => {
    if (shouldUsePersistentLiveData(ctx)) {
      try {
        return paginateFrom(
          await listPersistentGoldRows({
            organizationId: scopedOrganizationId(ctx),
            scope: buildPersistentSiteScope(ctx, ctx.query.get("site_id")),
            dateFrom: normalizeOptionalText(ctx.query.get("date_from")),
            dateTo: normalizeOptionalText(ctx.query.get("date_to")),
          }),
          ctx,
        );
      } catch (error) {
        return operationalFailureResponse(
          error,
          ctx.requestId,
          "LIVE_GOLD_ROWS_FAILED",
          "Unable to load Gold rows",
        );
      }
    }

    const fallbackFailure = noDemoFallbackResponse(
      ctx.requestId,
      "Live Gold rows",
      scopedOrganizationId(ctx),
    );
    if (fallbackFailure) {
      return fallbackFailure;
    }
    return paginateFrom(filteredGoldRows(ctx), ctx);
  }),
  route("GET", "/api/v1/live/gold/coverage", async (ctx) => {
    if (shouldUsePersistentLiveData(ctx)) {
      try {
        return success(
          await getPersistentGoldCoverage({
            organizationId: scopedOrganizationId(ctx),
            scope: buildPersistentSiteScope(ctx, ctx.query.get("site_id")),
          }),
          ctx.requestId,
        );
      } catch (error) {
        return operationalFailureResponse(
          error,
          ctx.requestId,
          "LIVE_GOLD_COVERAGE_FAILED",
          "Unable to load Gold coverage",
        );
      }
    }

    const fallbackFailure = noDemoFallbackResponse(
      ctx.requestId,
      "Live Gold coverage",
      scopedOrganizationId(ctx),
    );
    if (fallbackFailure) {
      return fallbackFailure;
    }

    return success(
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
    );
  }),
  route("GET", "/api/v1/live/gold/provenance", async (ctx) => {
    if (shouldUsePersistentLiveData(ctx)) {
      try {
        return success(
          await getPersistentGoldProvenance({
            organizationId: scopedOrganizationId(ctx),
            scope: buildPersistentSiteScope(ctx, ctx.query.get("site_id")),
          }),
          ctx.requestId,
        );
      } catch (error) {
        return operationalFailureResponse(
          error,
          ctx.requestId,
          "LIVE_GOLD_PROVENANCE_FAILED",
          "Unable to load Gold provenance",
        );
      }
    }

    const fallbackFailure = noDemoFallbackResponse(
      ctx.requestId,
      "Live Gold provenance",
      scopedOrganizationId(ctx),
    );
    if (fallbackFailure) {
      return fallbackFailure;
    }

    return success(
      (() => {
        const scopedRows = filteredGoldRows(ctx);
        return {
          revision: "gold-2026.02.25-r1",
          loadedAt: new Date().toISOString(),
          sourcePath: "data-ready/gold/gold_site_day.csv",
          scopedRows: scopedRows.length,
          totalRows: scopedRows.length,
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
            lastRunGoldRows: scopedRows.length,
          },
        };
      })(),
      ctx.requestId,
    );
  }),
  route("GET", "/api/v1/live/proof", async (ctx) => {
    const siteId = normalizeOptionalText(ctx.query.get("site_id"));
    const siteScopeError = forbiddenSiteScope(ctx, siteId);
    if (siteScopeError) {
      return siteScopeError;
    }

    if (shouldUsePersistentLiveData(ctx)) {
      try {
        return paginateFrom(
          await listPersistentProofRecords({
            organizationId: scopedOrganizationId(ctx),
            scope: buildPersistentSiteScope(ctx, siteId),
          }),
          ctx,
        );
      } catch (error) {
        return operationalFailureResponse(
          error,
          ctx.requestId,
          "LIVE_PROOF_FAILED",
          "Unable to load live proof packs",
        );
      }
    }

    const fallbackFailure = noDemoFallbackResponse(
      ctx.requestId,
      "Live proof packs",
      scopedOrganizationId(ctx),
    );
    if (fallbackFailure) {
      return fallbackFailure;
    }

    return paginateFrom(
      filterByAccessibleSites(ctx, LIVE_PROOF_PACKS, (proof) => proof.siteId).filter((proof) => {
        if (siteId == null) return true;
        return proof.siteId === siteId;
      }),
      ctx,
    );
  }),
  route("GET", "/api/v1/organizations/me", (ctx) =>
    withDemoFallback(ctx, "Organization profile", () =>
      success(
        {
          ...demo.organization,
          id: scopedOrganizationId(ctx),
        },
        ctx.requestId,
      ),
    ),
  ),
  route("GET", "/api/v1/departments", (ctx) =>
    withDemoFallback(ctx, "Departments", () =>
      success(
        demo.departments.map((department) => ({
          ...department,
          organizationId: scopedOrganizationId(ctx),
        })),
        ctx.requestId,
      ),
    ),
  ),
  route("GET", "/api/v1/sites", (ctx) =>
    withDemoFallback(ctx, "Sites", () =>
      success(
        filterByAccessibleSites(
          ctx,
          demo.sites as Array<Record<string, unknown>>,
          (site) => String(site.id ?? ""),
        ).map((site, index) => ({
          ...site,
          organizationId: scopedOrganizationId(ctx),
          code: index === 0 ? "LYN" : "ORL",
          headcount: index === 0 ? 180 : 140,
        })),
        ctx.requestId,
      ),
    ),
  ),

  route("GET", "/api/v1/forecasts", (ctx) =>
    withDemoFallback(ctx, "Forecast runs", () =>
      paginateFrom(
        (demo.forecasts as Record<string, unknown>[]).map((forecast) => ({
          ...forecast,
          organizationId: scopedOrganizationId(ctx),
        })),
        ctx,
      ),
    ),
  ),
  route("GET", "/api/v1/forecasts/:forecastId/summary", (ctx) =>
    withDemoFallback(ctx, "Forecast summary", () =>
      success(
        {
          forecastId: ctx.params.forecastId,
          status: "completed",
          drivers: ["turnover", "seasonality", "absences"],
        },
        ctx.requestId,
      ),
    ),
  ),
  route("GET", "/api/v1/forecasts/:forecastId/daily", (ctx) =>
    withDemoFallback(ctx, "Forecast daily details", () =>
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
  ),
  route("POST", "/api/v1/forecasts", (ctx) =>
    withDemoFallback(ctx, "Forecast creation", () =>
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
  ),
  route("POST", "/api/v1/forecasts/what-if", (ctx) =>
    withDemoFallback(ctx, "Forecast what-if analysis", () =>
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
  ),

  route("GET", "/api/v1/decisions", (ctx) =>
    withDemoFallback(ctx, "Decisions", () =>
      paginateFrom(demo.decisions as Record<string, unknown>[], ctx),
    ),
  ),
  route("GET", "/api/v1/decisions/:decisionId", (ctx) =>
    withDemoFallback(ctx, "Decision details", () =>
      success(
        {
          id: ctx.params.decisionId,
          title: "Increase PM staffing",
          status: "suggested",
        },
        ctx.requestId,
      ),
    ),
  ),
  route("PATCH", "/api/v1/decisions/:decisionId/review", (ctx) =>
    withDemoFallback(ctx, "Decision review", () =>
      success(
        {
          id: ctx.params.decisionId,
          status: "reviewed",
          review: ctx.body,
        },
        ctx.requestId,
      ),
    ),
  ),
  route("POST", "/api/v1/decisions/:decisionId/outcome", (ctx) =>
    withDemoFallback(ctx, "Decision outcome", () =>
      success(
        {
          id: ctx.params.decisionId,
          outcome: ctx.body,
        },
        ctx.requestId,
      ),
    ),
  ),

  route("GET", "/api/v1/arbitrage/:alertId/options", (ctx) =>
    withDemoFallback(ctx, "Arbitrage options", () =>
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
  ),
  route("POST", "/api/v1/arbitrage/:alertId/validate", (ctx) =>
    withDemoFallback(ctx, "Arbitrage validation", () =>
      success(
        {
          alertId: ctx.params.alertId,
          decision: ctx.body,
        },
        ctx.requestId,
      ),
    ),
  ),

  route("GET", "/api/v1/alerts", async (ctx) => {
    const service = getAdminBackofficeService();
    if (!service.hasDatabase()) {
      return withDemoFallback(ctx, "Dashboard alerts", () =>
        success(
          (demo.alerts as Record<string, unknown>[]).map((alert) => ({
            ...alert,
            organizationId: scopedOrganizationId(ctx),
          })),
          ctx.requestId,
        ),
      );
    }

    try {
      return success(
        await service.listDashboardAlerts(scopedOrganizationId(ctx)),
        ctx.requestId,
      );
    } catch (error) {
      return backofficeFailureResponse(
        error,
        ctx.requestId,
        "ALERTS_LIST_FAILED",
        "Unable to load dashboard alerts",
      );
    }
  }),
  route("PATCH", "/api/v1/alerts/:alertId/dismiss", async (ctx) => {
    const service = getAdminBackofficeService();
    if (!service.hasDatabase()) {
      return withDemoFallback(ctx, "Dashboard alert dismissal", () =>
        success(
          {
            id: ctx.params.alertId,
            status: "dismissed",
          },
          ctx.requestId,
        ),
      );
    }

    try {
      return success(
        await service.dismissDashboardAlert({
          organizationId: scopedOrganizationId(ctx),
          alertId: ctx.params.alertId ?? "",
        }),
        ctx.requestId,
      );
    } catch (error) {
      return backofficeFailureResponse(
        error,
        ctx.requestId,
        "ALERT_DISMISS_FAILED",
        "Unable to dismiss dashboard alert",
      );
    }
  }),

  route("GET", "/api/v1/analytics/costs", (ctx) =>
    withDemoFallback(ctx, "Analytics costs", () =>
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
  ),

  route("POST", "/api/v1/exports/:resource", (ctx) =>
    withDemoFallback(ctx, "Export queueing", () =>
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
  ),

  route("GET", "/api/v1/datasets", (ctx) =>
    withDemoFallback(ctx, "Datasets", () =>
      paginateFrom(demo.datasets as Record<string, unknown>[], ctx),
    ),
  ),
  route("GET", "/api/v1/datasets/:datasetId", (ctx) =>
    withDemoFallback(ctx, "Dataset details", () =>
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
  ),
  route("GET", "/api/v1/datasets/:datasetId/data", (ctx) =>
    withDemoFallback(ctx, "Dataset rows", () =>
      success(
      {
        columns: ["site_id", "date", "charge_hours"],
        rows: filterByAccessibleSites(
          ctx,
          [
            { site_id: "site-lyon", date: "2026-02-24", charge_hours: 312 },
            { site_id: "site-orleans", date: "2026-02-24", charge_hours: 248 },
          ],
          (row) => row.site_id,
        ),
        maskedColumns: [],
        total: filterByAccessibleSites(
          ctx,
          [
            { site_id: "site-lyon", date: "2026-02-24", charge_hours: 312 },
            { site_id: "site-orleans", date: "2026-02-24", charge_hours: 248 },
          ],
          (row) => row.site_id,
        ).length,
      },
      ctx.requestId,
      ),
    ),
  ),
  route("GET", "/api/v1/datasets/:datasetId/columns", (ctx) =>
    withDemoFallback(ctx, "Dataset columns", () =>
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
  ),
  route("GET", "/api/v1/datasets/:datasetId/ingestion-log", (ctx) =>
    withDemoFallback(ctx, "Dataset ingestion log", () =>
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
  ),

  route("GET", "/api/v1/live/canonical", async (ctx) => {
    if (!shouldUsePersistentLiveData(ctx)) {
      const fallbackFailure = liveFallbackFailure(ctx, "Live canonical records");
      if (fallbackFailure) {
        return fallbackFailure;
      }
      return paginateFrom(filteredCanonicalRows(ctx), ctx);
    }

    try {
      return paginateFrom(
        await listPersistentCanonicalRecords({
          organizationId: scopedOrganizationId(ctx),
          scope: buildPersistentSiteScope(ctx, ctx.query.get("site_id")),
          dateFrom: normalizeOptionalText(ctx.query.get("date_from")),
          dateTo: normalizeOptionalText(ctx.query.get("date_to")),
        }),
        ctx,
      );
    } catch (error) {
      return operationalFailureResponse(
        error,
        ctx.requestId,
        "LIVE_CANONICAL_FAILED",
        "Unable to load canonical records",
      );
    }
  }),
  route("GET", "/api/v1/live/canonical/quality", async (ctx) => {
    if (!shouldUsePersistentLiveData(ctx)) {
      const fallbackFailure = liveFallbackFailure(ctx, "Live canonical quality");
      if (fallbackFailure) {
        return fallbackFailure;
      }
      return success(
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
      );
    }

    try {
      return success(
        await getPersistentCanonicalQuality({
          organizationId: scopedOrganizationId(ctx),
          scope: buildPersistentSiteScope(ctx, ctx.query.get("site_id")),
        }),
        ctx.requestId,
      );
    } catch (error) {
      return operationalFailureResponse(
        error,
        ctx.requestId,
        "LIVE_CANONICAL_QUALITY_FAILED",
        "Unable to load canonical quality summary",
      );
    }
  }),

  route("GET", "/api/v1/live/coverage-alerts", async (ctx) => {
    let alerts: CoverageAlertRecord[];
    if (shouldUsePersistentLiveData(ctx)) {
      try {
        const config = await resolveDecisionConfig(
          ctx,
          normalizeOptionalText(ctx.query.get("site_id")),
        );
        const activeHorizonIdSet = activeHorizonIds(config.payload);
        alerts = (
          await listPersistentCoverageAlerts({
            organizationId: scopedOrganizationId(ctx),
            scope: buildPersistentSiteScope(ctx, ctx.query.get("site_id")),
            status: normalizeOptionalText(ctx.query.get("status")),
            severity: normalizeOptionalText(ctx.query.get("severity")),
            dateFrom: normalizeOptionalText(ctx.query.get("date_from")),
            dateTo: normalizeOptionalText(ctx.query.get("date_to")),
            horizonId:
              normalizeOptionalText(ctx.query.get("horizon_id")) ??
              normalizeOptionalText(ctx.query.get("horizon")),
          })
        ).filter((alert) => activeHorizonIdSet.has(alert.horizon));
      } catch (error) {
        return operationalFailureResponse(
          error,
          ctx.requestId,
          "LIVE_COVERAGE_ALERTS_FAILED",
          "Unable to load live coverage alerts",
        );
      }
    } else {
      alerts = (await filteredCoverageAlerts(ctx)).sort((a, b) => {
        if (a.alertDate === b.alertDate) {
          return b.pRupture - a.pRupture;
        }
        return a.alertDate.localeCompare(b.alertDate);
      });
    }

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
  route("GET", "/api/v1/live/coverage-alerts/queue", async (ctx) => {
    let scoped: CoverageAlertRecord[];
    if (shouldUsePersistentLiveData(ctx)) {
      try {
        const config = await resolveDecisionConfig(
          ctx,
          normalizeOptionalText(ctx.query.get("site_id")),
        );
        const activeHorizonIdSet = activeHorizonIds(config.payload);
        scoped = (
          await listPersistentCoverageAlerts({
            organizationId: scopedOrganizationId(ctx),
            scope: buildPersistentSiteScope(ctx, ctx.query.get("site_id")),
            status: normalizeOptionalText(ctx.query.get("status")) ?? "open",
            severity: normalizeOptionalText(ctx.query.get("severity")),
            dateFrom: normalizeOptionalText(ctx.query.get("date_from")),
            dateTo: normalizeOptionalText(ctx.query.get("date_to")),
            horizonId:
              normalizeOptionalText(ctx.query.get("horizon_id")) ??
              normalizeOptionalText(ctx.query.get("horizon")),
          })
        ).filter((alert) => activeHorizonIdSet.has(alert.horizon));
      } catch (error) {
        return operationalFailureResponse(
          error,
          ctx.requestId,
          "LIVE_COVERAGE_QUEUE_FAILED",
          "Unable to load coverage alert queue",
        );
      }
    } else {
      scoped = (await filteredCoverageAlerts(ctx)).filter((alert) => {
        const status = ctx.query.get("status");
        if (status == null || status.length === 0) {
          return alert.status === "open";
        }
        return alert.status === status;
      });
    }

    const queue = toDecisionQueueItems(scoped);
    const limit = parsePositiveInt(ctx.query.get("limit"), 50);
    return success(queue.slice(0, limit), ctx.requestId);
  }),
  route("PATCH", "/api/v1/coverage-alerts/:alertId/acknowledge", async (ctx) => {
    if (!shouldUsePersistentLiveData(ctx)) {
      const fallbackFailure = liveFallbackFailure(
        ctx,
        "Coverage alert acknowledgement",
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }
      const now = new Date().toISOString();
      const alert = await findAccessibleCoverageAlert(ctx, ctx.params.alertId ?? "");
      if (alert == null) {
        return failure(
          "NOT_FOUND",
          "Coverage alert not found",
          ctx.requestId,
          404,
        );
      }

      return success(
        {
          ...alert,
          status: "acknowledged",
          acknowledgedAt: now,
          updatedAt: now,
        },
        ctx.requestId,
      );
    }

    try {
      return success(
        await acknowledgePersistentCoverageAlert({
          organizationId: scopedOrganizationId(ctx),
          alertId: ctx.params.alertId ?? "",
          scope: buildPersistentSiteScope(ctx, ctx.query.get("site_id")),
        }),
        ctx.requestId,
      );
    } catch (error) {
      return operationalFailureResponse(
        error,
        ctx.requestId,
        "COVERAGE_ALERT_ACK_FAILED",
        "Unable to acknowledge coverage alert",
      );
    }
  }),
  route("PATCH", "/api/v1/coverage-alerts/:alertId/resolve", async (ctx) => {
    if (!shouldUsePersistentLiveData(ctx)) {
      const fallbackFailure = liveFallbackFailure(
        ctx,
        "Coverage alert resolution",
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }
      const now = new Date().toISOString();
      const alert = await findAccessibleCoverageAlert(ctx, ctx.params.alertId ?? "");
      if (alert == null) {
        return failure(
          "NOT_FOUND",
          "Coverage alert not found",
          ctx.requestId,
          404,
        );
      }

      return success(
        {
          ...alert,
          status: "resolved",
          resolvedAt: now,
          updatedAt: now,
        },
        ctx.requestId,
      );
    }

    try {
      return success(
        await resolvePersistentCoverageAlert({
          organizationId: scopedOrganizationId(ctx),
          alertId: ctx.params.alertId ?? "",
          scope: buildPersistentSiteScope(ctx, ctx.query.get("site_id")),
        }),
        ctx.requestId,
      );
    } catch (error) {
      return operationalFailureResponse(
        error,
        ctx.requestId,
        "COVERAGE_ALERT_RESOLVE_FAILED",
        "Unable to resolve coverage alert",
      );
    }
  }),

  route("GET", "/api/v1/live/scenarios/alert/:alertId", async (ctx) => {
    const alertId = ctx.params.alertId ?? "alt-001";
    const alert = await findAccessibleCoverageAlert(ctx, alertId);
    if (alert == null) {
      return failure("NOT_FOUND", "Coverage alert not found", ctx.requestId, 404);
    }
    const config = await resolveDecisionConfig(ctx, alert?.siteId ?? null);
    const scenario = applyScenarioRecommendationPolicy(
      buildScenarioOptions(alertId, config.versionId),
      config.payload,
      alert?.horizon ?? null,
      config.versionId,
    );
    return success(
      {
        alertId,
        options: scenario.options,
        paretoFrontier: scenario.options.filter((option) => option.isParetoOptimal),
        recommended:
          scenario.options.find((option) => option.id === scenario.recommendedOptionId) ??
          null,
      },
      ctx.requestId,
    );
  }),
  route("GET", "/api/v1/live/decision-workspace/:alertId", async (ctx) => {
    const requestedAlertId = ctx.params.alertId ?? "alt-001";
    const alert = await findAccessibleCoverageAlert(ctx, requestedAlertId);
    if (alert == null) {
      return failure("NOT_FOUND", "Coverage alert not found", ctx.requestId, 404);
    }

    const config = await resolveDecisionConfig(ctx, alert.siteId);
    const scenario = applyScenarioRecommendationPolicy(
      buildScenarioOptions(alert.id, config.versionId),
      config.payload,
      alert.horizon,
      config.versionId,
    );

    return success(
      {
        alert,
        options: scenario.options,
        recommendedOptionId: scenario.recommendedOptionId,
        diagnostic: {
          topDrivers: alert.driversJson.slice(0, 3),
          confidencePct: Math.round(alert.pRupture * 100),
          riskTrend:
            alert.pRupture > 0.75
              ? "worsening"
              : alert.pRupture < 0.4
                ? "improving"
                : "stable",
          note:
            "L'option recommandee equilibre cout et niveau de service selon la politique active.",
        },
      },
      ctx.requestId,
    );
  }),
  route("POST", "/api/v1/scenarios/generate/:alertId", async (ctx) => {
    const alertId = ctx.params.alertId ?? "alt-001";
    const alert = await findAccessibleCoverageAlert(ctx, alertId);
    if (alert == null) {
      return failure("NOT_FOUND", "Coverage alert not found", ctx.requestId, 404);
    }
    const config = await resolveDecisionConfig(ctx, alert?.siteId ?? null);
    const scenario = applyScenarioRecommendationPolicy(
      buildScenarioOptions(alertId, config.versionId),
      config.payload,
      alert?.horizon ?? null,
      config.versionId,
    );
    return success(
      {
        alertId,
        options: scenario.options,
        paretoFrontier: scenario.options.filter((option) => option.isParetoOptimal),
        recommended:
          scenario.options.find((option) => option.id === scenario.recommendedOptionId) ??
          null,
      },
      ctx.requestId,
    );
  }),

  route("POST", "/api/v1/operational-decisions", async (ctx) => {
    const fallbackFailure = liveFallbackFailure(
      ctx,
      "Operational decisions",
    );
    if (fallbackFailure) {
      return fallbackFailure;
    }

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

    const siteId =
      typeof payload?.siteId === "string" && payload.siteId.trim().length > 0
        ? payload.siteId
        : "site-lyon";
    const siteScopeError = forbiddenSiteScope(ctx, siteId);
    if (siteScopeError) {
      return siteScopeError;
    }
    const coverageAlertId =
      typeof payload?.coverageAlertId === "string"
        ? payload.coverageAlertId
        : "alt-001";
    const alert = await findAccessibleCoverageAlert(ctx, coverageAlertId);
    if (coverageAlertId.length > 0 && alert == null) {
      return failure("NOT_FOUND", "Coverage alert not found", ctx.requestId, 404);
    }
    const config = await resolveDecisionConfig(ctx, siteId);
    const fallbackHorizon = resolveActiveHorizon(config.payload, null);
    const requestedHorizonId =
      typeof payload?.horizon === "string" ? payload.horizon.trim() : "";
    const horizon =
      requestedHorizonId.length > 0
        ? requestedHorizonId
        : (fallbackHorizon?.id ?? "j7");
    const scenario = applyScenarioRecommendationPolicy(
      buildScenarioOptions(coverageAlertId, config.versionId),
      config.payload,
      horizon,
      config.versionId,
    );

    const now = new Date().toISOString();
    return success(
      {
        id: `opd-${Date.now()}`,
        organizationId: scopedOrganizationId(ctx),
        coverageAlertId,
        recommendedOptionId: scenario.recommendedOptionId,
        chosenOptionId:
          typeof payload?.chosenOptionId === "string" ? payload.chosenOptionId : null,
        siteId: alert?.siteId ?? siteId,
        decisionDate:
          typeof payload?.decisionDate === "string"
            ? payload.decisionDate
            : isoDateOffset(0),
        shift:
          payload?.shift === "am" || payload?.shift === "pm" ? payload.shift : "am",
        horizon,
        gapH:
          typeof payload?.gapH === "number" && Number.isFinite(payload.gapH)
            ? payload.gapH
            : 0,
        isOverride: true,
        overrideReason: "manager_override",
        overrideCategory: "capacity_constraints",
        recommendationPolicyVersion: config.versionId,
        coutAttenduEur: 980,
        serviceAttenduPct: 97.2,
        decidedBy: ctx.user?.userId ?? "user-demo",
        createdAt: now,
        updatedAt: now,
      },
      ctx.requestId,
      "Operational decision recorded",
      201,
    );
  }),
  route("GET", "/api/v1/operational-decisions", (ctx) =>
    withDemoFallback(ctx, "Operational decisions history", () =>
      paginateFrom(
        filterByAccessibleSites(
          ctx,
          [
            {
              id: "opd-001",
              organizationId: scopedOrganizationId(ctx),
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
          (decision) => decision.siteId,
        ),
        ctx,
      ),
    ),
  ),
  route("GET", "/api/v1/operational-decisions/override-stats", (ctx) =>
    withDemoFallback(ctx, "Operational decision override stats", () =>
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
  ),

  route("GET", "/api/v1/cost-parameters", (ctx) =>
    withDemoFallback(ctx, "Cost parameters", () =>
      success(
        filterByAccessibleSites(
          ctx,
          [
            {
              id: "cp-001",
              siteId: "site-lyon",
              internalHourlyCostEur: 19.9,
              overtimeMultiplier: 1.25,
              interimHourlyCostEur: 30,
            },
          ],
          (entry) => entry.siteId,
        ),
        ctx.requestId,
      ),
    ),
  ),
  route("GET", "/api/v1/cost-parameters/effective", (ctx) => {
    const fallbackFailure = liveFallbackFailure(
      ctx,
      "Effective cost parameters",
    );
    if (fallbackFailure) {
      return fallbackFailure;
    }

    const entry =
      filterByAccessibleSites(
        ctx,
        [
          {
            siteId: "site-lyon",
            internalHourlyCostEur: 19.9,
            overtimeMultiplier: 1.25,
            interimHourlyCostEur: 30,
          },
        ],
        (candidate) => candidate.siteId,
      )[0] ?? null;

    if (entry == null) {
      return failure(
        "NOT_FOUND",
        "No cost parameters available in your access scope",
        ctx.requestId,
        404,
      );
    }

    return success(entry, ctx.requestId);
  }),
  route("GET", "/api/v1/cost-parameters/history", (ctx) =>
    withDemoFallback(ctx, "Cost parameter history", () =>
      success(
        filterByAccessibleSites(
          ctx,
          [
            {
              id: "cp-001",
              siteId: "site-lyon",
              version: 1,
              effectiveAt: "2026-01-01",
            },
          ],
          (entry) => entry.siteId,
        ),
        ctx.requestId,
      ),
    ),
  ),

  route("GET", "/api/v1/proof", async (ctx) => {
    const siteId = normalizeOptionalText(ctx.query.get("site_id"));
    const siteScopeError = forbiddenSiteScope(ctx, siteId);
    if (siteScopeError) {
      return siteScopeError;
    }

    if (shouldUsePersistentLiveData(ctx)) {
      try {
        return success(
          await listPersistentProofRecords({
            organizationId: scopedOrganizationId(ctx),
            scope: buildPersistentSiteScope(ctx, siteId),
            dateFrom: normalizeOptionalText(ctx.query.get("date_from")),
            dateTo: normalizeOptionalText(ctx.query.get("date_to")),
          }),
          ctx.requestId,
        );
      } catch (error) {
        return operationalFailureResponse(
          error,
          ctx.requestId,
          "PROOF_LIST_FAILED",
          "Unable to load proof packs",
        );
      }
    }

    const fallbackFailure = noDemoFallbackResponse(
      ctx.requestId,
      "Proof packs",
      scopedOrganizationId(ctx),
    );
    if (fallbackFailure) {
      return fallbackFailure;
    }

    return success(
      filterByAccessibleSites(ctx, LIVE_PROOF_PACKS, (proof) => proof.siteId),
      ctx.requestId,
    );
  }),
  route("GET", "/api/v1/proof/summary", async (ctx) => {
    const siteId = normalizeOptionalText(ctx.query.get("site_id"));
    const siteScopeError = forbiddenSiteScope(ctx, siteId);
    if (siteScopeError) {
      return siteScopeError;
    }

    if (shouldUsePersistentLiveData(ctx)) {
      try {
        return success(
          summarizePersistentProofRecords(
            await listPersistentProofRecords({
              organizationId: scopedOrganizationId(ctx),
              scope: buildPersistentSiteScope(ctx, siteId),
              dateFrom: normalizeOptionalText(ctx.query.get("date_from")),
              dateTo: normalizeOptionalText(ctx.query.get("date_to")),
            }),
          ),
          ctx.requestId,
        );
      } catch (error) {
        return operationalFailureResponse(
          error,
          ctx.requestId,
          "PROOF_SUMMARY_FAILED",
          "Unable to load proof summary",
        );
      }
    }

    const fallbackFailure = noDemoFallbackResponse(
      ctx.requestId,
      "Proof summary",
      scopedOrganizationId(ctx),
    );
    if (fallbackFailure) {
      return fallbackFailure;
    }

    return success(
      (() => {
        const records = filterByAccessibleSites(ctx, LIVE_PROOF_PACKS, (proof) => proof.siteId);
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
    );
  }),
  route("POST", "/api/v1/proof/generate", (ctx) =>
    (() => {
      const fallbackFailure = noDemoFallbackResponse(
        ctx.requestId,
        "Proof generation",
        scopedOrganizationId(ctx),
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }

      const payload =
        (ctx.body as { siteId?: unknown; month?: unknown } | null) ?? null;
      const siteId =
        typeof payload?.siteId === "string" ? payload.siteId : "site-lyon";
      const siteScopeError = forbiddenSiteScope(ctx, siteId);
      if (siteScopeError) {
        return siteScopeError;
      }

      const month =
        typeof payload?.month === "string" ? payload.month : isoDateOffset(0);
      return success(
        {
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
        },
        ctx.requestId,
        "Proof pack generated",
        201,
      );
    })(),
  ),
  route("GET", "/api/v1/proof/pdf", (ctx) =>
    (() => {
      const fallbackFailure = liveFallbackFailure(
        ctx,
        "Proof PDF download",
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }

      const rawProofPackId = ctx.query.get("proof_pack_id");
      const proofPackId = normalizeProofPackId(rawProofPackId);
      if (rawProofPackId != null && proofPackId == null) {
        return failure(
          "INVALID_PROOF_PACK_ID",
          "proof_pack_id contains unsupported characters",
          ctx.requestId,
          400,
        );
      }

      return success(
        {
          url: `/proof/${proofPackId ?? "latest"}.pdf`,
        },
        ctx.requestId,
      );
    })(),
  ),

  route("GET", "/api/v1/users/me/preferences", (ctx) =>
    withDemoFallback(ctx, "User preferences", () =>
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
  ),
  route("PATCH", "/api/v1/users/me/preferences", (ctx) =>
    withDemoFallback(ctx, "User preferences update", () =>
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
  ),

  route("POST", "/api/v1/product-events/batch", (ctx) =>
    withDemoFallback(ctx, "Product events batch ingestion", () => {
      const payload = (ctx.body as { events?: unknown[] } | null) ?? null;
      const accepted = Array.isArray(payload?.events) ? payload.events.length : 0;
      return success({ accepted }, ctx.requestId, "Events accepted", 202);
    }),
  ),
  route(
    "POST",
    "/api/v1/public/contact-requests",
    (ctx) => {
      const parsed = contactRequestSchema.safeParse(ctx.body);
      if (!parsed.success || parsed.data.website.length > 0) {
        return failure(
          "VALIDATION_ERROR",
          "Contact request payload is invalid",
          ctx.requestId,
          422,
        );
      }

      return success(
        {
          id: `contact-${Date.now()}`,
          status: "received",
          receivedAt: new Date().toISOString(),
          requestType: parsed.data.requestType ?? "founding_pilot",
          companyName: parsed.data.companyName,
          email: parsed.data.email,
        },
        ctx.requestId,
        "Contact request received",
        201,
      );
    },
    { authRequired: false, rateLimit: publicContactRateLimit },
  ),

  route(
    "GET",
    "/api/v1/conversations",
    (ctx) =>
      withDemoFallback(ctx, "Conversations", () =>
        success(
          [...listConversationsForOrganization(scopedOrganizationId(ctx))].sort((a, b) =>
            String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")),
          ),
          ctx.requestId,
        ),
      ),
    { rateLimit: messagingReadRateLimit },
  ),
  route("POST", "/api/v1/conversations", (ctx) => {
    const fallbackFailure = liveFallbackFailure(ctx, "Conversation creation");
    if (fallbackFailure) {
      return fallbackFailure;
    }

    const parsed = conversationCreateSchema.safeParse(ctx.body);
    if (!parsed.success) {
      return failure(
        "VALIDATION_ERROR",
        "Subject is required",
        ctx.requestId,
        422,
      );
    }

    const timestamp = new Date().toISOString();
    const conversation = {
      id: `conv-${randomUUID()}`,
      organizationId: scopedOrganizationId(ctx),
      subject: parsed.data.subject,
      status: "open",
      initiatedBy: "client",
      lastMessageAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    conversations = [conversation, ...conversations];
    return success(conversation, ctx.requestId, "Conversation created", 201);
  }, { rateLimit: messagingWriteRateLimit }),
  route("GET", "/api/v1/conversations/:convId/messages", (ctx) => {
    const fallbackFailure = liveFallbackFailure(
      ctx,
      "Conversation messages",
    );
    if (fallbackFailure) {
      return fallbackFailure;
    }

    const conversationId = ctx.params.convId ?? "";
    const conversation = getConversationForOrganization(
      scopedOrganizationId(ctx),
      conversationId,
    );
    if (!conversation) {
      return failure(
        "NOT_FOUND",
        "Conversation not found",
        ctx.requestId,
        404,
      );
    }
    return success(getConversationMessages(String(conversation.id ?? conversationId)), ctx.requestId);
  }, { rateLimit: messagingReadRateLimit }),
  route("POST", "/api/v1/conversations/:convId/messages", (ctx) => {
    const fallbackFailure = liveFallbackFailure(
      ctx,
      "Conversation message creation",
    );
    if (fallbackFailure) {
      return fallbackFailure;
    }

    const conversationId = ctx.params.convId ?? "";
    const conversation = getConversationForOrganization(
      scopedOrganizationId(ctx),
      conversationId,
    );
    if (!conversation) {
      return failure(
        "NOT_FOUND",
        "Conversation not found",
        ctx.requestId,
        404,
      );
    }

    const parsed = messageCreateSchema.safeParse(ctx.body);
    if (!parsed.success) {
      return failure(
        "VALIDATION_ERROR",
        "Content is required",
        ctx.requestId,
        422,
      );
    }

    const timestamp = new Date().toISOString();
    const message = {
      id: `msg-${randomUUID()}`,
      conversationId: String(conversation.id ?? conversationId),
      senderUserId: ctx.user?.userId ?? "unknown",
      senderRole: ctx.user?.role ?? "org_admin",
      content: parsed.data.content,
      isRead: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    conversationMessages = [...conversationMessages, message];
    conversations = conversations.map((entry) => {
      if (String(entry.id ?? "") !== conversationId) {
        return entry;
      }
      return {
        ...entry,
        lastMessageAt: timestamp,
        updatedAt: timestamp,
      };
    });

    return success(message, ctx.requestId, "Message sent", 201);
  }, { rateLimit: messagingWriteRateLimit }),
  route(
    "GET",
    "/api/v1/conversations/unread-count",
    (ctx) =>
      withDemoFallback(ctx, "Conversation unread count", () =>
        success(
          {
            unreadCount: conversationMessages.filter((entry) => {
              const accessibleConversationIds = new Set(
                listConversationsForOrganization(scopedOrganizationId(ctx)).map((conversation) =>
                  String(conversation.id ?? ""),
                ),
              );
              if (!accessibleConversationIds.has(String(entry.conversationId ?? ""))) {
                return false;
              }
              const isOwnMessage =
                String(entry.senderUserId ?? "") === String(ctx.user?.userId ?? "");
              const isRead = Boolean(entry.isRead);
              return !isOwnMessage && !isRead;
            }).length,
          },
          ctx.requestId,
        ),
      ),
    { rateLimit: messagingReadRateLimit },
  ),

  route(
    "GET",
    "/api/v1/support-thread",
    (ctx) =>
      withDemoFallback(ctx, "Support thread", () =>
        success(
          {
            id: SUPPORT_THREAD_ID,
            status: "open",
            messages: getSupportThreadMessages(scopedOrganizationId(ctx)),
          },
          ctx.requestId,
        ),
      ),
    { rateLimit: messagingReadRateLimit },
  ),
  route("POST", "/api/v1/support-thread/messages", (ctx) => {
    const fallbackFailure = liveFallbackFailure(
      ctx,
      "Support thread message creation",
    );
    if (fallbackFailure) {
      return fallbackFailure;
    }

    const parsed = messageCreateSchema.safeParse(ctx.body);
    if (!parsed.success) {
      return failure(
        "VALIDATION_ERROR",
        "Content is required",
        ctx.requestId,
        422,
      );
    }
    const message = {
      id: `support-msg-${randomUUID()}`,
      organizationId: scopedOrganizationId(ctx),
      threadId: SUPPORT_THREAD_ID,
      authorType: "client",
      authorId: ctx.user?.userId ?? "unknown",
      content: parsed.data.content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    supportThreadMessages = [...supportThreadMessages, message];
    return success(message, ctx.requestId, "Message sent", 201);
  }, { rateLimit: messagingWriteRateLimit }),

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
    adminConsoleAccess,
  ),
  route(
    "GET",
    "/api/v1/admin/integrations/catalog",
    async (ctx) => success(await listIntegrationCatalog(), ctx.requestId),
    adminIntegrationsRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/integrations/connections",
    async (ctx) =>
      success(
        await listIntegrationConnections(
          ctx.params.orgId ?? "",
          ctx.query.get("vendor"),
        ),
        ctx.requestId,
      ),
    adminIntegrationsRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/integrations/connections/:connectionId",
    async (ctx) => {
      try {
        const connection = await getIntegrationConnection(
          ctx.params.orgId ?? "",
          ctx.params.connectionId ?? "",
        );
        return success(connection, ctx.requestId);
      } catch (error) {
        return integrationFailureResponse(
          error,
          ctx.requestId,
          "NOT_FOUND",
          "Unable to load integration connection",
        );
      }
    },
    adminIntegrationsRead,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/integrations/connections",
    async (ctx) => {
      try {
        const created = await createIntegrationConnection(
          ctx.params.orgId ?? "",
          ctx.body,
          ctx.user?.userId ?? null,
        );
        return success(created, ctx.requestId, "Integration connection created", 201);
      } catch (error) {
        return integrationFailureResponse(
          error,
          ctx.requestId,
          "INTEGRATION_CREATE_FAILED",
          "Unable to create integration connection",
        );
      }
    },
    adminIntegrationsWrite,
  ),
  route(
    "PATCH",
    "/api/v1/admin/organizations/:orgId/integrations/connections/:connectionId",
    async (ctx) => {
      try {
        const updated = await updateIntegrationConnection(
          ctx.params.orgId ?? "",
          ctx.params.connectionId ?? "",
          ctx.body,
          ctx.user?.userId ?? null,
        );
        return success(updated, ctx.requestId, "Integration connection updated");
      } catch (error) {
        return integrationFailureResponse(
          error,
          ctx.requestId,
          "INTEGRATION_UPDATE_FAILED",
          "Unable to update integration connection",
        );
      }
    },
    adminIntegrationsWrite,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/integrations/connections/:connectionId/authorize/start",
    async (ctx) => {
      try {
        const started = await startIntegrationAuthorization(
          ctx.params.orgId ?? "",
          ctx.params.connectionId ?? "",
          ctx.body,
          ctx.user?.userId ?? null,
        );
        return success(started, ctx.requestId, "Integration authorization started");
      } catch (error) {
        return integrationFailureResponse(
          error,
          ctx.requestId,
          "AUTHORIZATION_START_FAILED",
          "Unable to start integration authorization",
        );
      }
    },
    adminIntegrationsWrite,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/integrations/connections/:connectionId/authorize/complete",
    async (ctx) => {
      try {
        const completed = await completeIntegrationAuthorization(
          ctx.params.orgId ?? "",
          ctx.params.connectionId ?? "",
          ctx.body,
          ctx.user?.userId ?? null,
        );
        return success(completed, ctx.requestId, "Integration authorization completed");
      } catch (error) {
        return integrationFailureResponse(
          error,
          ctx.requestId,
          "AUTHORIZATION_COMPLETE_FAILED",
          "Unable to complete integration authorization",
        );
      }
    },
    adminIntegrationsWrite,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/integrations/connections/:connectionId/test",
    async (ctx) => {
      try {
        const result = await testIntegrationConnection(
          ctx.params.orgId ?? "",
          ctx.params.connectionId ?? "",
          ctx.user?.userId ?? null,
        );
        return success(result, ctx.requestId);
      } catch (error) {
        return integrationFailureResponse(
          error,
          ctx.requestId,
          "CONNECTION_TEST_FAILED",
          "Unable to test integration connection",
        );
      }
    },
    adminIntegrationsWrite,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/integrations/connections/:connectionId/ingest-credentials",
    async (ctx) => {
      try {
        const credentials = await listIntegrationIngestCredentials(
          ctx.params.orgId ?? "",
          ctx.params.connectionId ?? "",
        );
        return success(credentials, ctx.requestId);
      } catch (error) {
        return integrationFailureResponse(
          error,
          ctx.requestId,
          "INGEST_CREDENTIALS_LIST_FAILED",
          "Unable to list integration ingest credentials",
        );
      }
    },
    adminIntegrationsRead,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/integrations/connections/:connectionId/ingest-credentials",
    async (ctx) => {
      try {
        const issued = await issueIntegrationIngestCredential(
          ctx.params.orgId ?? "",
          ctx.params.connectionId ?? "",
          ctx.body,
          ctx.user?.userId ?? null,
        );
        return success(issued, ctx.requestId, "Integration ingest credential issued", 201);
      } catch (error) {
        return integrationFailureResponse(
          error,
          ctx.requestId,
          "INGEST_CREDENTIAL_ISSUE_FAILED",
          "Unable to issue integration ingest credential",
        );
      }
    },
    adminIntegrationsWrite,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/integrations/connections/:connectionId/ingest-credentials/:credentialId/revoke",
    async (ctx) => {
      try {
        const revoked = await revokeIntegrationIngestCredential(
          ctx.params.orgId ?? "",
          ctx.params.connectionId ?? "",
          ctx.params.credentialId ?? "",
          ctx.user?.userId ?? null,
        );
        return success(revoked, ctx.requestId, "Integration ingest credential revoked");
      } catch (error) {
        return integrationFailureResponse(
          error,
          ctx.requestId,
          "INGEST_CREDENTIAL_REVOKE_FAILED",
          "Unable to revoke integration ingest credential",
        );
      }
    },
    adminIntegrationsWrite,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/integrations/connections/:connectionId/raw-events",
    async (ctx) => {
      try {
        const rawEvents = await listIntegrationRawEvents(
          ctx.params.orgId ?? "",
          ctx.params.connectionId ?? "",
        );
        return success(rawEvents, ctx.requestId);
      } catch (error) {
        return integrationFailureResponse(
          error,
          ctx.requestId,
          "RAW_EVENTS_LIST_FAILED",
          "Unable to list integration raw events",
        );
      }
    },
    adminIntegrationsRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/integrations/connections/:connectionId/raw-events/:eventId/payload",
    async (ctx) => {
      try {
        const payload = await getIntegrationRawEventPayload(
          ctx.params.orgId ?? "",
          ctx.params.connectionId ?? "",
          ctx.params.eventId ?? "",
        );
        return success(payload, ctx.requestId);
      } catch (error) {
        return integrationFailureResponse(
          error,
          ctx.requestId,
          "RAW_EVENT_PAYLOAD_FAILED",
          "Unable to load integration raw event payload",
        );
      }
    },
    adminIntegrationsRead,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/integrations/connections/:connectionId/sync",
    async (ctx) => {
      try {
        const run = await triggerIntegrationSync(
          ctx.params.orgId ?? "",
          ctx.params.connectionId ?? "",
          ctx.body,
          ctx.user?.userId ?? null,
        );
        return success(run, ctx.requestId, "Integration sync run created", 202);
      } catch (error) {
        return integrationFailureResponse(
          error,
          ctx.requestId,
          "SYNC_TRIGGER_FAILED",
          "Unable to trigger integration sync",
        );
      }
    },
    adminIntegrationsWrite,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/integrations/sync-runs",
    async (ctx) =>
      success(
        await listIntegrationSyncRuns(
          ctx.params.orgId ?? "",
          ctx.query.get("connectionId"),
        ),
        ctx.requestId,
      ),
    adminIntegrationsRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/integrations/audit",
    async (ctx) =>
      success(
        await listIntegrationAuditEvents(
          ctx.params.orgId ?? "",
          ctx.query.get("connectionId"),
        ),
        ctx.requestId,
      ),
    adminAuditRead,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/platform",
    async (ctx) => {
      if (hasPersistentDatabase()) {
        try {
          return success(
            {
              ...(await getPersistentPlatformKpis()),
              metadata: standardMeta("platform"),
            },
            ctx.requestId,
          );
        } catch (error) {
          return operationalFailureResponse(
            error,
            ctx.requestId,
            "ADMIN_PLATFORM_MONITORING_FAILED",
            "Unable to load platform KPIs",
          );
        }
      }

      const fallbackFailure = noDemoFallbackResponse(
        ctx.requestId,
        "Admin platform monitoring",
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }

      return success(
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
      );
    },
    adminMonitoringRead,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/trends",
    async (ctx) => {
      if (hasPersistentDatabase()) {
        try {
          return success(
            await getPersistentMonitoringTrends({
              days: parsePositiveInt(ctx.query.get("days"), 14),
            }),
            ctx.requestId,
          );
        } catch (error) {
          return operationalFailureResponse(
            error,
            ctx.requestId,
            "ADMIN_MONITORING_TRENDS_FAILED",
            "Unable to load monitoring trends",
          );
        }
      }

      const fallbackFailure = noDemoFallbackResponse(
        ctx.requestId,
        "Admin monitoring trends",
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }

      return success(
        {
          points: [
            { date: "2026-02-22", value: 49 },
            { date: "2026-02-23", value: 51 },
          ],
        },
        ctx.requestId,
      );
    },
    adminMonitoringRead,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/errors",
    async (ctx) => {
      if (hasPersistentDatabase()) {
        try {
          return success(
            await getPersistentMonitoringErrors(),
            ctx.requestId,
          );
        } catch (error) {
          return operationalFailureResponse(
            error,
            ctx.requestId,
            "ADMIN_MONITORING_ERRORS_FAILED",
            "Unable to load monitoring errors",
          );
        }
      }

      const fallbackFailure = noDemoFallbackResponse(
        ctx.requestId,
        "Admin monitoring errors",
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }
      return success({ count24h: 0, incidents: [] }, ctx.requestId);
    },
    adminMonitoringRead,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/organizations/:orgId",
    async (ctx) => {
      if (hasPersistentDatabase()) {
        try {
          return success(
            await getPersistentAdminOrgMetrics(ctx.params.orgId ?? ""),
            ctx.requestId,
          );
        } catch (error) {
          return operationalFailureResponse(
            error,
            ctx.requestId,
            "ADMIN_ORG_MONITORING_FAILED",
            "Unable to load organization monitoring metrics",
          );
        }
      }

      const fallbackFailure = noDemoFallbackResponse(
        ctx.requestId,
        "Admin organization monitoring",
        ctx.params.orgId,
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }
      return success(
        {
          orgId: ctx.params.orgId,
          health: "ok",
          adoptionRatePct: 62,
        },
        ctx.requestId,
      );
    },
    adminMonitoringRead,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/organizations/:orgId/mirror",
    async (ctx) => {
      if (hasPersistentDatabase()) {
        try {
          return success(
            await getPersistentAdminOrgMirror(ctx.params.orgId ?? ""),
            ctx.requestId,
          );
        } catch (error) {
          return operationalFailureResponse(
            error,
            ctx.requestId,
            "ADMIN_ORG_MIRROR_FAILED",
            "Unable to load organization mirror metrics",
          );
        }
      }

      const fallbackFailure = noDemoFallbackResponse(
        ctx.requestId,
        "Admin organization mirror",
        ctx.params.orgId,
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }
      return success(
        {
          orgId: ctx.params.orgId,
          totalEmployees: 200,
          totalSites: demo.sites.length,
          activeAlerts: 3,
          forecastAccuracy: 0.924,
          avgAbsenteeism: 0.048,
          coverageRate: 0.963,
        },
        ctx.requestId,
      );
    },
    adminMonitoringRead,
  ),

  route(
    "GET",
    "/api/v1/admin/organizations",
    (ctx) =>
      withDemoFallback(ctx, "Admin organizations list", () =>
        paginateFrom(
          [
            {
              id: demo.organization.id,
              name: demo.organization.name,
              slug: "praedixa-demo-org",
              status: demo.organization.status,
              plan: "professional",
              contactEmail: "ops.client@praedixa.com",
              userCount: getOrgUserCount(demo.organization.id),
              siteCount: demo.sites.length,
              createdAt: demo.organization.createdAt,
            },
          ],
          ctx,
        ),
      ),
    adminOrgRead,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations",
    (ctx) =>
      withDemoFallback(ctx, "Admin organization creation", () =>
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
      ),
    adminOrgWrite,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId",
    (ctx) =>
      withDemoFallback(
        ctx,
        "Admin organization details",
        () =>
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
              userCount: getOrgUserCount(ctx.params.orgId ?? ""),
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
        ctx.params.orgId ?? undefined,
      ),
    adminOrgRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/overview",
    (ctx) =>
      withDemoFallback(
        ctx,
        "Admin organization overview",
        () =>
          success(
            {
              organization: {
                id: ctx.params.orgId,
                name: demo.organization.name,
                slug: "praedixa-demo-org",
                status: demo.organization.status,
                plan: "professional",
                contactEmail: "ops.client@praedixa.com",
                sector: "Logistique",
                size: "200-500",
                userCount: getOrgUserCount(ctx.params.orgId ?? ""),
                siteCount: demo.sites.length,
                createdAt: demo.organization.createdAt,
              },
              mirror: {
                totalEmployees: 200,
                totalSites: demo.sites.length,
                activeAlerts: 3,
                forecastAccuracy: 0.924,
                avgAbsenteeism: 0.048,
                coverageRate: 0.963,
              },
              billing: {
                organizationId: ctx.params.orgId,
                plan: "professional",
                billingCycle: "monthly",
                monthlyAmount: 7500,
                currentUsage: 42,
                usageLimit: 100,
                nextBillingDate: "2026-03-01",
              },
              alerts: [
                {
                  id: "alt-001",
                  date: "2026-02-24",
                  type: "coverage_risk",
                  severity: "high",
                  status: "open",
                  siteId: "site-lyon",
                  siteName: "Lyon",
                },
                {
                  id: "alt-002",
                  date: "2026-02-25",
                  type: "capacity_gap",
                  severity: "medium",
                  status: "open",
                  siteId: "site-orleans",
                  siteName: "Orleans",
                },
              ],
              scenarios: [
                {
                  id: "scn-001",
                  name: "Scenario renfort interim J+3",
                  status: "recommended",
                  createdAt: "2026-02-24T09:00:00.000Z",
                },
                {
                  id: "scn-002",
                  name: "Scenario reallocation intra-site",
                  status: "draft",
                  createdAt: "2026-02-23T17:30:00.000Z",
                },
              ],
            },
            ctx.requestId,
          ),
        ctx.params.orgId ?? undefined,
      ),
    adminOrgRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/hierarchy",
    (ctx) =>
      withDemoFallback(
        ctx,
        "Admin organization hierarchy",
        () =>
          success(
            {
              organizationId: ctx.params.orgId,
              sites: demo.sites,
              departments: demo.departments,
            },
            ctx.requestId,
          ),
        ctx.params.orgId ?? undefined,
      ),
    adminOrgRead,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/suspend",
    (ctx) =>
      withDemoFallback(
        ctx,
        "Admin organization suspension",
        () => success({ id: ctx.params.orgId, status: "suspended" }, ctx.requestId),
        ctx.params.orgId ?? undefined,
      ),
    adminOrgWrite,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/reactivate",
    (ctx) =>
      withDemoFallback(
        ctx,
        "Admin organization reactivation",
        () => success({ id: ctx.params.orgId, status: "active" }, ctx.requestId),
        ctx.params.orgId ?? undefined,
      ),
    adminOrgWrite,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/churn",
    (ctx) =>
      withDemoFallback(
        ctx,
        "Admin organization churn",
        () => success({ id: ctx.params.orgId, status: "churned" }, ctx.requestId),
        ctx.params.orgId ?? undefined,
      ),
    adminOrgWrite,
  ),

  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/users",
    async (ctx) => {
      const orgId = ctx.params.orgId ?? "";
      const service = getAdminBackofficeService();
      if (service.hasDatabase()) {
        try {
          return success(
            await service.listOrganizationUsers(orgId),
            ctx.requestId,
          );
        } catch (error) {
          return backofficeFailureResponse(
            error,
            ctx.requestId,
            "USERS_LIST_FAILED",
            "Unable to load organization users",
          );
        }
      }
      return withDemoFallback(
        ctx,
        "Admin organization users",
        () =>
          success(
            listOrgUsers(orgId).map((user) => cloneAdminUser(user)),
            ctx.requestId,
          ),
        orgId,
      );
    },
    adminUsersRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/users/:userId",
    async (ctx) => {
      const orgId = ctx.params.orgId ?? "";
      const userId = ctx.params.userId ?? "";
      const service = getAdminBackofficeService();
      if (service.hasDatabase()) {
        try {
          const user = await service.getOrganizationUser(orgId, userId);
          if (!user) {
            return failure(
              "NOT_FOUND",
              "User not found for this organization",
              ctx.requestId,
              404,
              { organizationId: orgId, userId },
            );
          }
          return success(user, ctx.requestId);
        } catch (error) {
          return backofficeFailureResponse(
            error,
            ctx.requestId,
            "USER_GET_FAILED",
            "Unable to load organization user",
          );
        }
      }
      const fallbackFailure = noDemoFallbackResponse(
        ctx.requestId,
        "Admin organization user details",
        orgId,
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }
      const user = findOrgUser(orgId, userId);
      if (!user) {
        return failure(
          "NOT_FOUND",
          "User not found for this organization",
          ctx.requestId,
          404,
          { organizationId: orgId, userId },
        );
      }
      return success(cloneAdminUser(user), ctx.requestId);
    },
    adminUsersRead,
  ),
  route(
    "PATCH",
    "/api/v1/admin/organizations/:orgId/users/:userId/role",
    async (ctx) => {
      const orgId = ctx.params.orgId ?? "";
      const userId = ctx.params.userId ?? "";
      const payload = parseJsonObject(ctx.body);
      if (!payload) {
        return failure(
          "VALIDATION_ERROR",
          "Body must be a JSON object",
          ctx.requestId,
          422,
        );
      }

      const role = payload.role;
      if (!isUserRole(role) || role === "super_admin") {
        return failure(
          "VALIDATION_ERROR",
          "Role must be one of: org_admin, hr_manager, manager, employee, viewer",
          ctx.requestId,
          422,
        );
      }

      const service = getAdminBackofficeService();
      if (service.hasDatabase()) {
        try {
          return success(
            await service.changeOrganizationUserRole({
              organizationId: orgId,
              userId,
              role,
              actorUserId: ctx.user?.userId ?? "",
              requestId: ctx.requestId,
              clientIp: ctx.clientIp,
              userAgent: ctx.userAgent,
            }),
            ctx.requestId,
            "User role updated",
          );
        } catch (error) {
          return backofficeFailureResponse(
            error,
            ctx.requestId,
            "USER_ROLE_UPDATE_FAILED",
            "Unable to update user role",
          );
        }
      }
      const fallbackFailure = noDemoFallbackResponse(
        ctx.requestId,
        "Admin organization user role change",
        orgId,
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }

      const user = findOrgUser(orgId, userId);
      if (!user) {
        return failure(
          "NOT_FOUND",
          "User not found for this organization",
          ctx.requestId,
          404,
          { organizationId: orgId, userId },
        );
      }

      user.role = role;
      user.updatedAt = new Date().toISOString();
      return success(cloneAdminUser(user), ctx.requestId, "User role updated");
    },
    adminUsersWrite,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/users/invite",
    async (ctx) => {
      const orgId = ctx.params.orgId ?? "";
      const payload = parseJsonObject(ctx.body);
      if (!payload) {
        return failure(
          "VALIDATION_ERROR",
          "Body must be a JSON object",
          ctx.requestId,
          422,
        );
      }

      const email = normalizeEmail(payload.email);
      if (!email) {
        return failure(
          "VALIDATION_ERROR",
          "A valid email is required",
          ctx.requestId,
          422,
        );
      }

      const role = normalizeAdminRole(payload.role);
      if (!role) {
        return failure(
          "VALIDATION_ERROR",
          "Role must be one of: org_admin, hr_manager, manager, employee, viewer",
          ctx.requestId,
          422,
        );
      }

      const service = getAdminBackofficeService();
      if (service.hasDatabase()) {
        try {
          return success(
            await service.inviteOrganizationUser({
              organizationId: orgId,
              email,
              role,
              actorUserId: ctx.user?.userId ?? "",
              actorEmail: ctx.user?.email ?? null,
              requestId: ctx.requestId,
              clientIp: ctx.clientIp,
              userAgent: ctx.userAgent,
            }),
            ctx.requestId,
            "User invited",
            201,
          );
        } catch (error) {
          return backofficeFailureResponse(
            error,
            ctx.requestId,
            "USER_INVITE_FAILED",
            "Unable to invite organization user",
          );
        }
      }
      const fallbackFailure = noDemoFallbackResponse(
        ctx.requestId,
        "Admin organization user invitation",
        orgId,
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }

      const users = listOrgUsers(orgId);
      const alreadyExists = users.some((entry) => entry.email === email);
      if (alreadyExists) {
        return failure(
          "CONFLICT",
          "A user with this email already exists in this organization",
          ctx.requestId,
          409,
          { organizationId: orgId, email },
        );
      }

      const nowIso = new Date().toISOString();
      const created: AdminUserRecord = {
        id: `usr_${randomUUID()}`,
        organizationId: orgId,
        fullName: normalizeOptionalText(payload.fullName) ?? buildDefaultFullName(email),
        email,
        role,
        status: "pending_invite",
        siteName: normalizeOptionalText(payload.siteName),
        lastLoginAt: null,
        invitedAt: nowIso,
        invitedBy: ctx.user?.email ?? null,
        updatedAt: nowIso,
      };
      users.push(created);
      adminUsersByOrganization.set(orgId, users);

      return success(cloneAdminUser(created), ctx.requestId, "User invited", 201);
    },
    adminUsersWrite,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/users/:userId/deactivate",
    async (ctx) => {
      const orgId = ctx.params.orgId ?? "";
      const userId = ctx.params.userId ?? "";
      const service = getAdminBackofficeService();
      if (service.hasDatabase()) {
        try {
          return success(
            await service.deactivateOrganizationUser({
              organizationId: orgId,
              userId,
              actorUserId: ctx.user?.userId ?? "",
              requestId: ctx.requestId,
              clientIp: ctx.clientIp,
              userAgent: ctx.userAgent,
            }),
            ctx.requestId,
            "User deactivated",
          );
        } catch (error) {
          return backofficeFailureResponse(
            error,
            ctx.requestId,
            "USER_DEACTIVATE_FAILED",
            "Unable to deactivate organization user",
          );
        }
      }
      const fallbackFailure = noDemoFallbackResponse(
        ctx.requestId,
        "Admin organization user deactivation",
        orgId,
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }
      const user = findOrgUser(orgId, userId);
      if (!user) {
        return failure(
          "NOT_FOUND",
          "User not found for this organization",
          ctx.requestId,
          404,
          { organizationId: orgId, userId },
        );
      }

      user.status = "deactivated";
      user.updatedAt = new Date().toISOString();
      return success(cloneAdminUser(user), ctx.requestId, "User deactivated");
    },
    adminUsersWrite,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/users/:userId/reactivate",
    async (ctx) => {
      const orgId = ctx.params.orgId ?? "";
      const userId = ctx.params.userId ?? "";
      const service = getAdminBackofficeService();
      if (service.hasDatabase()) {
        try {
          return success(
            await service.reactivateOrganizationUser({
              organizationId: orgId,
              userId,
              actorUserId: ctx.user?.userId ?? "",
              requestId: ctx.requestId,
              clientIp: ctx.clientIp,
              userAgent: ctx.userAgent,
            }),
            ctx.requestId,
            "User reactivated",
          );
        } catch (error) {
          return backofficeFailureResponse(
            error,
            ctx.requestId,
            "USER_REACTIVATE_FAILED",
            "Unable to reactivate organization user",
          );
        }
      }
      const fallbackFailure = noDemoFallbackResponse(
        ctx.requestId,
        "Admin organization user reactivation",
        orgId,
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }
      const user = findOrgUser(orgId, userId);
      if (!user) {
        return failure(
          "NOT_FOUND",
          "User not found for this organization",
          ctx.requestId,
          404,
          { organizationId: orgId, userId },
        );
      }

      user.status = "active";
      user.updatedAt = new Date().toISOString();
      return success(cloneAdminUser(user), ctx.requestId, "User reactivated");
    },
    adminUsersWrite,
  ),

  route(
    "GET",
    "/api/v1/admin/billing/organizations/:orgId",
    async (ctx) => {
      const service = getAdminBackofficeService();
      if (!service.hasDatabase()) {
        return withDemoFallback(
          ctx,
          "Admin billing info",
          () =>
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
          ctx.params.orgId ?? undefined,
        );
      }

      try {
        return success(
          await service.getBillingInfo(ctx.params.orgId ?? ""),
          ctx.requestId,
        );
      } catch (error) {
        return backofficeFailureResponse(
          error,
          ctx.requestId,
          "BILLING_GET_FAILED",
          "Unable to load organization billing",
        );
      }
    },
    adminBillingRead,
  ),
  route(
    "POST",
    "/api/v1/admin/billing/organizations/:orgId/change-plan",
    async (ctx) => {
      const payload = parseJsonObject(ctx.body);
      if (!payload || typeof payload.plan !== "string") {
        return failure(
          "VALIDATION_ERROR",
          "Body must include a target plan",
          ctx.requestId,
          422,
        );
      }

      const service = getAdminBackofficeService();
      if (!service.hasDatabase()) {
        return withDemoFallback(
          ctx,
          "Admin billing plan change",
          () =>
            success(
              {
                organizationId: ctx.params.orgId,
                changed: true,
                input: ctx.body,
              },
              ctx.requestId,
            ),
          ctx.params.orgId ?? undefined,
        );
      }

      try {
        return success(
          await service.changePlan({
            organizationId: ctx.params.orgId ?? "",
            newPlan: payload.plan,
            reason:
              typeof payload.reason === "string" ? payload.reason : "",
            actorUserId: ctx.user?.userId ?? "",
            requestId: ctx.requestId,
            clientIp: ctx.clientIp,
            userAgent: ctx.userAgent,
          }),
          ctx.requestId,
        );
      } catch (error) {
        return backofficeFailureResponse(
          error,
          ctx.requestId,
          "BILLING_CHANGE_PLAN_FAILED",
          "Unable to change organization billing plan",
        );
      }
    },
    adminBillingWrite,
  ),
  route(
    "GET",
    "/api/v1/admin/billing/organizations/:orgId/history",
    async (ctx) => {
      const service = getAdminBackofficeService();
      if (!service.hasDatabase()) {
        return withDemoFallback(
          ctx,
          "Admin billing history",
          () =>
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
          ctx.params.orgId ?? undefined,
        );
      }

      try {
        return success(
          await service.getPlanHistory(ctx.params.orgId ?? ""),
          ctx.requestId,
        );
      } catch (error) {
        return backofficeFailureResponse(
          error,
          ctx.requestId,
          "BILLING_HISTORY_FAILED",
          "Unable to load organization billing history",
        );
      }
    },
    adminBillingRead,
  ),

  route(
    "GET",
    "/api/v1/admin/audit-log",
    (ctx) =>
      withDemoFallback(ctx, "Admin audit log", () =>
        paginateFrom(
          [
            {
              id: "aud-001",
              adminUserId: "admin-001",
              targetOrgId: demo.organization.id,
              action: "decision.review",
              resourceType: "operational_decision",
              resourceId: "dec-001",
              ipAddress: "10.24.8.17",
              userAgent: "Praedixa Admin Console/2.0",
              requestId: "req-aud-001",
              metadataJson: {
                previousState: "pending",
                nextState: "approved",
              },
              severity: "info",
              createdAt: new Date().toISOString(),
            },
            {
              id: "aud-002",
              adminUserId: "admin-002",
              targetOrgId: demo.organization.id,
              action: "billing.plan_changed",
              resourceType: "organization_billing",
              resourceId: "org-billing-001",
              ipAddress: "10.24.8.19",
              userAgent: "Praedixa Admin Console/2.0",
              requestId: "req-aud-002",
              metadataJson: {
                fromPlan: "starter",
                toPlan: "professional",
              },
              severity: "warning",
              createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            },
          ],
          ctx,
        ),
      ),
    adminAuditRead,
  ),

  route(
    "GET",
    "/api/v1/admin/onboarding",
    async (ctx) => {
      if (hasPersistentDatabase()) {
        try {
          const { page, pageSize } = pageQuery(ctx);
          const result = await listPersistentOnboardings({
            status: normalizeOptionalText(ctx.query.get("status")),
            page,
            pageSize,
          });
          return paginated(
            result.items,
            page,
            pageSize,
            result.total,
            ctx.requestId,
          );
        } catch (error) {
          return operationalFailureResponse(
            error,
            ctx.requestId,
            "ADMIN_ONBOARDING_LIST_FAILED",
            "Unable to load onboarding sessions",
          );
        }
      }

      const fallbackFailure = noDemoFallbackResponse(
        ctx.requestId,
        "Admin onboarding list",
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }

      return paginateFrom(
        [
          {
            id: "onb-001",
            organizationId: demo.organization.id,
            status: "in_progress",
            currentStep: 2,
            stepsCompleted: [],
            initiatedBy: "user-demo",
            createdAt: isoDateTimeOffset(-10, 8),
            completedAt: null,
          },
        ],
        ctx,
      );
    },
    adminOnboardingRead,
  ),
  route(
    "POST",
    "/api/v1/admin/onboarding",
    (ctx) => {
      const fallbackFailure = noDemoFallbackResponse(
        ctx.requestId,
        "Admin onboarding creation",
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }
      return success(
        {
          id: "onb-new",
          created: true,
          input: ctx.body,
        },
        ctx.requestId,
        "Onboarding started",
        201,
      );
    },
    adminOnboardingWrite,
  ),
  route(
    "PATCH",
    "/api/v1/admin/onboarding/:onboardingId/step/:step",
    (ctx) => {
      const fallbackFailure = noDemoFallbackResponse(
        ctx.requestId,
        "Admin onboarding step update",
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }
      return success(
        {
          id: ctx.params.onboardingId,
          currentStep: Number(ctx.params.step),
        },
        ctx.requestId,
      );
    },
    adminOnboardingWrite,
  ),

  route(
    "GET",
    "/api/v1/admin/monitoring/alerts/summary",
    async (ctx) => {
      if (hasPersistentDatabase()) {
        try {
          return success(
            await getPersistentMonitoringAlertsSummary(),
            ctx.requestId,
          );
        } catch (error) {
          return operationalFailureResponse(
            error,
            ctx.requestId,
            "ADMIN_ALERTS_SUMMARY_FAILED",
            "Unable to load alerts summary",
          );
        }
      }

      const fallbackFailure = noDemoFallbackResponse(
        ctx.requestId,
        "Admin alerts summary monitoring",
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }
      return success({ totalAlerts: 12 }, ctx.requestId);
    },
    adminMonitoringRead,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/alerts/by-org",
    async (ctx) => {
      if (hasPersistentDatabase()) {
        try {
          return success(
            await getPersistentMonitoringAlertsByOrg(),
            ctx.requestId,
          );
        } catch (error) {
          return operationalFailureResponse(
            error,
            ctx.requestId,
            "ADMIN_ALERTS_BY_ORG_FAILED",
            "Unable to load alerts by organization",
          );
        }
      }

      const fallbackFailure = noDemoFallbackResponse(
        ctx.requestId,
        "Admin alerts by organization monitoring",
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }
      return success(
        {
          organizations: [
            {
              orgId: demo.organization.id,
              orgName: demo.organization.name,
              critical: 2,
              high: 4,
              medium: 4,
              low: 2,
              total: 12,
            },
          ],
          totalAlerts: 12,
        },
        ctx.requestId,
      );
    },
    adminMonitoringRead,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/scenarios/summary",
    async (ctx) => {
      if (hasPersistentDatabase()) {
        try {
          return success(
            await getPersistentMonitoringScenariosSummary(),
            ctx.requestId,
          );
        } catch (error) {
          return operationalFailureResponse(
            error,
            ctx.requestId,
            "ADMIN_SCENARIOS_SUMMARY_FAILED",
            "Unable to load scenarios summary",
          );
        }
      }

      const fallbackFailure = noDemoFallbackResponse(
        ctx.requestId,
        "Admin scenario monitoring",
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }
      return success({ scenariosGenerated: 31 }, ctx.requestId);
    },
    adminMonitoringRead,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/decisions/summary",
    async (ctx) => {
      if (hasPersistentDatabase()) {
        try {
          return success(
            await getPersistentMonitoringDecisionsSummary(),
            ctx.requestId,
          );
        } catch (error) {
          return operationalFailureResponse(
            error,
            ctx.requestId,
            "ADMIN_DECISIONS_SUMMARY_FAILED",
            "Unable to load decisions summary",
          );
        }
      }

      const fallbackFailure = noDemoFallbackResponse(
        ctx.requestId,
        "Admin decision monitoring summary",
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }
      return success({ totalDecisions: 48 }, ctx.requestId);
    },
    adminMonitoringRead,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/decisions/overrides",
    async (ctx) => {
      if (hasPersistentDatabase()) {
        try {
          return success(
            await getPersistentMonitoringDecisionsOverrides(),
            ctx.requestId,
          );
        } catch (error) {
          return operationalFailureResponse(
            error,
            ctx.requestId,
            "ADMIN_DECISIONS_OVERRIDES_FAILED",
            "Unable to load decision override metrics",
          );
        }
      }

      const fallbackFailure = noDemoFallbackResponse(
        ctx.requestId,
        "Admin decision override monitoring",
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }
      return success({ overrideRatePct: 21.4 }, ctx.requestId);
    },
    adminMonitoringRead,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/decisions/adoption",
    async (ctx) => {
      if (hasPersistentDatabase()) {
        try {
          return success(
            await getPersistentMonitoringDecisionsAdoption(),
            ctx.requestId,
          );
        } catch (error) {
          return operationalFailureResponse(
            error,
            ctx.requestId,
            "ADMIN_DECISIONS_ADOPTION_FAILED",
            "Unable to load decision adoption metrics",
          );
        }
      }

      const fallbackFailure = noDemoFallbackResponse(
        ctx.requestId,
        "Admin decision adoption monitoring",
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }
      return success(
        {
          organizations: [
            {
              orgId: demo.organization.id,
              orgName: demo.organization.name,
              adoptionRate: 62.5,
              totalDecisions: 48,
            },
          ],
        },
        ctx.requestId,
      );
    },
    adminMonitoringRead,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/proof-packs/summary",
    async (ctx) => {
      if (hasPersistentDatabase()) {
        try {
          return success(
            await getPersistentMonitoringProofPacksSummary(),
            ctx.requestId,
          );
        } catch (error) {
          return operationalFailureResponse(
            error,
            ctx.requestId,
            "ADMIN_PROOF_PACKS_SUMMARY_FAILED",
            "Unable to load proof pack summary",
          );
        }
      }

      const fallbackFailure = noDemoFallbackResponse(
        ctx.requestId,
        "Admin proof pack monitoring summary",
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }
      return success({ generatedMonthly: 1 }, ctx.requestId);
    },
    adminMonitoringRead,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/canonical-coverage",
    async (ctx) => {
      if (hasPersistentDatabase()) {
        try {
          return success(
            await getPersistentMonitoringCanonicalCoverage(),
            ctx.requestId,
          );
        } catch (error) {
          return operationalFailureResponse(
            error,
            ctx.requestId,
            "ADMIN_CANONICAL_COVERAGE_FAILED",
            "Unable to load canonical coverage",
          );
        }
      }

      const fallbackFailure = noDemoFallbackResponse(
        ctx.requestId,
        "Admin canonical coverage monitoring",
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }
      return success({ coveragePct: 98.7 }, ctx.requestId);
    },
    adminMonitoringRead,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/cost-params/missing",
    async (ctx) => {
      if (hasPersistentDatabase()) {
        try {
          return success(
            await getPersistentMonitoringMissingCostParams(),
            ctx.requestId,
          );
        } catch (error) {
          return operationalFailureResponse(
            error,
            ctx.requestId,
            "ADMIN_COST_PARAMS_MISSING_FAILED",
            "Unable to load missing cost parameters",
          );
        }
      }

      const fallbackFailure = noDemoFallbackResponse(
        ctx.requestId,
        "Admin missing cost parameters monitoring",
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }
      return success(
        {
          totalOrgsWithMissing: 0,
          totalMissingParams: 0,
          organizations: [],
          orgs: [],
          missing: [],
        },
        ctx.requestId,
      );
    },
    adminMonitoringRead,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/roi/by-org",
    async (ctx) => {
      if (hasPersistentDatabase()) {
        try {
          return success(
            await getPersistentMonitoringRoiByOrg(),
            ctx.requestId,
          );
        } catch (error) {
          return operationalFailureResponse(
            error,
            ctx.requestId,
            "ADMIN_ROI_BY_ORG_FAILED",
            "Unable to load ROI by organization",
          );
        }
      }

      const fallbackFailure = noDemoFallbackResponse(
        ctx.requestId,
        "Admin ROI monitoring by organization",
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }
      return success(
        [
          {
            organizationId: demo.organization.id,
            gainNetVsBauEur: 15200,
          },
        ],
        ctx.requestId,
      );
    },
    adminMonitoringRead,
  ),

  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/canonical",
    async (ctx) => {
      const orgId = ctx.params.orgId ?? "";
      if (!shouldUsePersistentAdminOrgData(orgId)) {
        const fallbackFailure = noDemoFallbackResponse(
          ctx.requestId,
          "Admin organization canonical records",
          orgId,
        );
        if (fallbackFailure) {
          return fallbackFailure;
        }
        return success(
          [
            {
              organizationId: ctx.params.orgId,
              id: "can-001",
              employeeId: "EMP-017",
              absenceType: "maladie",
              hours: 7,
              siteName: "Lyon",
              departmentName: "Production",
              siteId: "site-lyon",
              date: "2026-02-24",
              shift: "PM",
            },
            {
              organizationId: ctx.params.orgId,
              id: "can-002",
              employeeId: "EMP-102",
              absenceType: "formation",
              hours: 3.5,
              siteName: "Orleans",
              departmentName: "Logistique",
              siteId: "site-orleans",
              date: "2026-02-24",
              shift: "AM",
            },
          ],
          ctx.requestId,
        );
      }

      try {
        const records = await listPersistentCanonicalRecords({
          organizationId: orgId,
          scope: {
            orgWide: true,
            accessibleSiteIds: [],
            requestedSiteId: normalizeOptionalText(ctx.query.get("site_id")),
          },
        });
        return success(records.map(mapAdminCanonicalItem), ctx.requestId);
      } catch (error) {
        return operationalFailureResponse(
          error,
          ctx.requestId,
          "ADMIN_CANONICAL_FAILED",
          "Unable to load organization canonical records",
        );
      }
    },
    adminOrgRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/canonical/quality",
    async (ctx) => {
      const orgId = ctx.params.orgId ?? "";
      if (!shouldUsePersistentAdminOrgData(orgId)) {
        const fallbackFailure = noDemoFallbackResponse(
          ctx.requestId,
          "Admin organization canonical quality",
          orgId,
        );
        if (fallbackFailure) {
          return fallbackFailure;
        }
        return success(
          {
            organizationId: ctx.params.orgId,
            totalRecords: 1248,
            validRecords: 1216,
            duplicateRecords: 8,
            missingFields: 24,
            completenessRate: 0.981,
            qualityScore: 0.965,
          },
          ctx.requestId,
        );
      }

      try {
        return success(
          mapAdminCanonicalQuality(
            await getPersistentCanonicalQuality({
              organizationId: orgId,
              scope: {
                orgWide: true,
                accessibleSiteIds: [],
                requestedSiteId: normalizeOptionalText(ctx.query.get("site_id")),
              },
            }),
          ),
          ctx.requestId,
        );
      } catch (error) {
        return operationalFailureResponse(
          error,
          ctx.requestId,
          "ADMIN_CANONICAL_QUALITY_FAILED",
          "Unable to load organization canonical quality",
        );
      }
    },
    adminOrgRead,
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
    adminOrgRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/decision-config/resolved",
    async (ctx) => {
      const organizationId = ctx.params.orgId ?? ORGANIZATION_ID;
      const service = getDecisionConfigService();
      const siteId = normalizeOptionalText(ctx.query.get("site_id"));
      try {
        const resolved = await service.resolveConfig({
          organizationId,
          siteId,
        });
        return success(resolved, ctx.requestId);
      } catch (error) {
        return failure(
          "decision_config_resolve_failed",
          error instanceof Error ? error.message : "Unable to resolve decision config",
          ctx.requestId,
          400,
        );
      }
    },
    adminOrgRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/decision-config/versions",
    async (ctx) => {
      const organizationId = ctx.params.orgId ?? ORGANIZATION_ID;
      const service = getDecisionConfigService();
      const siteIdRaw = ctx.query.get("site_id");
      const siteId = normalizeOptionalText(siteIdRaw);
      const versions = await service.listVersions(
        organizationId,
        siteIdRaw == null ? undefined : siteId,
      );
      return success(versions, ctx.requestId);
    },
    adminOrgRead,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/decision-config/versions",
    async (ctx) => {
      const organizationId = ctx.params.orgId ?? ORGANIZATION_ID;
      const body = parseJsonObject(ctx.body);
      if (!body) {
        return failure(
          "invalid_body",
          "Request body must be a JSON object.",
          ctx.requestId,
          400,
        );
      }

      const effectiveAtRaw = body.effectiveAt;
      const payloadRaw = body.payload;
      if (typeof effectiveAtRaw !== "string" || effectiveAtRaw.trim().length === 0) {
        return failure(
          "invalid_effective_at",
          "effectiveAt is required and must be an ISO datetime string.",
          ctx.requestId,
          400,
        );
      }
      if (!payloadRaw || typeof payloadRaw !== "object" || Array.isArray(payloadRaw)) {
        return failure(
          "invalid_payload",
          "payload is required and must be an object.",
          ctx.requestId,
          400,
        );
      }

      const service = getDecisionConfigService();
      try {
        const created = await service.createVersion({
          organizationId,
          siteId: normalizeOptionalText(body.siteId),
          effectiveAt: effectiveAtRaw,
          payload: payloadRaw as DecisionEngineConfigPayload,
          createdBy: ctx.user?.userId ?? null,
          reason: normalizeOptionalText(body.reason) ?? undefined,
          requestId: ctx.requestId,
        });
        return success(
          created,
          ctx.requestId,
          "Decision config version scheduled",
          201,
        );
      } catch (error) {
        return failure(
          "decision_config_create_failed",
          error instanceof Error ? error.message : "Unable to create decision config version",
          ctx.requestId,
          400,
        );
      }
    },
    adminOrgWrite,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/decision-config/versions/:versionId/cancel",
    async (ctx) => {
      const organizationId = ctx.params.orgId ?? ORGANIZATION_ID;
      const requestedVersionId = ctx.params.versionId ?? "";
      if (requestedVersionId.length === 0) {
        return failure(
          "decision_config_version_missing",
          "Decision config version id is required.",
          ctx.requestId,
          400,
        );
      }
      const body = parseJsonObject(ctx.body);
      const service = getDecisionConfigService();
      const versions = await service.listVersions(organizationId);
      const targetVersion = versions.find(
        (version) => version.id === requestedVersionId,
      );
      if (!targetVersion) {
        return failure(
          "decision_config_version_not_found",
          "Decision config version not found.",
          ctx.requestId,
          404,
        );
      }

      try {
        const cancelled = await service.cancelVersion({
          organizationId,
          versionId: targetVersion.id,
          siteId: targetVersion.siteId ?? null,
          actorUserId: ctx.user?.userId ?? null,
          reason: normalizeOptionalText(body?.reason) ?? undefined,
          requestId: ctx.requestId,
        });
        return success(cancelled, ctx.requestId, "Version cancelled");
      } catch (error) {
        return failure(
          "decision_config_cancel_failed",
          error instanceof Error ? error.message : "Unable to cancel decision config version",
          ctx.requestId,
          400,
        );
      }
    },
    adminOrgWrite,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/decision-config/versions/:versionId/rollback",
    async (ctx) => {
      const organizationId = ctx.params.orgId ?? ORGANIZATION_ID;
      const requestedVersionId = ctx.params.versionId ?? "";
      if (requestedVersionId.length === 0) {
        return failure(
          "decision_config_version_missing",
          "Decision config version id is required.",
          ctx.requestId,
          400,
        );
      }
      const body = parseJsonObject(ctx.body);
      const service = getDecisionConfigService();
      const versions = await service.listVersions(organizationId);
      const targetVersion = versions.find(
        (version) => version.id === requestedVersionId,
      );
      if (!targetVersion) {
        return failure(
          "decision_config_version_not_found",
          "Decision config version not found.",
          ctx.requestId,
          404,
        );
      }

      try {
        const rolledBack = await service.rollback({
          organizationId,
          siteId: targetVersion.siteId ?? null,
          actorUserId: ctx.user?.userId ?? null,
          reason:
            normalizeOptionalText(body?.reason) ??
            `rollback_requested_from_${targetVersion.id}`,
          requestId: ctx.requestId,
        });
        return success(rolledBack, ctx.requestId, "Rollback version activated", 201);
      } catch (error) {
        return failure(
          "decision_config_rollback_failed",
          error instanceof Error ? error.message : "Unable to rollback decision config",
          ctx.requestId,
          400,
        );
      }
    },
    adminOrgWrite,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/alerts/:alertId/scenarios/recompute",
    async (ctx) => {
      const organizationId = ctx.params.orgId ?? ORGANIZATION_ID;
      const alertId = ctx.params.alertId ?? "alt-001";
      const alert = await findAdminCoverageAlert(organizationId, alertId);
      if (alert == null) {
        return failure("NOT_FOUND", "Coverage alert not found", ctx.requestId, 404);
      }

      const service = getDecisionConfigService();
      const config = await service.resolveConfig({
        organizationId,
        siteId: alert.siteId,
      });
      const scenario = applyScenarioRecommendationPolicy(
        buildScenarioOptions(alert.id, config.versionId),
        config.payload,
        alert.horizon,
        config.versionId,
      );

      return success(
        {
          alertId: alert.id,
          options: scenario.options,
          paretoFrontier: scenario.options.filter((option) => option.isParetoOptimal),
          recommendedOptionId: scenario.recommendedOptionId,
          recommended:
            scenario.options.find((option) => option.id === scenario.recommendedOptionId) ??
            null,
          recommendationPolicyVersion: config.versionId,
          recomputedAt: new Date().toISOString(),
        },
        ctx.requestId,
      );
    },
    adminOrgWrite,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/alerts",
    async (ctx) => {
      const orgId = ctx.params.orgId ?? "";
      if (!shouldUsePersistentAdminOrgData(orgId)) {
        const fallbackFailure = noDemoFallbackResponse(
          ctx.requestId,
          "Admin organization alerts",
          orgId,
        );
        if (fallbackFailure) {
          return fallbackFailure;
        }
        return success(
          [
            {
              organizationId: ctx.params.orgId,
              id: "alt-001",
              severity: "high",
            },
          ],
          ctx.requestId,
        );
      }

      try {
        return success(
          (
            await listPersistentCoverageAlerts({
              organizationId: orgId,
              scope: {
                orgWide: true,
                accessibleSiteIds: [],
                requestedSiteId: normalizeOptionalText(ctx.query.get("site_id")),
              },
            })
          ).map(mapAdminAlertItem),
          ctx.requestId,
        );
      } catch (error) {
        return operationalFailureResponse(
          error,
          ctx.requestId,
          "ADMIN_ALERTS_LIST_FAILED",
          "Unable to load organization alerts",
        );
      }
    },
    adminOrgRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/scenarios",
    (ctx) =>
      withDemoFallback(
        ctx,
        "Admin organization scenarios",
        () =>
          success(
            [
              {
                organizationId: ctx.params.orgId,
                id: "scn-001",
                name: "Renfort interim PM",
                type: "interim",
                status: "completed",
                createdAt: isoDateTimeOffset(-2, 9),
                recommended: true,
              },
              {
                organizationId: ctx.params.orgId,
                id: "scn-002",
                name: "Heures supplementaires ciblees",
                type: "overtime",
                status: "running",
                createdAt: isoDateTimeOffset(-1, 10),
                recommended: false,
              },
            ],
            ctx.requestId,
          ),
        ctx.params.orgId ?? undefined,
      ),
    adminOrgRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/ml-monitoring/summary",
    (ctx) =>
      withDemoFallback(
        ctx,
        "Admin organization ML monitoring summary",
        () =>
          success(
            {
              organizationId: ctx.params.orgId,
              modelVersion: "ensemble-2026.02.25",
              mape: 9.4,
              mae: 4.2,
              driftScore: 0.11,
              status: "healthy",
              lastTrainingAt: isoDateTimeOffset(-7, 8),
            },
            ctx.requestId,
          ),
        ctx.params.orgId ?? undefined,
      ),
    adminOrgRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/ml-monitoring/drift",
    (ctx) =>
      withDemoFallback(
        ctx,
        "Admin organization ML drift",
        () =>
          success(
            ML_MONITORING_DAILY.slice(-14).map((row, index) => ({
              id: `drift-${index + 1}`,
              organizationId: ctx.params.orgId,
              feature: `feature_${(index % 6) + 1}`,
              driftScore: row.dataDriftScore,
              pValue: Number((0.02 + (index % 5) * 0.01).toFixed(4)),
              detectedAt: `${row.date}T00:00:00Z`,
            })),
            ctx.requestId,
          ),
        ctx.params.orgId ?? undefined,
      ),
    adminOrgRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/proof-packs",
    async (ctx) => {
      const orgId = ctx.params.orgId ?? "";
      if (shouldUsePersistentAdminOrgData(orgId)) {
        try {
          return success(
            (
              await listPersistentProofRecords({
                organizationId: orgId,
                scope: {
                  orgWide: true,
                  accessibleSiteIds: [],
                  requestedSiteId: normalizeOptionalText(ctx.query.get("site_id")),
                },
                dateFrom: normalizeOptionalText(ctx.query.get("date_from")),
                dateTo: normalizeOptionalText(ctx.query.get("date_to")),
              })
            ).map((proof) => ({
              organizationId: orgId,
              id: proof.id,
              name: `Proof ${proof.siteId} ${proof.month.slice(0, 7)}`,
              status: "generated",
              generatedAt: `${proof.month.slice(0, 10)}T08:00:00.000Z`,
              downloadUrl: `/proof/${proof.id}.pdf`,
              month: proof.month,
              siteId: proof.siteId,
            })),
            ctx.requestId,
          );
        } catch (error) {
          return operationalFailureResponse(
            error,
            ctx.requestId,
            "ADMIN_PROOF_PACKS_FAILED",
            "Unable to load organization proof packs",
          );
        }
      }

      const fallbackFailure = noDemoFallbackResponse(
        ctx.requestId,
        "Admin organization proof packs",
        orgId,
      );
      if (fallbackFailure) {
        return fallbackFailure;
      }

      return success(
        LIVE_PROOF_PACKS.map((proof) => ({
          organizationId: ctx.params.orgId,
          id: proof.id,
          name: `Proof ${proof.siteId} ${proof.month.slice(0, 7)}`,
          status: "generated",
          generatedAt: `${proof.month.slice(0, 10)}T08:00:00.000Z`,
          downloadUrl: `/proof/${proof.id}.pdf`,
          month: proof.month,
          siteId: proof.siteId,
        })),
        ctx.requestId,
      );
    },
    adminOrgRead,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/proof-packs/:proofPackId/share-link",
    (ctx) =>
      withDemoFallback(
        ctx,
        "Admin proof pack share link",
        () =>
          success(
            {
              organizationId: ctx.params.orgId,
              proofPackId: ctx.params.proofPackId,
              url: `https://files.praedixa.local/share/${encodeURIComponent(
                ctx.params.orgId ?? "org",
              )}/${encodeURIComponent(ctx.params.proofPackId ?? "proof")}`,
              expiresAt: isoDateTimeOffset(7, 12),
            },
            ctx.requestId,
            "Share link generated",
            201,
          ),
        ctx.params.orgId ?? undefined,
      ),
    adminOrgWrite,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/ingestion-log",
    (ctx) =>
      withDemoFallback(
        ctx,
        "Admin ingestion log",
        () =>
          success(
            [
              {
                organizationId: ctx.params.orgId,
                id: "ing-001",
                fileName: "absences_2026_02.csv",
                status: "completed",
                rowsProcessed: 1842,
                rowsRejected: 12,
                createdAt: isoDateTimeOffset(-1, 6),
              },
              {
                organizationId: ctx.params.orgId,
                id: "ing-002",
                fileName: "capacites_2026_02.csv",
                status: "completed",
                rowsProcessed: 930,
                rowsRejected: 0,
                createdAt: isoDateTimeOffset(-2, 7),
              },
            ],
            ctx.requestId,
          ),
        ctx.params.orgId ?? undefined,
      ),
    adminOrgRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/medallion-quality-report",
    (ctx) =>
      withDemoFallback(
        ctx,
        "Admin medallion quality report",
        () =>
          success(
            {
              organizationId: ctx.params.orgId,
              clientSlug: "client-demo",
              goldRevision: "gold-2026.03.01-r2",
              silverQuality: {
                columns: {
                  demand_h: { missingRate: 0.01, imputedCount: 4 },
                  planned_h: { missingRate: 0.0, imputedCount: 0 },
                  abs_h: { missingRate: 0.02, imputedCount: 9 },
                },
              },
              goldFeatureQuality: {
                removed_from_gold_columns_count: 2,
                removed_from_gold_columns: ["raw_comment", "debug_trace_id"],
              },
              lastRunSummary: {
                run_at: isoDateTimeOffset(0, 3),
                silver_rows: 1248,
                gold_rows: 1248,
              },
            },
            ctx.requestId,
          ),
        ctx.params.orgId ?? undefined,
      ),
    adminOrgRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/datasets",
    (ctx) =>
      withDemoFallback(
        ctx,
        "Admin datasets",
        () =>
          success(
            (demo.datasets as Record<string, unknown>[]).map((dataset) => ({
              id: String(dataset.id ?? "dataset"),
              organizationId: ctx.params.orgId,
              name: String(dataset.name ?? dataset.id ?? "dataset"),
              status: String(dataset.status ?? "ready"),
              rowCount:
                typeof dataset.rowCount === "number" ? dataset.rowCount : 120,
              updatedAt: new Date().toISOString(),
            })),
            ctx.requestId,
          ),
        ctx.params.orgId ?? undefined,
      ),
    adminOrgRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/datasets/:datasetId/data",
    (ctx) =>
      withDemoFallback(
        ctx,
        "Admin dataset rows",
        () =>
          success(
            {
              organizationId: ctx.params.orgId,
              datasetId: ctx.params.datasetId,
              rows: [
                {
                  site_id: "site-lyon",
                  date: "2026-03-01",
                  demand_h: 318,
                  planned_h: 304,
                  optimal_h: 322,
                  risk_score: 0.42,
                },
                {
                  site_id: "site-orleans",
                  date: "2026-03-01",
                  demand_h: 252,
                  planned_h: 244,
                  optimal_h: 261,
                  risk_score: 0.31,
                },
              ],
            },
            ctx.requestId,
          ),
        ctx.params.orgId ?? undefined,
      ),
    adminOrgRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/datasets/:datasetId/features",
    (ctx) =>
      withDemoFallback(
        ctx,
        "Admin dataset features",
        () =>
          success(
            {
              organizationId: ctx.params.orgId,
              datasetId: ctx.params.datasetId,
              features: [
                "lag_7",
                "rolling_mean_14",
                "seasonality_weekday",
                "absence_rate_rolling_7",
              ],
            },
            ctx.requestId,
          ),
        ctx.params.orgId ?? undefined,
      ),
    adminOrgRead,
  ),

  route(
    "GET",
    "/api/v1/admin/conversations",
    (ctx) =>
      withDemoFallback(ctx, "Admin conversations", () =>
        success(demo.conversations, ctx.requestId),
      ),
    adminMessagesRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/conversations",
    (ctx) =>
      withDemoFallback(
        ctx,
        "Admin organization conversations",
        () =>
          success(
            [
              {
                ...((demo.conversations as Record<string, unknown>[])[0] ?? {}),
                organizationId: ctx.params.orgId,
              },
            ],
            ctx.requestId,
          ),
        ctx.params.orgId ?? undefined,
      ),
    adminMessagesRead,
  ),
  route(
    "GET",
    "/api/v1/admin/conversations/:convId/messages",
    (ctx) =>
      withDemoFallback(ctx, "Admin conversation messages", () =>
        success(getConversationMessages(ctx.params.convId ?? ""), ctx.requestId),
      ),
    adminMessagesRead,
  ),
  route(
    "GET",
    "/api/v1/admin/conversations/unread-count",
    (ctx) =>
      withDemoFallback(ctx, "Admin conversation unread count", () =>
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
    adminMessagesRead,
  ),
  route(
    "GET",
    "/api/v1/admin/conversations/:convId",
    (ctx) =>
      withDemoFallback(ctx, "Admin conversation details", () =>
        success(
          {
            id: ctx.params.convId,
            status: "open",
          },
          ctx.requestId,
        ),
      ),
    adminMessagesRead,
  ),
  route(
    "POST",
    "/api/v1/admin/conversations/:convId/messages",
    (ctx) =>
      withDemoFallback(ctx, "Admin conversation message creation", () =>
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
      ),
    adminMessagesWrite,
  ),
  route(
    "PATCH",
    "/api/v1/admin/conversations/:convId",
    (ctx) =>
      withDemoFallback(ctx, "Admin conversation update", () =>
        success(
          {
            id: ctx.params.convId,
            patch: ctx.body,
          },
          ctx.requestId,
        ),
      ),
    adminMessagesWrite,
  ),
  route(
    "GET",
    "/api/v1/admin/contact-requests",
    (ctx) =>
      withDemoFallback(ctx, "Admin contact requests", () =>
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
      ),
    adminSupportRead,
  ),
  route(
    "PATCH",
    "/api/v1/admin/contact-requests/:requestId/status",
    (ctx) =>
      withDemoFallback(ctx, "Admin contact request status update", () =>
        success(
          {
            id: ctx.params.requestId,
            patch: ctx.body,
          },
          ctx.requestId,
        ),
      ),
    adminSupportWrite,
  ),
];
