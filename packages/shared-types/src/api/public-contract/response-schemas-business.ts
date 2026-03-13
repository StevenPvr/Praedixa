import type { PublicApiResponseTypeName } from "./types.js";
import {
  arrayOf,
  booleanSchema,
  integerSchema,
  mapOf,
  nullable,
  numberSchema,
  objectSchema,
  stringSchema,
  type PublicJsonSchema,
} from "./schema-helpers.js";
import {
  canonicalRecordSchema,
  coverageAlertSchema,
  datasetDetailResponseSchema,
  ingestionHistoryEntrySchema,
  isoDateSchema,
  isoDateTimeSchema,
  operationalDecisionSchema,
  proofPackSchema,
  uuidSchema,
} from "./response-schema-fragments.js";

export const PUBLIC_API_BUSINESS_RESPONSE_SCHEMAS = {
  OrganizationProfile: objectSchema(
    {
      id: stringSchema(),
      name: stringSchema(),
      status: stringSchema(),
      plan: stringSchema(),
    },
    ["id"],
  ),
  DepartmentSummary: objectSchema(
    { id: stringSchema(), name: stringSchema() },
    ["id", "name"],
  ),
  SiteSummary: objectSchema({ id: stringSchema(), name: stringSchema() }, [
    "id",
    "name",
  ]),
  ForecastRunSummary: objectSchema(
    {
      id: uuidSchema,
      organizationId: uuidSchema,
      modelType: stringSchema(),
      modelVersion: stringSchema(),
      horizonDays: integerSchema({ minimum: 1 }),
      status: stringSchema({
        enum: ["pending", "running", "completed", "failed"],
      }),
      accuracyScore: nullable(numberSchema()),
      startedAt: nullable(isoDateTimeSchema),
      completedAt: nullable(isoDateTimeSchema),
      createdAt: isoDateTimeSchema,
    },
    ["id", "organizationId", "modelType", "horizonDays", "status", "createdAt"],
  ),
  ForecastRequestAccepted: objectSchema(
    { id: stringSchema(), status: stringSchema() },
    ["id", "status"],
  ),
  ForecastDetailSummary: objectSchema(
    {
      forecastId: stringSchema(),
      status: stringSchema(),
      drivers: arrayOf(stringSchema()),
    },
    ["forecastId", "status", "drivers"],
  ),
  ForecastDailyDetail: objectSchema(
    { forecastId: stringSchema(), date: isoDateSchema },
    ["forecastId", "date"],
  ),
  ForecastWhatIfResult: objectSchema(
    {
      scenario: stringSchema(),
      deltaCostEur: numberSchema(),
      deltaServicePct: numberSchema(),
    },
    ["scenario", "deltaCostEur", "deltaServicePct"],
  ),
  DecisionRecord: objectSchema(
    {
      id: stringSchema(),
      status: stringSchema(),
      title: stringSchema(),
    },
    ["id"],
  ),
  DecisionReviewResult: objectSchema(
    { id: stringSchema(), status: stringSchema() },
    ["id", "status"],
  ),
  DecisionOutcomeResult: objectSchema({ id: stringSchema() }, ["id"]),
  ArbitrageOptionsView: objectSchema(
    {
      alertId: stringSchema(),
      options: arrayOf(
        objectSchema(
          {
            id: stringSchema(),
            label: stringSchema(),
          },
          ["id", "label"],
        ),
      ),
    },
    ["alertId", "options"],
  ),
  ArbitrageValidationResult: objectSchema({ alertId: stringSchema() }, [
    "alertId",
  ]),
  DashboardAlertRecord: objectSchema(
    {
      id: uuidSchema,
      type: stringSchema({
        enum: ["risk", "decision", "forecast", "absence", "system"],
      }),
      severity: stringSchema({
        enum: ["info", "warning", "error", "critical"],
      }),
      title: stringSchema(),
      message: stringSchema(),
      relatedEntityType: stringSchema({
        enum: ["absence", "decision", "forecast", "employee", "department"],
      }),
      relatedEntityId: stringSchema(),
      actionUrl: stringSchema(),
      actionLabel: stringSchema(),
      createdAt: isoDateTimeSchema,
      dismissedAt: isoDateTimeSchema,
      expiresAt: isoDateTimeSchema,
    },
    ["id", "type", "severity", "title", "message", "createdAt"],
  ),
  AnalyticsCostsSummary: objectSchema(
    {
      period: objectSchema({
        startDate: nullable(isoDateSchema),
        endDate: nullable(isoDateSchema),
      }),
      totals: objectSchema(
        {
          overtimeEur: numberSchema(),
          interimEur: numberSchema(),
          avoidedEur: numberSchema(),
        },
        ["overtimeEur", "interimEur", "avoidedEur"],
      ),
    },
    ["period", "totals"],
  ),
  QueuedExportResult: objectSchema(
    { exportId: stringSchema(), status: stringSchema() },
    ["exportId", "status"],
  ),
  DatasetDataPreviewResponse: objectSchema(
    {
      columns: arrayOf(stringSchema()),
      rows: arrayOf(mapOf({})),
      maskedColumns: arrayOf(stringSchema()),
      total: integerSchema({ minimum: 0 }),
    },
    ["columns", "rows", "maskedColumns", "total"],
  ),
  DatasetDetailResponse: datasetDetailResponseSchema(),
  GoldSchemaColumn: objectSchema(
    {
      name: stringSchema(),
      dtype: stringSchema({ enum: ["string", "date", "number", "boolean"] }),
      nullable: booleanSchema(),
      sample: { anyOf: [stringSchema(), numberSchema(), booleanSchema()] },
    },
    ["name", "dtype", "nullable", "sample"],
  ),
  IngestionHistoryResponse: objectSchema(
    {
      entries: arrayOf(ingestionHistoryEntrySchema()),
      total: integerSchema({ minimum: 0 }),
    },
    ["entries", "total"],
  ),
  CoverageAlert: coverageAlertSchema(),
  OperationalDecision: operationalDecisionSchema(),
  OverrideStatistics: objectSchema(
    {
      totalDecisions: integerSchema({ minimum: 0 }),
      overrideCount: integerSchema({ minimum: 0 }),
      overridePct: numberSchema(),
      topOverrideReasons: arrayOf(
        objectSchema(
          {
            reason: stringSchema(),
            count: integerSchema({ minimum: 0 }),
          },
          ["reason", "count"],
        ),
      ),
      avgCostDelta: numberSchema(),
    },
    [
      "totalDecisions",
      "overrideCount",
      "overridePct",
      "topOverrideReasons",
      "avgCostDelta",
    ],
  ),
  CostParameterView: objectSchema({ siteId: nullable(stringSchema()) }),
  CostParameterHistoryEntry: objectSchema(
    {
      id: stringSchema(),
      siteId: nullable(stringSchema()),
      version: integerSchema({ minimum: 0 }),
    },
    ["id", "version"],
  ),
  ProofPack: proofPackSchema(),
  ProofPackSummary: objectSchema(
    {
      totalGainNetEur: numberSchema(),
      avgAdoptionPct: nullable(numberSchema()),
      totalAlertesEmises: integerSchema({ minimum: 0 }),
      totalAlertesTraitees: integerSchema({ minimum: 0 }),
      records: arrayOf(proofPackSchema()),
    },
    [
      "totalGainNetEur",
      "avgAdoptionPct",
      "totalAlertesEmises",
      "totalAlertesTraitees",
      "records",
    ],
  ),
  ProofPdfLink: objectSchema({ url: stringSchema() }, ["url"]),
  CanonicalRecord: canonicalRecordSchema(),
} as const satisfies Partial<
  Record<PublicApiResponseTypeName, PublicJsonSchema>
>;
