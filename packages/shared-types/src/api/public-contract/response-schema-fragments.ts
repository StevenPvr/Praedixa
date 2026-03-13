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

export const isoDateSchema = stringSchema({ format: "date" });
export const isoDateTimeSchema = stringSchema({ format: "date-time" });
export const uuidSchema = stringSchema();
export const shiftSchema = stringSchema({ enum: ["am", "pm"] });
export const coverageSeveritySchema = stringSchema({
  enum: ["low", "medium", "high", "critical"],
});
export const coverageStatusSchema = stringSchema({
  enum: ["open", "acknowledged", "resolved", "expired"],
});
export const uiDensitySchema = stringSchema({
  enum: ["comfortable", "compact"],
});
export const userLanguageSchema = stringSchema({ enum: ["fr", "en"] });

export function canonicalRecordSchema(): PublicJsonSchema {
  return objectSchema(
    {
      id: uuidSchema,
      organizationId: uuidSchema,
      siteId: stringSchema(),
      date: isoDateSchema,
      shift: shiftSchema,
      competence: nullable(stringSchema()),
      chargeUnits: nullable(numberSchema()),
      capacitePlanH: numberSchema(),
      realiseH: nullable(numberSchema()),
      absH: nullable(numberSchema()),
      hsH: nullable(numberSchema()),
      interimH: nullable(numberSchema()),
      coutInterneEst: nullable(numberSchema()),
      siteName: nullable(stringSchema()),
    },
    ["id", "organizationId", "siteId", "date", "shift", "capacitePlanH"],
  );
}

export function canonicalQualityDashboardSchema(): PublicJsonSchema {
  return objectSchema(
    {
      totalRecords: integerSchema({ minimum: 0 }),
      coveragePct: numberSchema(),
      sites: integerSchema({ minimum: 0 }),
      dateRange: arrayOf(isoDateSchema),
      missingShiftsPct: numberSchema(),
      avgAbsPct: numberSchema(),
    },
    [
      "totalRecords",
      "coveragePct",
      "sites",
      "dateRange",
      "missingShiftsPct",
      "avgAbsPct",
    ],
  );
}

export function dashboardSummarySchema(): PublicJsonSchema {
  return objectSchema(
    {
      coverageHuman: numberSchema(),
      coverageMerchandise: numberSchema(),
      activeAlertsCount: integerSchema({ minimum: 0 }),
      forecastAccuracy: nullable(numberSchema()),
      lastForecastDate: nullable(isoDateSchema),
    },
    [
      "coverageHuman",
      "coverageMerchandise",
      "activeAlertsCount",
      "forecastAccuracy",
      "lastForecastDate",
    ],
  );
}

export function decisionHorizonSchema(): PublicJsonSchema {
  return objectSchema(
    {
      id: stringSchema(),
      label: stringSchema(),
      days: integerSchema({ minimum: 1 }),
      rank: integerSchema({ minimum: 0 }),
      active: booleanSchema(),
      isDefault: booleanSchema(),
    },
    ["id", "label", "days", "rank", "active", "isDefault"],
  );
}

function recommendationOptionCatalogRuleSchema(): PublicJsonSchema {
  return objectSchema(
    {
      optionType: stringSchema({
        enum: [
          "hs",
          "interim",
          "realloc_intra",
          "realloc_inter",
          "service_adjust",
          "outsource",
        ],
      }),
      enabled: booleanSchema(),
      label: stringSchema(),
      maxCoveredHours: numberSchema(),
    },
    ["optionType", "enabled"],
  );
}

function recommendationWeightsSchema(): PublicJsonSchema {
  return objectSchema(
    {
      cost: numberSchema(),
      service: numberSchema(),
      risk: numberSchema(),
      feasibility: numberSchema(),
    },
    ["cost", "service", "risk", "feasibility"],
  );
}

function recommendationConstraintsSchema(): PublicJsonSchema {
  return objectSchema({
    minServicePct: numberSchema(),
    maxRiskScore: numberSchema(),
    minFeasibilityScore: numberSchema(),
    requirePolicyCompliance: booleanSchema(),
  });
}

function recommendationPolicyByHorizonSchema(): PublicJsonSchema {
  return objectSchema(
    {
      horizonId: stringSchema(),
      weights: recommendationWeightsSchema(),
      constraints: recommendationConstraintsSchema(),
      tieBreakers: arrayOf(stringSchema()),
    },
    ["horizonId", "weights"],
  );
}

