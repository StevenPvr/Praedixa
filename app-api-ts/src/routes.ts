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
  createPersistentOperationalDecision,
  getPersistentOperationalDecisionOverrideStats,
  listPersistentOperationalDecisions,
} from "./services/operational-decisions.js";
import {
  getPersistentActionDispatchDetail,
  getPersistentLedgerDetail,
  listPersistentApprovalInbox,
} from "./services/decisionops-runtime.js";
import { decidePersistentApproval } from "./services/decisionops-runtime-approval.js";
import {
  getPersistentDecisionWorkspace,
  getPersistentParetoFrontierForAlert,
} from "./services/operational-scenarios.js";
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
const adminUsersWriteRateLimit: RouteRateLimit = {
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
const approvalDecisionSchema = z.object({
  outcome: z.enum(["granted", "rejected"]),
  reasonCode: z.string().trim().min(1).max(120),
  comment: z.string().trim().max(1_000).optional(),
  decidedAt: z.string().datetime().optional(),
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

function standardMeta(view: string): Record<string, unknown> {
  return {
    view,
    generatedAt: new Date().toISOString(),
  };
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

function toDecisionQueueItems(
  items: CoverageAlertRecord[],
): DecisionQueueRecord[] {
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
        priorityScore: Number(
          (severityWeight * item.pRupture * 100).toFixed(2),
        ),
        estimatedImpactEur: item.impactEur ?? Math.round(item.gapH * 140),
        timeToBreachHours: Math.max(2, 48 - index * 6),
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

function findCoverageAlert(alertId: string): CoverageAlertRecord | null {
  return COVERAGE_ALERTS.find((entry) => entry.id === alertId) ?? null;
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
  rateLimit: adminUsersWriteRateLimit,
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

  return failure(fallbackCode, fallbackMessage, requestId, 400);
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

  return failure(fallbackCode, fallbackMessage, requestId, 400);
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

  return failure(fallbackCode, fallbackMessage, requestId, 400);
}

const ADMIN_ASSIGNABLE_ROLES = [
  "org_admin",
  "hr_manager",
  "manager",
  "employee",
  "viewer",
] as const;

type AdminAssignableRole = (typeof ADMIN_ASSIGNABLE_ROLES)[number];

const ADMIN_ASSIGNABLE_ROLE_SET = new Set<string>(ADMIN_ASSIGNABLE_ROLES);

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseOptionalBooleanQuery(
  value: string | null,
  fieldName: string,
): boolean | undefined {
  if (value == null) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) {
    return undefined;
  }

  if (normalized === "true" || normalized === "1") {
    return true;
  }

  if (normalized === "false" || normalized === "0") {
    return false;
  }

  throw new PersistenceError(
    `${fieldName} must be true or false.`,
    400,
    "INVALID_BOOLEAN_FILTER",
  );
}

function noDemoFallbackResponse(
  requestId: string,
  feature: string,
  organizationId?: string,
) {
  if (
    organizationId != null &&
    organizationId.length > 0 &&
    !isUuidString(organizationId)
  ) {
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
      `${feature} requires DATABASE_URL and a persistent implementation. Demo and stub payloads are disabled on real runtime routes.`,
      requestId,
      503,
      { feature },
    );
  }

  return failure(
    "PERSISTENCE_UNAVAILABLE",
    `${feature} is unavailable until its persistent implementation is configured. Demo and stub payloads are disabled on real runtime routes.`,
    requestId,
    503,
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

function liveFallbackFailure(ctx: RouteContext, feature: string) {
  return noDemoFallbackResponse(
    ctx.requestId,
    feature,
    scopedOrganizationId(ctx),
  );
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

function forbiddenSiteScope(
  ctx: RouteContext,
  siteId: string | null | undefined,
) {
  const normalizedSiteId = normalizeOptionalText(siteId);
  if (
    normalizedSiteId == null ||
    isSiteAccessibleToUser(ctx, normalizedSiteId)
  ) {
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

    return liveFallbackFailure(ctx, "Live dashboard summary");
  }),
  route("GET", "/api/v1/live/forecasts", async (ctx) => {
    const status = normalizeOptionalText(ctx.query.get("status"));
    const siteId = ctx.query.get("site_id");
    const siteScopeError = forbiddenSiteScope(ctx, siteId);
    if (siteScopeError) {
      return siteScopeError;
    }
    if (shouldUsePersistentLiveData(ctx)) {
      try {
        return success(
          await listPersistentForecastRuns({
            organizationId: scopedOrganizationId(ctx),
            scope: buildPersistentSiteScope(ctx, siteId),
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

    return noDemoFallbackResponse(
      ctx.requestId,
      "Live forecasts",
      scopedOrganizationId(ctx),
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

    return noDemoFallbackResponse(
      ctx.requestId,
      "Live latest daily forecasts",
      scopedOrganizationId(ctx),
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

    return noDemoFallbackResponse(
      ctx.requestId,
      "Live Gold schema",
      scopedOrganizationId(ctx),
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

    return noDemoFallbackResponse(
      ctx.requestId,
      "Live Gold rows",
      scopedOrganizationId(ctx),
    );
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

    return noDemoFallbackResponse(
      ctx.requestId,
      "Live Gold coverage",
      scopedOrganizationId(ctx),
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

    return noDemoFallbackResponse(
      ctx.requestId,
      "Live Gold provenance",
      scopedOrganizationId(ctx),
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

    return noDemoFallbackResponse(
      ctx.requestId,
      "Live proof packs",
      scopedOrganizationId(ctx),
    );
  }),
  route("GET", "/api/v1/organizations/me", (ctx) =>
    liveFallbackFailure(ctx, "Organization profile"),
  ),
  route("GET", "/api/v1/departments", (ctx) =>
    liveFallbackFailure(ctx, "Departments"),
  ),
  route("GET", "/api/v1/sites", (ctx) => liveFallbackFailure(ctx, "Sites")),

  route("GET", "/api/v1/forecasts", (ctx) =>
    liveFallbackFailure(ctx, "Forecast runs"),
  ),
  route("GET", "/api/v1/forecasts/:forecastId/summary", (ctx) =>
    liveFallbackFailure(ctx, "Forecast summary"),
  ),
  route("GET", "/api/v1/forecasts/:forecastId/daily", (ctx) =>
    liveFallbackFailure(ctx, "Forecast daily details"),
  ),
  route("POST", "/api/v1/forecasts", (ctx) =>
    liveFallbackFailure(ctx, "Forecast creation"),
  ),
  route("POST", "/api/v1/forecasts/what-if", (ctx) =>
    liveFallbackFailure(ctx, "Forecast what-if analysis"),
  ),

  route("GET", "/api/v1/decisions", (ctx) =>
    liveFallbackFailure(ctx, "Decisions"),
  ),
  route("GET", "/api/v1/decisions/:decisionId", (ctx) =>
    liveFallbackFailure(ctx, "Decision details"),
  ),
  route("PATCH", "/api/v1/decisions/:decisionId/review", (ctx) =>
    liveFallbackFailure(ctx, "Decision review"),
  ),
  route("POST", "/api/v1/decisions/:decisionId/outcome", (ctx) =>
    liveFallbackFailure(ctx, "Decision outcome"),
  ),

  route("GET", "/api/v1/arbitrage/:alertId/options", (ctx) =>
    liveFallbackFailure(ctx, "Arbitrage options"),
  ),
  route("POST", "/api/v1/arbitrage/:alertId/validate", (ctx) =>
    liveFallbackFailure(ctx, "Arbitrage validation"),
  ),

  route("GET", "/api/v1/alerts", async (ctx) => {
    const service = getAdminBackofficeService();
    if (!service.hasDatabase()) {
      return liveFallbackFailure(ctx, "Dashboard alerts");
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
      return liveFallbackFailure(ctx, "Dashboard alert dismissal");
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
    liveFallbackFailure(ctx, "Analytics costs"),
  ),

  route("POST", "/api/v1/exports/:resource", (ctx) =>
    liveFallbackFailure(ctx, "Export queueing"),
  ),

  route("GET", "/api/v1/datasets", (ctx) =>
    liveFallbackFailure(ctx, "Datasets"),
  ),
  route("GET", "/api/v1/datasets/:datasetId", (ctx) =>
    liveFallbackFailure(ctx, "Dataset details"),
  ),
  route("GET", "/api/v1/datasets/:datasetId/data", (ctx) =>
    liveFallbackFailure(ctx, "Dataset rows"),
  ),
  route("GET", "/api/v1/datasets/:datasetId/columns", (ctx) =>
    liveFallbackFailure(ctx, "Dataset columns"),
  ),
  route("GET", "/api/v1/datasets/:datasetId/ingestion-log", (ctx) =>
    liveFallbackFailure(ctx, "Dataset ingestion log"),
  ),

  route("GET", "/api/v1/live/canonical", async (ctx) => {
    if (!shouldUsePersistentLiveData(ctx)) {
      return liveFallbackFailure(ctx, "Live canonical records");
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
      return liveFallbackFailure(ctx, "Live canonical quality");
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
      return liveFallbackFailure(ctx, "Live coverage alerts");
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
      return liveFallbackFailure(ctx, "Live coverage alert queue");
    }

    const queue = toDecisionQueueItems(scoped);
    const limit = parsePositiveInt(ctx.query.get("limit"), 50);
    return success(queue.slice(0, limit), ctx.requestId);
  }),
  route(
    "PATCH",
    "/api/v1/coverage-alerts/:alertId/acknowledge",
    async (ctx) => {
      if (!shouldUsePersistentLiveData(ctx)) {
        return liveFallbackFailure(ctx, "Coverage alert acknowledgement");
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
    },
  ),
  route("PATCH", "/api/v1/coverage-alerts/:alertId/resolve", async (ctx) => {
    if (!shouldUsePersistentLiveData(ctx)) {
      return liveFallbackFailure(ctx, "Coverage alert resolution");
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
    if (!shouldUsePersistentLiveData(ctx)) {
      return liveFallbackFailure(ctx, "Live scenario generation");
    }

    try {
      return success(
        await getPersistentParetoFrontierForAlert({
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
        "LIVE_SCENARIOS_FAILED",
        "Unable to load live scenarios",
      );
    }
  }),
  route("GET", "/api/v1/live/decision-workspace/:alertId", async (ctx) => {
    if (!shouldUsePersistentLiveData(ctx)) {
      return liveFallbackFailure(ctx, "Live decision workspace");
    }

    try {
      return success(
        await getPersistentDecisionWorkspace({
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
        "DECISION_WORKSPACE_FAILED",
        "Unable to load decision workspace",
      );
    }
  }),
  route("POST", "/api/v1/scenarios/generate/:alertId", async (ctx) => {
    return liveFallbackFailure(ctx, "Scenario generation");
  }),

  route("POST", "/api/v1/operational-decisions", async (ctx) => {
    if (!shouldUsePersistentLiveData(ctx)) {
      return liveFallbackFailure(ctx, "Operational decisions");
    }

    const payload = parseJsonObject(ctx.body);
    if (!payload || typeof payload.alertId !== "string") {
      return failure(
        "VALIDATION_ERROR",
        "Body must include alertId",
        ctx.requestId,
        422,
      );
    }
    if (payload.optionId != null && typeof payload.optionId !== "string") {
      return failure(
        "VALIDATION_ERROR",
        "optionId must be a string when provided",
        ctx.requestId,
        422,
      );
    }
    if (payload.notes != null && typeof payload.notes !== "string") {
      return failure(
        "VALIDATION_ERROR",
        "notes must be a string when provided",
        ctx.requestId,
        422,
      );
    }

    try {
      return success(
        await createPersistentOperationalDecision({
          organizationId: scopedOrganizationId(ctx),
          scope: buildPersistentSiteScope(ctx, ctx.query.get("site_id")),
          alertId: payload.alertId,
          optionId:
            typeof payload.optionId === "string" ? payload.optionId : null,
          notes: typeof payload.notes === "string" ? payload.notes : null,
          decidedBy: ctx.user?.userId ?? "",
          decidedByRole: ctx.user?.role ?? null,
        }),
        ctx.requestId,
        undefined,
        201,
      );
    } catch (error) {
      return operationalFailureResponse(
        error,
        ctx.requestId,
        "OPERATIONAL_DECISIONS_CREATE_FAILED",
        "Unable to create operational decision",
      );
    }
  }),
  route("GET", "/api/v1/operational-decisions", async (ctx) => {
    if (!shouldUsePersistentLiveData(ctx)) {
      return liveFallbackFailure(ctx, "Operational decisions history");
    }

    try {
      const { page, pageSize } = pageQuery(ctx);
      const result = await listPersistentOperationalDecisions({
        organizationId: scopedOrganizationId(ctx),
        scope: buildPersistentSiteScope(ctx, ctx.query.get("site_id")),
        dateFrom: normalizeOptionalText(ctx.query.get("date_from")),
        dateTo: normalizeOptionalText(ctx.query.get("date_to")),
        isOverride: parseOptionalBooleanQuery(
          ctx.query.get("is_override"),
          "is_override",
        ),
        horizon: normalizeOptionalText(ctx.query.get("horizon")),
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
        "OPERATIONAL_DECISIONS_LIST_FAILED",
        "Unable to load operational decisions",
      );
    }
  }),
  route("GET", "/api/v1/operational-decisions/override-stats", async (ctx) => {
    if (!shouldUsePersistentLiveData(ctx)) {
      return liveFallbackFailure(ctx, "Operational decision override stats");
    }

    try {
      return success(
        await getPersistentOperationalDecisionOverrideStats({
          organizationId: scopedOrganizationId(ctx),
          scope: buildPersistentSiteScope(ctx, ctx.query.get("site_id")),
        }),
        ctx.requestId,
      );
    } catch (error) {
      return operationalFailureResponse(
        error,
        ctx.requestId,
        "OPERATIONAL_DECISIONS_OVERRIDE_STATS_FAILED",
        "Unable to load override statistics",
      );
    }
  }),

  route("GET", "/api/v1/cost-parameters", (ctx) =>
    liveFallbackFailure(ctx, "Cost parameters"),
  ),
  route("GET", "/api/v1/cost-parameters/effective", (ctx) => {
    return liveFallbackFailure(ctx, "Effective cost parameters");
  }),
  route("GET", "/api/v1/cost-parameters/history", (ctx) =>
    liveFallbackFailure(ctx, "Cost parameter history"),
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

    return noDemoFallbackResponse(
      ctx.requestId,
      "Proof packs",
      scopedOrganizationId(ctx),
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

    return noDemoFallbackResponse(
      ctx.requestId,
      "Proof summary",
      scopedOrganizationId(ctx),
    );
  }),
  route("POST", "/api/v1/proof/generate", (ctx) =>
    (() => {
      return noDemoFallbackResponse(
        ctx.requestId,
        "Proof generation",
        scopedOrganizationId(ctx),
      );
    })(),
  ),
  route("GET", "/api/v1/proof/pdf", (ctx) =>
    (() => {
      return liveFallbackFailure(ctx, "Proof PDF download");
    })(),
  ),

  route("GET", "/api/v1/users/me/preferences", (ctx) =>
    liveFallbackFailure(ctx, "User preferences"),
  ),
  route("PATCH", "/api/v1/users/me/preferences", (ctx) =>
    liveFallbackFailure(ctx, "User preferences update"),
  ),

  route("POST", "/api/v1/product-events/batch", (ctx) =>
    liveFallbackFailure(ctx, "Product events batch ingestion"),
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
    (ctx) => liveFallbackFailure(ctx, "Conversations"),
    { rateLimit: messagingReadRateLimit },
  ),
  route(
    "POST",
    "/api/v1/conversations",
    (ctx) => {
      return liveFallbackFailure(ctx, "Conversation creation");
    },
    { rateLimit: messagingWriteRateLimit },
  ),
  route(
    "GET",
    "/api/v1/conversations/:convId/messages",
    (ctx) => {
      return liveFallbackFailure(ctx, "Conversation messages");
    },
    { rateLimit: messagingReadRateLimit },
  ),
  route(
    "POST",
    "/api/v1/conversations/:convId/messages",
    (ctx) => {
      return liveFallbackFailure(ctx, "Conversation message creation");
    },
    { rateLimit: messagingWriteRateLimit },
  ),
  route(
    "GET",
    "/api/v1/conversations/unread-count",
    (ctx) => liveFallbackFailure(ctx, "Conversation unread count"),
    { rateLimit: messagingReadRateLimit },
  ),

  route(
    "GET",
    "/api/v1/support-thread",
    (ctx) => liveFallbackFailure(ctx, "Support thread"),
    { rateLimit: messagingReadRateLimit },
  ),
  route(
    "POST",
    "/api/v1/support-thread/messages",
    (ctx) => {
      return liveFallbackFailure(ctx, "Support thread message creation");
    },
    { rateLimit: messagingWriteRateLimit },
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
        return success(
          created,
          ctx.requestId,
          "Integration connection created",
          201,
        );
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
        return success(
          updated,
          ctx.requestId,
          "Integration connection updated",
        );
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
        return success(
          started,
          ctx.requestId,
          "Integration authorization started",
        );
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
        return success(
          completed,
          ctx.requestId,
          "Integration authorization completed",
        );
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
        return success(
          issued,
          ctx.requestId,
          "Integration ingest credential issued",
          201,
        );
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
        return success(
          revoked,
          ctx.requestId,
          "Integration ingest credential revoked",
        );
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

      return noDemoFallbackResponse(ctx.requestId, "Admin platform monitoring");
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

      return noDemoFallbackResponse(ctx.requestId, "Admin monitoring trends");
    },
    adminMonitoringRead,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/errors",
    async (ctx) => {
      if (hasPersistentDatabase()) {
        try {
          return success(await getPersistentMonitoringErrors(), ctx.requestId);
        } catch (error) {
          return operationalFailureResponse(
            error,
            ctx.requestId,
            "ADMIN_MONITORING_ERRORS_FAILED",
            "Unable to load monitoring errors",
          );
        }
      }

      return noDemoFallbackResponse(ctx.requestId, "Admin monitoring errors");
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

      return noDemoFallbackResponse(
        ctx.requestId,
        "Admin organization monitoring",
        ctx.params.orgId,
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

      return noDemoFallbackResponse(
        ctx.requestId,
        "Admin organization mirror",
        ctx.params.orgId,
      );
    },
    adminMonitoringRead,
  ),

  route(
    "GET",
    "/api/v1/admin/organizations",
    (ctx) => liveFallbackFailure(ctx, "Admin organizations list"),
    adminOrgRead,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations",
    (ctx) => liveFallbackFailure(ctx, "Admin organization creation"),
    adminOrgWrite,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId",
    (ctx) =>
      noDemoFallbackResponse(
        ctx.requestId,
        "Admin organization details",
        ctx.params.orgId ?? undefined,
      ),
    adminOrgRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/overview",
    (ctx) =>
      noDemoFallbackResponse(
        ctx.requestId,
        "Admin organization overview",
        ctx.params.orgId ?? undefined,
      ),
    adminOrgRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/hierarchy",
    (ctx) =>
      noDemoFallbackResponse(
        ctx.requestId,
        "Admin organization hierarchy",
        ctx.params.orgId ?? undefined,
      ),
    adminOrgRead,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/suspend",
    (ctx) =>
      noDemoFallbackResponse(
        ctx.requestId,
        "Admin organization suspension",
        ctx.params.orgId ?? undefined,
      ),
    adminOrgWrite,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/reactivate",
    (ctx) =>
      noDemoFallbackResponse(
        ctx.requestId,
        "Admin organization reactivation",
        ctx.params.orgId ?? undefined,
      ),
    adminOrgWrite,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/churn",
    (ctx) =>
      noDemoFallbackResponse(
        ctx.requestId,
        "Admin organization churn",
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
      return noDemoFallbackResponse(
        ctx.requestId,
        "Admin organization users",
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
      return noDemoFallbackResponse(
        ctx.requestId,
        "Admin organization user details",
        orgId,
      );
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
      const service = getAdminBackofficeService();
      if (!payload) {
        if (service.hasDatabase()) {
          try {
            await service.recordPrivilegedUserAttempt({
              actorUserId: ctx.user?.userId ?? "",
              targetOrgId: orgId,
              resourceId: userId,
              requestId: ctx.requestId,
              clientIp: ctx.clientIp,
              userAgent: ctx.userAgent,
              permissionUsed: "admin:users:write",
              routeTemplate:
                "/api/v1/admin/organizations/:orgId/users/:userId/role",
              operation: "change_role",
              outcome: "rejected",
              metadata: {
                targetUserId: userId,
                failureCode: "VALIDATION_ERROR",
                failureStatusCode: 422,
                reason: "body_not_object",
              },
            });
          } catch {}
        }
        return failure(
          "VALIDATION_ERROR",
          "Body must be a JSON object",
          ctx.requestId,
          422,
        );
      }

      const role = payload.role;
      if (!isUserRole(role) || role === "super_admin") {
        if (service.hasDatabase()) {
          try {
            await service.recordPrivilegedUserAttempt({
              actorUserId: ctx.user?.userId ?? "",
              targetOrgId: orgId,
              resourceId: userId,
              requestId: ctx.requestId,
              clientIp: ctx.clientIp,
              userAgent: ctx.userAgent,
              permissionUsed: "admin:users:write",
              routeTemplate:
                "/api/v1/admin/organizations/:orgId/users/:userId/role",
              operation: "change_role",
              outcome: "rejected",
              metadata: {
                targetUserId: userId,
                targetRole:
                  typeof payload.role === "string" ? payload.role : null,
                failureCode: "VALIDATION_ERROR",
                failureStatusCode: 422,
                reason: "invalid_role",
              },
            });
          } catch {}
        }
        return failure(
          "VALIDATION_ERROR",
          "Role must be one of: org_admin, hr_manager, manager, employee, viewer",
          ctx.requestId,
          422,
        );
      }

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
              permissionUsed: "admin:users:write",
              routeTemplate:
                "/api/v1/admin/organizations/:orgId/users/:userId/role",
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
      return noDemoFallbackResponse(
        ctx.requestId,
        "Admin organization user role change",
        orgId,
      );
    },
    adminUsersWrite,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/users/invite",
    async (ctx) => {
      const orgId = ctx.params.orgId ?? "";
      const payload = parseJsonObject(ctx.body);
      const service = getAdminBackofficeService();
      if (!payload) {
        if (service.hasDatabase()) {
          try {
            await service.recordPrivilegedUserAttempt({
              actorUserId: ctx.user?.userId ?? "",
              targetOrgId: orgId,
              requestId: ctx.requestId,
              clientIp: ctx.clientIp,
              userAgent: ctx.userAgent,
              permissionUsed: "admin:users:write",
              routeTemplate: "/api/v1/admin/organizations/:orgId/users/invite",
              operation: "invite_user",
              outcome: "rejected",
              metadata: {
                failureCode: "VALIDATION_ERROR",
                failureStatusCode: 422,
                reason: "body_not_object",
              },
            });
          } catch {}
        }
        return failure(
          "VALIDATION_ERROR",
          "Body must be a JSON object",
          ctx.requestId,
          422,
        );
      }

      const email = normalizeEmail(payload.email);
      if (!email) {
        if (service.hasDatabase()) {
          try {
            await service.recordPrivilegedUserAttempt({
              actorUserId: ctx.user?.userId ?? "",
              targetOrgId: orgId,
              requestId: ctx.requestId,
              clientIp: ctx.clientIp,
              userAgent: ctx.userAgent,
              permissionUsed: "admin:users:write",
              routeTemplate: "/api/v1/admin/organizations/:orgId/users/invite",
              operation: "invite_user",
              outcome: "rejected",
              metadata: {
                email:
                  typeof payload.email === "string"
                    ? payload.email.trim()
                    : null,
                failureCode: "VALIDATION_ERROR",
                failureStatusCode: 422,
                reason: "invalid_email",
              },
            });
          } catch {}
        }
        return failure(
          "VALIDATION_ERROR",
          "A valid email is required",
          ctx.requestId,
          422,
        );
      }

      const role = normalizeAdminRole(payload.role);
      if (!role) {
        if (service.hasDatabase()) {
          try {
            await service.recordPrivilegedUserAttempt({
              actorUserId: ctx.user?.userId ?? "",
              targetOrgId: orgId,
              requestId: ctx.requestId,
              clientIp: ctx.clientIp,
              userAgent: ctx.userAgent,
              permissionUsed: "admin:users:write",
              routeTemplate: "/api/v1/admin/organizations/:orgId/users/invite",
              operation: "invite_user",
              outcome: "rejected",
              metadata: {
                email,
                requestedRole:
                  typeof payload.role === "string" ? payload.role : null,
                failureCode: "VALIDATION_ERROR",
                failureStatusCode: 422,
                reason: "invalid_role",
              },
            });
          } catch {}
        }
        return failure(
          "VALIDATION_ERROR",
          "Role must be one of: org_admin, hr_manager, manager, employee, viewer",
          ctx.requestId,
          422,
        );
      }

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
              permissionUsed: "admin:users:write",
              routeTemplate: "/api/v1/admin/organizations/:orgId/users/invite",
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
      return noDemoFallbackResponse(
        ctx.requestId,
        "Admin organization user invitation",
        orgId,
      );
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
      return noDemoFallbackResponse(
        ctx.requestId,
        "Admin organization user deactivation",
        orgId,
      );
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
      return noDemoFallbackResponse(
        ctx.requestId,
        "Admin organization user reactivation",
        orgId,
      );
    },
    adminUsersWrite,
  ),

  route(
    "GET",
    "/api/v1/admin/billing/organizations/:orgId",
    async (ctx) => {
      const service = getAdminBackofficeService();
      if (!service.hasDatabase()) {
        return noDemoFallbackResponse(
          ctx.requestId,
          "Admin billing info",
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
        return noDemoFallbackResponse(
          ctx.requestId,
          "Admin billing plan change",
          ctx.params.orgId ?? undefined,
        );
      }

      try {
        return success(
          await service.changePlan({
            organizationId: ctx.params.orgId ?? "",
            newPlan: payload.plan,
            reason: typeof payload.reason === "string" ? payload.reason : "",
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
        return noDemoFallbackResponse(
          ctx.requestId,
          "Admin billing history",
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
    (ctx) => liveFallbackFailure(ctx, "Admin audit log"),
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

      return noDemoFallbackResponse(ctx.requestId, "Admin onboarding list");
    },
    adminOnboardingRead,
  ),
  route(
    "POST",
    "/api/v1/admin/onboarding",
    (ctx) => {
      return noDemoFallbackResponse(ctx.requestId, "Admin onboarding creation");
    },
    adminOnboardingWrite,
  ),
  route(
    "PATCH",
    "/api/v1/admin/onboarding/:onboardingId/step/:step",
    (ctx) => {
      return noDemoFallbackResponse(
        ctx.requestId,
        "Admin onboarding step update",
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

      return noDemoFallbackResponse(
        ctx.requestId,
        "Admin alerts summary monitoring",
      );
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

      return noDemoFallbackResponse(
        ctx.requestId,
        "Admin alerts by organization monitoring",
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

      return noDemoFallbackResponse(ctx.requestId, "Admin scenario monitoring");
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

      return noDemoFallbackResponse(
        ctx.requestId,
        "Admin decision monitoring summary",
      );
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

      return noDemoFallbackResponse(
        ctx.requestId,
        "Admin decision override monitoring",
      );
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

      return noDemoFallbackResponse(
        ctx.requestId,
        "Admin decision adoption monitoring",
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

      return noDemoFallbackResponse(
        ctx.requestId,
        "Admin proof pack monitoring summary",
      );
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

      return noDemoFallbackResponse(
        ctx.requestId,
        "Admin canonical coverage monitoring",
      );
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

      return noDemoFallbackResponse(
        ctx.requestId,
        "Admin missing cost parameters monitoring",
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

      return noDemoFallbackResponse(
        ctx.requestId,
        "Admin ROI monitoring by organization",
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
        return noDemoFallbackResponse(
          ctx.requestId,
          "Admin organization canonical records",
          orgId,
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
        return noDemoFallbackResponse(
          ctx.requestId,
          "Admin organization canonical quality",
          orgId,
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
                requestedSiteId: normalizeOptionalText(
                  ctx.query.get("site_id"),
                ),
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
          error instanceof Error
            ? error.message
            : "Unable to resolve decision config",
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
      if (
        typeof effectiveAtRaw !== "string" ||
        effectiveAtRaw.trim().length === 0
      ) {
        return failure(
          "invalid_effective_at",
          "effectiveAt is required and must be an ISO datetime string.",
          ctx.requestId,
          400,
        );
      }
      if (
        !payloadRaw ||
        typeof payloadRaw !== "object" ||
        Array.isArray(payloadRaw)
      ) {
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
          error instanceof Error
            ? error.message
            : "Unable to create decision config version",
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
          error instanceof Error
            ? error.message
            : "Unable to cancel decision config version",
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
        return success(
          rolledBack,
          ctx.requestId,
          "Rollback version activated",
          201,
        );
      } catch (error) {
        return failure(
          "decision_config_rollback_failed",
          error instanceof Error
            ? error.message
            : "Unable to rollback decision config",
          ctx.requestId,
          400,
        );
      }
    },
    adminOrgWrite,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/approval-inbox",
    async (ctx) => {
      try {
        return success(
          await listPersistentApprovalInbox({
            organizationId: ctx.params.orgId ?? "",
          }),
          ctx.requestId,
        );
      } catch (error) {
        return operationalFailureResponse(
          error,
          ctx.requestId,
          "APPROVAL_INBOX_FAILED",
          "Unable to load admin approval inbox",
        );
      }
    },
    adminOrgRead,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/approvals/:approvalId/decision",
    async (ctx) => {
      const organizationId = ctx.params.orgId ?? "";
      const approvalId = ctx.params.approvalId ?? "";

      if (!isUuidString(approvalId)) {
        return failure(
          "INVALID_APPROVAL_ID",
          "Approval id must be a UUID.",
          ctx.requestId,
          400,
          { approvalId },
        );
      }

      const parsed = approvalDecisionSchema.safeParse(ctx.body);
      if (!parsed.success) {
        return failure(
          "INVALID_APPROVAL_DECISION_BODY",
          parsed.error.issues[0]?.message ??
            "Approval decision body is invalid.",
          ctx.requestId,
          400,
        );
      }

      const actorUserId = ctx.user?.userId ?? "";
      const actorRole = ctx.user?.role?.trim() ?? "";
      if (actorUserId.length === 0 || actorRole.length === 0) {
        return failure(
          "APPROVAL_ACTOR_CONTEXT_REQUIRED",
          "Authenticated admin actor context is required.",
          ctx.requestId,
          403,
        );
      }

      try {
        return success(
          await decidePersistentApproval({
            organizationId,
            approvalId,
            actorUserId,
            actorRole,
            request: parsed.data,
          }),
          ctx.requestId,
          "Approval decision persisted",
        );
      } catch (error) {
        return operationalFailureResponse(
          error,
          ctx.requestId,
          "APPROVAL_DECISION_FAILED",
          "Unable to persist approval decision",
        );
      }
    },
    { ...adminOrgWrite, rateLimit: adminUsersWriteRateLimit },
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/action-dispatches/:actionId",
    async (ctx) => {
      const orgId = ctx.params.orgId ?? "";
      const actionId = ctx.params.actionId ?? "";

      if (!isUuidString(actionId)) {
        return failure(
          "INVALID_ACTION_ID",
          "Action id must be a UUID.",
          ctx.requestId,
          400,
          { actionId },
        );
      }

      try {
        return success(
          await getPersistentActionDispatchDetail({
            organizationId: orgId,
            actionId,
          }),
          ctx.requestId,
        );
      } catch (error) {
        return operationalFailureResponse(
          error,
          ctx.requestId,
          "ACTION_DISPATCH_DETAIL_FAILED",
          "Unable to load admin action dispatch detail",
        );
      }
    },
    adminOrgRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/ledgers/:ledgerId",
    async (ctx) => {
      const orgId = ctx.params.orgId ?? "";
      const ledgerId = ctx.params.ledgerId ?? "";
      const revision = normalizeOptionalText(ctx.query.get("revision"));

      if (!isUuidString(ledgerId)) {
        return failure(
          "INVALID_LEDGER_ID",
          "Ledger id must be a UUID.",
          ctx.requestId,
          400,
          { ledgerId },
        );
      }

      if (revision != null && !/^[1-9]\d*$/.test(revision)) {
        return failure(
          "INVALID_LEDGER_REVISION",
          "Ledger revision must be a positive integer.",
          ctx.requestId,
          400,
          { revision },
        );
      }

      try {
        return success(
          await getPersistentLedgerDetail({
            organizationId: orgId,
            request: {
              ledgerId,
              revision:
                revision == null ? undefined : Number.parseInt(revision, 10),
            },
          }),
          ctx.requestId,
        );
      } catch (error) {
        return operationalFailureResponse(
          error,
          ctx.requestId,
          "LEDGER_DETAIL_FAILED",
          "Unable to load admin ledger detail",
        );
      }
    },
    adminOrgRead,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/alerts/:alertId/scenarios/recompute",
    async (ctx) => {
      const organizationId = ctx.params.orgId ?? ORGANIZATION_ID;
      const alertId = ctx.params.alertId ?? "alt-001";
      const alert = await findAdminCoverageAlert(organizationId, alertId);
      if (alert == null) {
        return failure(
          "NOT_FOUND",
          "Coverage alert not found",
          ctx.requestId,
          404,
        );
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
          paretoFrontier: scenario.options.filter(
            (option) => option.isParetoOptimal,
          ),
          recommendedOptionId: scenario.recommendedOptionId,
          recommended:
            scenario.options.find(
              (option) => option.id === scenario.recommendedOptionId,
            ) ?? null,
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
        return noDemoFallbackResponse(
          ctx.requestId,
          "Admin organization alerts",
          orgId,
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
                requestedSiteId: normalizeOptionalText(
                  ctx.query.get("site_id"),
                ),
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
      noDemoFallbackResponse(
        ctx.requestId,
        "Admin organization scenarios",
        ctx.params.orgId ?? undefined,
      ),
    adminOrgRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/ml-monitoring/summary",
    (ctx) =>
      noDemoFallbackResponse(
        ctx.requestId,
        "Admin organization ML monitoring summary",
        ctx.params.orgId ?? undefined,
      ),
    adminOrgRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/ml-monitoring/drift",
    (ctx) =>
      noDemoFallbackResponse(
        ctx.requestId,
        "Admin organization ML drift",
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
                  requestedSiteId: normalizeOptionalText(
                    ctx.query.get("site_id"),
                  ),
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

      return noDemoFallbackResponse(
        ctx.requestId,
        "Admin organization proof packs",
        orgId,
      );
    },
    adminOrgRead,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/proof-packs/:proofPackId/share-link",
    (ctx) =>
      noDemoFallbackResponse(
        ctx.requestId,
        "Admin proof pack share link",
        ctx.params.orgId ?? undefined,
      ),
    adminOrgWrite,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/ingestion-log",
    (ctx) =>
      noDemoFallbackResponse(
        ctx.requestId,
        "Admin ingestion log",
        ctx.params.orgId ?? undefined,
      ),
    adminOrgRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/medallion-quality-report",
    (ctx) =>
      noDemoFallbackResponse(
        ctx.requestId,
        "Admin medallion quality report",
        ctx.params.orgId ?? undefined,
      ),
    adminOrgRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/datasets",
    (ctx) =>
      noDemoFallbackResponse(
        ctx.requestId,
        "Admin datasets",
        ctx.params.orgId ?? undefined,
      ),
    adminOrgRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/datasets/:datasetId/data",
    (ctx) =>
      noDemoFallbackResponse(
        ctx.requestId,
        "Admin dataset rows",
        ctx.params.orgId ?? undefined,
      ),
    adminOrgRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/datasets/:datasetId/features",
    (ctx) =>
      noDemoFallbackResponse(
        ctx.requestId,
        "Admin dataset features",
        ctx.params.orgId ?? undefined,
      ),
    adminOrgRead,
  ),

  route(
    "GET",
    "/api/v1/admin/conversations",
    (ctx) => liveFallbackFailure(ctx, "Admin conversations"),
    adminMessagesRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/conversations",
    (ctx) =>
      noDemoFallbackResponse(
        ctx.requestId,
        "Admin organization conversations",
        ctx.params.orgId ?? undefined,
      ),
    adminMessagesRead,
  ),
  route(
    "GET",
    "/api/v1/admin/conversations/:convId/messages",
    (ctx) => liveFallbackFailure(ctx, "Admin conversation messages"),
    adminMessagesRead,
  ),
  route(
    "GET",
    "/api/v1/admin/conversations/unread-count",
    (ctx) => liveFallbackFailure(ctx, "Admin conversation unread count"),
    adminMessagesRead,
  ),
  route(
    "GET",
    "/api/v1/admin/conversations/:convId",
    (ctx) => liveFallbackFailure(ctx, "Admin conversation details"),
    adminMessagesRead,
  ),
  route(
    "POST",
    "/api/v1/admin/conversations/:convId/messages",
    (ctx) => liveFallbackFailure(ctx, "Admin conversation message creation"),
    adminMessagesWrite,
  ),
  route(
    "PATCH",
    "/api/v1/admin/conversations/:convId",
    (ctx) => liveFallbackFailure(ctx, "Admin conversation update"),
    adminMessagesWrite,
  ),
  route(
    "GET",
    "/api/v1/admin/contact-requests",
    (ctx) => liveFallbackFailure(ctx, "Admin contact requests"),
    adminSupportRead,
  ),
  route(
    "PATCH",
    "/api/v1/admin/contact-requests/:requestId/status",
    (ctx) => liveFallbackFailure(ctx, "Admin contact request status update"),
    adminSupportWrite,
  ),
];
