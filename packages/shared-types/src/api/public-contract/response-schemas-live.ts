import type { PublicApiResponseTypeName } from "./types.js";
import {
  arrayOf,
  booleanSchema,
  integerSchema,
  nullable,
  numberSchema,
  objectSchema,
  stringSchema,
  type PublicJsonSchema,
} from "./schema-helpers.js";
import {
  canonicalQualityDashboardSchema,
  canonicalRecordSchema,
  coverageAlertSchema,
  dashboardSummarySchema,
  decisionConfigPayloadSchema,
  decisionHorizonSchema,
  decisionWorkspaceSchema,
  isoDateSchema,
  isoDateTimeSchema,
  proofPackSchema,
  scenarioOptionSchema,
  uuidSchema,
} from "./response-schema-fragments.js";

export const PUBLIC_API_LIVE_RESPONSE_SCHEMAS = {
  PublicHealthPayload: objectSchema(
    {
      status: stringSchema({ const: "healthy" }),
      timestamp: isoDateTimeSchema,
      checks: arrayOf(
        objectSchema(
          {
            name: stringSchema(),
            status: stringSchema({ const: "pass" }),
          },
          ["name", "status"],
        ),
      ),
    },
    ["status", "timestamp", "checks"],
  ),
  ContactRequestReceipt: objectSchema(
    {
      id: stringSchema(),
      status: stringSchema(),
      receivedAt: isoDateTimeSchema,
      requestType: stringSchema(),
      companyName: stringSchema(),
      email: stringSchema({ format: "email" }),
    },
    ["id", "status", "receivedAt", "requestType", "companyName", "email"],
  ),
  DashboardSummary: dashboardSummarySchema(),
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
  LatestDailyForecastRow: objectSchema(
    {
      id: uuidSchema,
      organizationId: uuidSchema,
      siteId: nullable(stringSchema()),
      forecastDate: isoDateSchema,
      dimension: stringSchema({ enum: ["human", "merchandise"] }),
      predictedDemand: numberSchema(),
      predictedCapacity: numberSchema(),
      capacityPlannedCurrent: numberSchema(),
      capacityPlannedPredicted: numberSchema(),
      capacityOptimalPredicted: numberSchema(),
      gap: numberSchema(),
      riskScore: numberSchema(),
      confidenceLower: numberSchema(),
      confidenceUpper: numberSchema(),
    },
    [
      "id",
      "organizationId",
      "forecastDate",
      "dimension",
      "predictedDemand",
      "predictedCapacity",
      "capacityPlannedCurrent",
      "capacityPlannedPredicted",
      "capacityOptimalPredicted",
      "gap",
      "riskScore",
      "confidenceLower",
      "confidenceUpper",
    ],
  ),
  ResolvedDecisionConfigView: objectSchema(
    {
      organizationId: uuidSchema,
      siteId: nullable(stringSchema()),
      versionId: uuidSchema,
      effectiveAt: isoDateTimeSchema,
      resolvedAt: isoDateTimeSchema,
      payload: decisionConfigPayloadSchema(),
      nextVersion: nullable(
        objectSchema(
          {
            id: uuidSchema,
            effectiveAt: isoDateTimeSchema,
          },
          ["id", "effectiveAt"],
        ),
      ),
      selectedHorizon: nullable(decisionHorizonSchema()),
    },
    [
      "organizationId",
      "versionId",
      "effectiveAt",
      "resolvedAt",
      "payload",
      "nextVersion",
    ],
  ),
  GoldSchemaView: objectSchema(
    {
      revision: stringSchema(),
      loadedAt: isoDateTimeSchema,
      totalRows: integerSchema({ minimum: 0 }),
      totalColumns: integerSchema({ minimum: 0 }),
      columns: arrayOf(
        objectSchema(
          {
            name: stringSchema(),
            dtype: stringSchema({
              enum: ["string", "date", "number", "boolean"],
            }),
            nullable: booleanSchema(),
            sample: {
              anyOf: [stringSchema(), numberSchema(), booleanSchema()],
            },
          },
          ["name", "dtype", "nullable", "sample"],
        ),
      ),
    },
    ["revision", "loadedAt", "totalRows", "totalColumns", "columns"],
  ),
  CanonicalRecord: canonicalRecordSchema(),
  GoldCoverageView: objectSchema(
    {
      totalColumns: integerSchema({ minimum: 0 }),
      explorerExposedColumns: integerSchema({ minimum: 0 }),
      businessMappedColumns: integerSchema({ minimum: 0 }),
      totalRows: integerSchema({ minimum: 0 }),
      columns: arrayOf(
        objectSchema(
          {
            name: stringSchema(),
            exposedInExplorer: booleanSchema(),
            usedInBusinessViews: booleanSchema(),
            mappedViews: arrayOf(stringSchema()),
          },
          ["name", "exposedInExplorer", "usedInBusinessViews", "mappedViews"],
        ),
      ),
    },
    [
      "totalColumns",
      "explorerExposedColumns",
      "businessMappedColumns",
      "totalRows",
      "columns",
    ],
  ),
  GoldProvenanceView: objectSchema(
    {
      revision: stringSchema(),
      loadedAt: isoDateTimeSchema,
      sourcePath: stringSchema(),
      scopedRows: integerSchema({ minimum: 0 }),
      totalRows: integerSchema({ minimum: 0 }),
      totalColumns: integerSchema({ minimum: 0 }),
      policy: objectSchema(
        {
          allowedMockDomains: arrayOf(stringSchema()),
          forecastMockColumns: arrayOf(stringSchema()),
          nonForecastMockColumns: arrayOf(stringSchema()),
          strictDataPolicyOk: booleanSchema(),
        },
        [
          "allowedMockDomains",
          "forecastMockColumns",
          "nonForecastMockColumns",
          "strictDataPolicyOk",
        ],
      ),
      qualityReports: objectSchema(
        {
          silverQualityAvailable: booleanSchema(),
          goldFeatureQualityAvailable: booleanSchema(),
          lastRunSummaryAvailable: booleanSchema(),
          lastRunAt: nullable(isoDateTimeSchema),
          lastRunGoldRows: integerSchema({ minimum: 0 }),
        },
        [
          "silverQualityAvailable",
          "goldFeatureQualityAvailable",
          "lastRunSummaryAvailable",
          "lastRunAt",
          "lastRunGoldRows",
        ],
      ),
    },
    [
      "revision",
      "loadedAt",
      "sourcePath",
      "scopedRows",
      "totalRows",
      "totalColumns",
      "policy",
      "qualityReports",
    ],
  ),
  ProofPack: proofPackSchema(),
  CanonicalQualityDashboard: canonicalQualityDashboardSchema(),
  CoverageAlert: coverageAlertSchema(),
  DecisionQueueItem: objectSchema(
    {
      id: uuidSchema,
      siteId: stringSchema(),
      alertDate: isoDateSchema,
      shift: stringSchema(),
      severity: stringSchema({ enum: ["low", "medium", "high", "critical"] }),
      horizon: nullable(stringSchema()),
      gapH: numberSchema(),
      pRupture: numberSchema(),
      driversJson: arrayOf(stringSchema()),
      priorityScore: numberSchema(),
      estimatedImpactEur: nullable(numberSchema()),
      timeToBreachHours: nullable(numberSchema()),
    },
    ["id", "siteId", "alertDate", "shift", "severity", "gapH"],
  ),
  ParetoFrontierResponse: objectSchema(
    {
      alertId: uuidSchema,
      options: arrayOf(scenarioOptionSchema()),
      paretoFrontier: arrayOf(scenarioOptionSchema()),
      recommended: nullable(scenarioOptionSchema()),
    },
    ["alertId", "options", "paretoFrontier", "recommended"],
  ),
  DecisionWorkspace: decisionWorkspaceSchema(),
} as const satisfies Partial<
  Record<PublicApiResponseTypeName, PublicJsonSchema>
>;