export function decisionConfigPayloadSchema(): PublicJsonSchema {
  return objectSchema(
    {
      horizons: arrayOf(decisionHorizonSchema()),
      optionCatalog: arrayOf(recommendationOptionCatalogRuleSchema()),
      policiesByHorizon: arrayOf(recommendationPolicyByHorizonSchema()),
    },
    ["horizons", "optionCatalog", "policiesByHorizon"],
  );
}

export function coverageAlertSchema(): PublicJsonSchema {
  return objectSchema(
    {
      id: uuidSchema,
      organizationId: uuidSchema,
      siteId: stringSchema(),
      alertDate: isoDateSchema,
      shift: shiftSchema,
      horizon: stringSchema(),
      pRupture: numberSchema(),
      gapH: numberSchema(),
      predictionIntervalLow: numberSchema(),
      predictionIntervalHigh: numberSchema(),
      modelVersion: stringSchema(),
      calibrationBucket: stringSchema(),
      impactEur: numberSchema(),
      severity: coverageSeveritySchema,
      status: coverageStatusSchema,
      driversJson: arrayOf(stringSchema()),
      acknowledgedAt: isoDateTimeSchema,
      resolvedAt: isoDateTimeSchema,
      createdAt: isoDateTimeSchema,
      updatedAt: isoDateTimeSchema,
      siteName: nullable(stringSchema()),
    },
    [
      "id",
      "organizationId",
      "siteId",
      "alertDate",
      "shift",
      "horizon",
      "pRupture",
      "gapH",
      "severity",
      "status",
      "driversJson",
      "createdAt",
      "updatedAt",
    ],
  );
}

export function scenarioOptionSchema(): PublicJsonSchema {
  return objectSchema(
    {
      id: uuidSchema,
      organizationId: uuidSchema,
      createdAt: isoDateTimeSchema,
      updatedAt: isoDateTimeSchema,
      coverageAlertId: uuidSchema,
      costParameterId: uuidSchema,
      optionType: stringSchema({
        enum: [
          "hs",
          "interim",
          "realloc_intra",
          "realloc_inter",
          "service_adjust",
          "outsource",
        ],
      }),
      label: stringSchema(),
      coutTotalEur: numberSchema(),
      serviceAttenduPct: numberSchema(),
      heuresCouvertes: numberSchema(),
      feasibilityScore: numberSchema(),
      riskScore: numberSchema(),
      policyCompliance: booleanSchema(),
      dominanceReason: stringSchema(),
      recommendationPolicyVersion: stringSchema(),
      isParetoOptimal: booleanSchema(),
      isRecommended: booleanSchema(),
      contraintesJson: mapOf({}),
    },
    [
      "id",
      "organizationId",
      "createdAt",
      "updatedAt",
      "coverageAlertId",
      "costParameterId",
      "optionType",
      "label",
      "coutTotalEur",
      "serviceAttenduPct",
      "heuresCouvertes",
      "isParetoOptimal",
      "isRecommended",
      "contraintesJson",
    ],
  );
}

function decisionDiagnosticSchema(): PublicJsonSchema {
  return objectSchema({
    topDrivers: arrayOf(stringSchema()),
    confidencePct: integerSchema({ minimum: 0 }),
    riskTrend: stringSchema({ enum: ["improving", "stable", "worsening"] }),
    note: stringSchema(),
  });
}

export function decisionWorkspaceSchema(): PublicJsonSchema {
  return objectSchema(
    {
      alert: coverageAlertSchema(),
      options: arrayOf(scenarioOptionSchema()),
      recommendedOptionId: nullable(stringSchema()),
      diagnostic: decisionDiagnosticSchema(),
    },
    ["alert", "options"],
  );
}

function datasetColumnSchema(): PublicJsonSchema {
  return objectSchema(
    {
      id: uuidSchema,
      createdAt: isoDateTimeSchema,
      updatedAt: isoDateTimeSchema,
      datasetId: uuidSchema,
      name: stringSchema(),
      dtype: stringSchema({
        enum: ["float", "integer", "date", "category", "boolean", "text"],
      }),
      role: stringSchema({
        enum: ["target", "feature", "temporal_index", "group_by", "id", "meta"],
      }),
      nullable: booleanSchema(),
      rulesOverride: nullable(mapOf({})),
      ordinalPosition: integerSchema({ minimum: 0 }),
    },
    [
      "id",
      "createdAt",
      "updatedAt",
      "datasetId",
      "name",
      "dtype",
      "role",
      "nullable",
      "rulesOverride",
      "ordinalPosition",
    ],
  );
}

