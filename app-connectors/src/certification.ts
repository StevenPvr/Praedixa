import { CONNECTOR_CATALOG } from "./catalog.js";
import type {
  ConnectorAuthMode,
  ConnectorCatalogItem,
  ConnectorDomain,
  ConnectorOnboardingMode,
  ConnectorVendor,
} from "./types.js";

export type ConnectorCertificationScenario =
  | "catalog"
  | "connection_create"
  | "activation_readiness"
  | "connection_test"
  | "full_sync"
  | "incremental_sync"
  | "replay"
  | "backfill"
  | "raw_retention"
  | "audit_events"
  | "service_token_scope";

export interface ConnectorLayerBoundary {
  name: "raw" | "harmonized" | "features" | "audit" | "config";
  contract: string;
  owner: string;
  writesFrom: readonly string[];
  forbiddenFrom: readonly string[];
}

export interface ConnectorCertificationRow {
  vendor: ConnectorVendor;
  domain: ConnectorDomain;
  authModes: readonly ConnectorAuthMode[];
  onboardingModes: readonly ConnectorOnboardingMode[];
  sourceObjects: readonly string[];
  recommendedSyncMinutes: number;
  medallionTargets: readonly ("bronze" | "silver" | "gold")[];
  supportsFullSync: true;
  supportsIncrementalSync: true;
  supportsReplay: true;
  supportsBackfill: true;
  supportsConnectionTest: true;
  requiresRepresentativeFixtures: true;
  rawRetentionDays: number;
  requiredTestScenarios: readonly ConnectorCertificationScenario[];
}

export const CONNECTOR_LAYER_BOUNDARIES: readonly ConnectorLayerBoundary[] = [
  {
    name: "raw",
    contract:
      "Immutable Bronze landing for supplier payloads and sync watermarks.",
    owner: "app-connectors + app-api raw ingestion",
    writesFrom: ["connector ingest endpoints", "connector sync workers"],
    forbiddenFrom: [
      "feature engineering",
      "manual business edits",
      "Gold KPI publishing",
    ],
  },
  {
    name: "harmonized",
    contract:
      "Silver canonical objects after mapping, timezone normalization and quality gates.",
    owner: "app-api medallion pipeline",
    writesFrom: ["Silver normalization jobs", "validated replay/backfill jobs"],
    forbiddenFrom: [
      "connector HTTP handlers",
      "UI write-backs",
      "Gold-only feature jobs",
    ],
  },
  {
    name: "features",
    contract:
      "Gold features, KPI views and scenario-ready datasets derived from Silver only.",
    owner: "app-api Gold/services",
    writesFrom: ["Gold publishing jobs", "feature engineering jobs"],
    forbiddenFrom: [
      "connector ingest endpoints",
      "manual admin config edits",
      "raw payload retention jobs",
    ],
  },
  {
    name: "audit",
    contract:
      "Append-only audit trail for connection mutations, sync runs, ingest and support evidence.",
    owner: "app-connectors + app-api observability",
    writesFrom: [
      "control-plane mutations",
      "sync lifecycle hooks",
      "security evidence jobs",
    ],
    forbiddenFrom: ["feature transforms", "canonical business mapping"],
  },
  {
    name: "config",
    contract:
      "Versioned connector configuration, mapping metadata and secret references without payload data.",
    owner: "app-connectors control plane",
    writesFrom: [
      "admin connection flows",
      "approved mapping changes",
      "secret rotation jobs",
    ],
    forbiddenFrom: ["raw payload ingestion", "Gold feature publishing"],
  },
] as const;

export const STANDARD_CONNECTOR_REQUIRED_TEST_SCENARIOS = [
  "catalog",
  "connection_create",
  "activation_readiness",
  "connection_test",
  "full_sync",
  "incremental_sync",
  "replay",
  "backfill",
  "raw_retention",
  "audit_events",
  "service_token_scope",
] as const satisfies readonly ConnectorCertificationScenario[];

const DEFAULT_RAW_RETENTION_DAYS = 30;

function toCertificationRow(
  item: ConnectorCatalogItem,
): ConnectorCertificationRow {
  return {
    vendor: item.vendor,
    domain: item.domain,
    authModes: item.authModes,
    onboardingModes: item.onboardingModes,
    sourceObjects: item.sourceObjects,
    recommendedSyncMinutes: item.recommendedSyncMinutes,
    medallionTargets: item.medallionTargets,
    supportsFullSync: true,
    supportsIncrementalSync: true,
    supportsReplay: true,
    supportsBackfill: true,
    supportsConnectionTest: true,
    requiresRepresentativeFixtures: true,
    rawRetentionDays: DEFAULT_RAW_RETENTION_DAYS,
    requiredTestScenarios: STANDARD_CONNECTOR_REQUIRED_TEST_SCENARIOS,
  };
}

export const CONNECTOR_CERTIFICATION_MATRIX =
  CONNECTOR_CATALOG.map(toCertificationRow);

export function listConnectorCertificationMatrix(): readonly ConnectorCertificationRow[] {
  return CONNECTOR_CERTIFICATION_MATRIX;
}

export function validateConnectorCertificationMatrix(
  rows: readonly ConnectorCertificationRow[] = CONNECTOR_CERTIFICATION_MATRIX,
): string[] {
  const errors: string[] = [];

  for (const row of rows) {
    if (row.authModes.length === 0) {
      errors.push(`${row.vendor}: authModes must not be empty`);
    }
    if (row.onboardingModes.length === 0) {
      errors.push(`${row.vendor}: onboardingModes must not be empty`);
    }
    if (row.sourceObjects.length === 0) {
      errors.push(`${row.vendor}: sourceObjects must not be empty`);
    }
    if (
      !row.medallionTargets.includes("bronze") ||
      !row.medallionTargets.includes("silver") ||
      !row.medallionTargets.includes("gold")
    ) {
      errors.push(
        `${row.vendor}: certification requires bronze/silver/gold medallion targets`,
      );
    }
    if (row.recommendedSyncMinutes <= 0) {
      errors.push(
        `${row.vendor}: recommendedSyncMinutes must stay strictly positive`,
      );
    }
    if (row.rawRetentionDays < 1) {
      errors.push(`${row.vendor}: rawRetentionDays must stay >= 1`);
    }

    for (const scenario of STANDARD_CONNECTOR_REQUIRED_TEST_SCENARIOS) {
      if (!row.requiredTestScenarios.includes(scenario)) {
        errors.push(
          `${row.vendor}: missing certification scenario ${scenario}`,
        );
      }
    }
  }

  return errors;
}