export function datasetDetailResponseSchema(): PublicJsonSchema {
  return objectSchema(
    {
      id: uuidSchema,
      name: stringSchema(),
      status: stringSchema(),
      tableName: stringSchema(),
      temporalIndex: stringSchema(),
      groupBy: arrayOf(stringSchema()),
      rowCount: integerSchema({ minimum: 0 }),
      lastIngestionAt: nullable(isoDateTimeSchema),
      columns: arrayOf(datasetColumnSchema()),
    },
    [
      "id",
      "name",
      "status",
      "tableName",
      "temporalIndex",
      "groupBy",
      "rowCount",
      "lastIngestionAt",
      "columns",
    ],
  );
}

export function ingestionHistoryEntrySchema(): PublicJsonSchema {
  return objectSchema(
    {
      id: uuidSchema,
      createdAt: isoDateTimeSchema,
      updatedAt: isoDateTimeSchema,
      datasetId: uuidSchema,
      mode: stringSchema({ enum: ["incremental", "full_refit"] }),
      rowsReceived: integerSchema({ minimum: 0 }),
      rowsTransformed: integerSchema({ minimum: 0 }),
      startedAt: isoDateTimeSchema,
      completedAt: nullable(isoDateTimeSchema),
      status: stringSchema({ enum: ["running", "success", "failed"] }),
      errorMessage: nullable(stringSchema()),
      triggeredBy: stringSchema(),
      requestId: nullable(stringSchema()),
    },
    [
      "id",
      "createdAt",
      "updatedAt",
      "datasetId",
      "mode",
      "rowsReceived",
      "rowsTransformed",
      "startedAt",
      "completedAt",
      "status",
      "errorMessage",
      "triggeredBy",
      "requestId",
    ],
  );
}

export function operationalDecisionSchema(): PublicJsonSchema {
  return objectSchema(
    {
      id: uuidSchema,
      organizationId: uuidSchema,
      createdAt: isoDateTimeSchema,
      updatedAt: isoDateTimeSchema,
      coverageAlertId: uuidSchema,
      recommendedOptionId: uuidSchema,
      chosenOptionId: uuidSchema,
      siteId: stringSchema(),
      decisionDate: isoDateSchema,
      shift: shiftSchema,
      horizon: stringSchema(),
      gapH: numberSchema(),
      isOverride: booleanSchema(),
      overrideReason: stringSchema(),
      overrideCategory: stringSchema(),
      exogenousEventTag: stringSchema(),
      recommendationPolicyVersion: stringSchema(),
      coutAttenduEur: numberSchema(),
      serviceAttenduPct: numberSchema(),
      coutObserveEur: numberSchema(),
      serviceObservePct: numberSchema(),
      decidedBy: uuidSchema,
      comment: stringSchema(),
    },
    [
      "id",
      "organizationId",
      "createdAt",
      "updatedAt",
      "coverageAlertId",
      "siteId",
      "decisionDate",
      "shift",
      "horizon",
      "gapH",
      "isOverride",
      "decidedBy",
    ],
  );
}

export function proofPackSchema(): PublicJsonSchema {
  return objectSchema(
    {
      id: uuidSchema,
      organizationId: uuidSchema,
      siteId: stringSchema(),
      month: isoDateSchema,
      coutBauEur: numberSchema(),
      cout100Eur: numberSchema(),
      coutReelEur: numberSchema(),
      gainNetEur: numberSchema(),
      serviceBauPct: numberSchema(),
      serviceReelPct: numberSchema(),
      captureRate: numberSchema(),
      bauMethodVersion: stringSchema(),
      attributionConfidence: numberSchema(),
      adoptionPct: numberSchema(),
      alertesEmises: integerSchema({ minimum: 0 }),
      alertesTraitees: integerSchema({ minimum: 0 }),
    },
    [
      "id",
      "organizationId",
      "siteId",
      "month",
      "coutBauEur",
      "cout100Eur",
      "coutReelEur",
      "gainNetEur",
      "alertesEmises",
      "alertesTraitees",
    ],
  );
}
