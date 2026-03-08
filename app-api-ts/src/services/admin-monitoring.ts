import type { QueryResultRow } from "pg";

import {
  PersistenceError,
  isUuidString,
  queryRows,
  toIsoDateTime,
} from "./persistence.js";

const COST_PARAM_TYPES = [
  "c_int",
  "maj_hs",
  "c_interim",
  "premium_urgence",
  "c_backlog",
  "cap_hs_shift",
  "cap_interim_site",
  "lead_time_jours",
] as const;

interface DbPlatformKpiRow extends QueryResultRow {
  total_organizations: string | number;
  active_organizations: string | number;
  total_users: string | number;
  total_datasets: string | number;
  total_forecasts: string | number;
  total_decisions: string | number;
  ingestion_total: string | number;
  ingestion_successes: string | number;
  forecast_failures: string | number;
}

interface DbAlertsByOrgRow extends QueryResultRow {
  org_id: string;
  org_name: string;
  critical: string | number;
  high: string | number;
  medium: string | number;
  low: string | number;
  total: string | number;
}

interface DbCountRow extends QueryResultRow {
  count: string | number;
}

interface DbDecisionsByOrgRow extends QueryResultRow {
  org_id: string;
  org_name: string;
  total_decisions: string | number;
  adopted_decisions: string | number;
  override_decisions: string | number;
}

interface DbRoiByOrgRow extends QueryResultRow {
  org_id: string;
  org_name: string;
  gain_net_vs_bau_eur: string | number;
}

interface DbMissingCostParamsRow extends QueryResultRow {
  org_id: string;
  org_name: string;
  missing_sites: string | number;
  total_sites: string | number;
}

interface DbTrendPointRow extends QueryResultRow {
  day: Date | string;
  value: string | number;
}

interface DbOrgMetricsRow extends QueryResultRow {
  active_users: string | number;
  total_datasets: string | number;
  forecast_runs: string | number;
  decisions_count: string | number;
  last_activity: Date | string | null;
}

interface DbOrgMirrorRow extends QueryResultRow {
  total_employees: string | number;
  total_sites: string | number;
  active_alerts: string | number;
  forecast_accuracy: string | number | null;
  avg_absenteeism: string | number | null;
  coverage_rate: string | number | null;
}

function assertOrgId(orgId: string): void {
  if (!isUuidString(orgId)) {
    throw new PersistenceError(
      "Organization id must be a UUID for persistent admin monitoring.",
      400,
      "INVALID_ORGANIZATION_ID",
    );
  }
}

function toNumber(value: string | number | null): number {
  if (value == null) {
    return 0;
  }
  if (typeof value === "number") {
    return value;
  }
  return Number.parseFloat(value);
}

function toRoundedPercentage(numerator: number, denominator: number, digits = 2): number {
  if (denominator <= 0) {
    return 0;
  }
  return Number(((numerator / denominator) * 100).toFixed(digits));
}

export async function getPersistentPlatformKpis(): Promise<{
  totalOrganizations: number;
  activeOrganizations: number;
  totalUsers: number;
  totalDatasets: number;
  totalForecasts: number;
  totalDecisions: number;
  ingestionSuccessRate: number;
  apiErrorRate: number;
}> {
  const rows = await queryRows<DbPlatformKpiRow>(
    `
      SELECT
        (SELECT COUNT(*) FROM organizations) AS total_organizations,
        (
          SELECT COUNT(*)
          FROM organizations
          WHERE status::text = 'active'
        ) AS active_organizations,
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM client_datasets) AS total_datasets,
        (SELECT COUNT(*) FROM forecast_runs) AS total_forecasts,
        (SELECT COUNT(*) FROM decisions) AS total_decisions,
        (SELECT COUNT(*) FROM ingestion_log) AS ingestion_total,
        (
          SELECT COUNT(*)
          FROM ingestion_log
          WHERE status::text = 'success'
        ) AS ingestion_successes,
        (
          SELECT COUNT(*)
          FROM forecast_runs
          WHERE status::text = 'failed'
        ) AS forecast_failures
    `,
    [],
  );

  const row = rows[0];
  const totalForecasts = toNumber(row?.total_forecasts ?? 0);
  const forecastFailures = toNumber(row?.forecast_failures ?? 0);
  const ingestionTotal = toNumber(row?.ingestion_total ?? 0);
  const ingestionSuccesses = toNumber(row?.ingestion_successes ?? 0);

  return {
    totalOrganizations: toNumber(row?.total_organizations ?? 0),
    activeOrganizations: toNumber(row?.active_organizations ?? 0),
    totalUsers: toNumber(row?.total_users ?? 0),
    totalDatasets: toNumber(row?.total_datasets ?? 0),
    totalForecasts,
    totalDecisions: toNumber(row?.total_decisions ?? 0),
    ingestionSuccessRate: toRoundedPercentage(ingestionSuccesses, ingestionTotal),
    apiErrorRate: toRoundedPercentage(forecastFailures, totalForecasts),
  };
}

export async function getPersistentMonitoringTrends(input?: {
  days?: number;
}): Promise<{ points: Array<{ date: string; value: number }> }> {
  const days = Math.min(90, Math.max(7, input?.days ?? 14));
  const rows = await queryRows<DbTrendPointRow>(
    `
      SELECT
        DATE_TRUNC('day', fr.created_at) AS day,
        COUNT(*)::bigint AS value
      FROM forecast_runs fr
      WHERE fr.created_at >= NOW() - ($1::int * INTERVAL '1 day')
      GROUP BY DATE_TRUNC('day', fr.created_at)
      ORDER BY DATE_TRUNC('day', fr.created_at) ASC
    `,
    [days],
  );

  return {
    points: rows.map((row) => ({
      date: new Date(row.day).toISOString(),
      value: toNumber(row.value),
    })),
  };
}

export async function getPersistentMonitoringErrors(): Promise<{
  count24h: number;
  incidents: Array<{ type: string; count: number; window: string }>;
}> {
  const [ingestionFailures, forecastFailures] = await Promise.all([
    queryRows<DbCountRow>(
      `
        SELECT COUNT(*)::bigint AS count
        FROM ingestion_log
        WHERE status::text = 'failed'
          AND COALESCE(completed_at, started_at, created_at) >= NOW() - INTERVAL '24 hours'
      `,
      [],
    ),
    queryRows<DbCountRow>(
      `
        SELECT COUNT(*)::bigint AS count
        FROM forecast_runs
        WHERE status::text = 'failed'
          AND COALESCE(completed_at, started_at, created_at) >= NOW() - INTERVAL '24 hours'
      `,
      [],
    ),
  ]);

  const ingestionCount = toNumber(ingestionFailures[0]?.count ?? 0);
  const forecastCount = toNumber(forecastFailures[0]?.count ?? 0);
  const incidents = [
    ...(ingestionCount > 0
      ? [{ type: "ingestion_failures", count: ingestionCount, window: "24h" }]
      : []),
    ...(forecastCount > 0
      ? [{ type: "forecast_failures", count: forecastCount, window: "24h" }]
      : []),
  ];

  return {
    count24h: ingestionCount + forecastCount,
    incidents,
  };
}

export async function getPersistentMonitoringAlertsSummary(): Promise<{
  totalAlerts: number;
}> {
  const rows = await queryRows<DbCountRow>(
    `
      SELECT COUNT(*)::bigint AS count
      FROM coverage_alerts
      WHERE status::text IN ('open', 'acknowledged')
    `,
    [],
  );

  return {
    totalAlerts: toNumber(rows[0]?.count ?? 0),
  };
}

export async function getPersistentMonitoringAlertsByOrg(): Promise<{
  organizations: Array<{
    orgId: string;
    orgName: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  }>;
  totalAlerts: number;
}> {
  const rows = await queryRows<DbAlertsByOrgRow>(
    `
      SELECT
        o.id::text AS org_id,
        o.name AS org_name,
        COUNT(ca.id) FILTER (
          WHERE ca.status::text IN ('open', 'acknowledged')
            AND ca.severity::text = 'critical'
        ) AS critical,
        COUNT(ca.id) FILTER (
          WHERE ca.status::text IN ('open', 'acknowledged')
            AND ca.severity::text = 'high'
        ) AS high,
        COUNT(ca.id) FILTER (
          WHERE ca.status::text IN ('open', 'acknowledged')
            AND ca.severity::text = 'medium'
        ) AS medium,
        COUNT(ca.id) FILTER (
          WHERE ca.status::text IN ('open', 'acknowledged')
            AND ca.severity::text = 'low'
        ) AS low,
        COUNT(ca.id) FILTER (
          WHERE ca.status::text IN ('open', 'acknowledged')
        ) AS total
      FROM organizations o
      LEFT JOIN coverage_alerts ca
        ON ca.organization_id = o.id
      GROUP BY o.id, o.name
      ORDER BY total DESC, o.name ASC
    `,
    [],
  );

  const organizations = rows.map((row) => ({
    orgId: row.org_id,
    orgName: row.org_name,
    critical: toNumber(row.critical),
    high: toNumber(row.high),
    medium: toNumber(row.medium),
    low: toNumber(row.low),
    total: toNumber(row.total),
  }));

  return {
    totalAlerts: organizations.reduce((sum, row) => sum + row.total, 0),
    organizations,
  };
}

export async function getPersistentMonitoringScenariosSummary(): Promise<{
  scenariosGenerated: number;
}> {
  const rows = await queryRows<DbCountRow>(
    `
      SELECT COUNT(*)::bigint AS count
      FROM scenario_options
    `,
    [],
  );

  return {
    scenariosGenerated: toNumber(rows[0]?.count ?? 0),
  };
}

export async function getPersistentMonitoringDecisionsSummary(): Promise<{
  totalDecisions: number;
}> {
  const rows = await queryRows<DbCountRow>(
    `
      SELECT COUNT(*)::bigint AS count
      FROM operational_decisions
    `,
    [],
  );

  return {
    totalDecisions: toNumber(rows[0]?.count ?? 0),
  };
}

export async function getPersistentMonitoringDecisionsOverrides(): Promise<{
  overrideRatePct: number;
}> {
  const rows = await queryRows<DbCountRow & { overrides: string | number }>(
    `
      SELECT
        COUNT(*)::bigint AS count,
        COUNT(*) FILTER (WHERE is_override IS TRUE)::bigint AS overrides
      FROM operational_decisions
    `,
    [],
  );

  const total = toNumber(rows[0]?.count ?? 0);
  const overrides = toNumber(rows[0]?.overrides ?? 0);
  return {
    overrideRatePct: toRoundedPercentage(overrides, total, 1),
  };
}

export async function getPersistentMonitoringDecisionsAdoption(): Promise<{
  organizations: Array<{
    orgId: string;
    orgName: string;
    adoptionRate: number;
    totalDecisions: number;
  }>;
}> {
  const rows = await queryRows<DbDecisionsByOrgRow>(
    `
      SELECT
        o.id::text AS org_id,
        o.name AS org_name,
        COUNT(od.id)::bigint AS total_decisions,
        COUNT(od.id) FILTER (WHERE od.is_override IS FALSE)::bigint AS adopted_decisions,
        COUNT(od.id) FILTER (WHERE od.is_override IS TRUE)::bigint AS override_decisions
      FROM organizations o
      LEFT JOIN operational_decisions od
        ON od.organization_id = o.id
      GROUP BY o.id, o.name
      ORDER BY o.name ASC
    `,
    [],
  );

  return {
    organizations: rows.map((row) => {
      const totalDecisions = toNumber(row.total_decisions);
      const adoptedDecisions = toNumber(row.adopted_decisions);
      return {
        orgId: row.org_id,
        orgName: row.org_name,
        adoptionRate: toRoundedPercentage(adoptedDecisions, totalDecisions, 1),
        totalDecisions,
      };
    }),
  };
}

export async function getPersistentMonitoringProofPacksSummary(): Promise<{
  generatedMonthly: number;
}> {
  const rows = await queryRows<DbCountRow>(
    `
      SELECT COUNT(*)::bigint AS count
      FROM proof_records
      WHERE DATE_TRUNC('month', month) = DATE_TRUNC('month', CURRENT_DATE)
    `,
    [],
  );

  return {
    generatedMonthly: toNumber(rows[0]?.count ?? 0),
  };
}

export async function getPersistentMonitoringCanonicalCoverage(): Promise<{
  coveragePct: number;
}> {
  const rows = await queryRows<
    QueryResultRow & {
      total_records: string | number;
      valid_records: string | number;
    }
  >(
    `
      SELECT
        COUNT(*)::bigint AS total_records,
        COUNT(*) FILTER (WHERE capacite_plan_h > 0)::bigint AS valid_records
      FROM canonical_records
    `,
    [],
  );

  const totalRecords = toNumber(rows[0]?.total_records ?? 0);
  const validRecords = toNumber(rows[0]?.valid_records ?? 0);
  return {
    coveragePct: toRoundedPercentage(validRecords, totalRecords, 1),
  };
}

export async function getPersistentMonitoringMissingCostParams(): Promise<{
  totalOrgsWithMissing: number;
  totalMissingParams: number;
  organizations: Array<{
    orgId: string;
    orgName: string;
    missingSites: number;
    totalSites: number;
  }>;
  orgs: Array<{
    organizationId: string;
    missingTypes: string[];
    totalMissing: number;
  }>;
  missing: Array<{
    organizationId: string;
    name: string;
    missingTypes: string[];
    totalMissing: number;
  }>;
}> {
  const rows = await queryRows<DbMissingCostParamsRow>(
    `
      WITH active_cost_params AS (
        SELECT
          cp.organization_id,
          cp.site_id
        FROM cost_parameters cp
        WHERE cp.effective_from <= CURRENT_DATE
          AND (cp.effective_until IS NULL OR cp.effective_until >= CURRENT_DATE)
        GROUP BY cp.organization_id, cp.site_id
      ),
      site_configuration AS (
        SELECT
          o.id::text AS org_id,
          o.name AS org_name,
          s.id::text AS site_pk,
          EXISTS (
            SELECT 1
            FROM active_cost_params cp
            WHERE cp.organization_id = o.id
              AND (
                cp.site_id IS NULL
                OR cp.site_id = s.id::text
                OR cp.site_id = s.code
              )
          ) AS has_config
        FROM organizations o
        LEFT JOIN sites s
          ON s.organization_id = o.id
      )
      SELECT
        org_id,
        org_name,
        COUNT(*) FILTER (WHERE site_pk IS NOT NULL AND has_config IS FALSE)::bigint AS missing_sites,
        COUNT(*) FILTER (WHERE site_pk IS NOT NULL)::bigint AS total_sites
      FROM site_configuration
      GROUP BY org_id, org_name
      HAVING COUNT(*) FILTER (WHERE site_pk IS NOT NULL AND has_config IS FALSE) > 0
      ORDER BY missing_sites DESC, org_name ASC
    `,
    [],
  );

  const organizations = rows.map((row) => ({
    orgId: row.org_id,
    orgName: row.org_name,
    missingSites: toNumber(row.missing_sites),
    totalSites: toNumber(row.total_sites),
  }));

  return {
    totalOrgsWithMissing: organizations.length,
    totalMissingParams: organizations.reduce(
      (sum, row) => sum + row.missingSites * COST_PARAM_TYPES.length,
      0,
    ),
    organizations,
    orgs: organizations.map((row) => ({
      organizationId: row.orgId,
      missingTypes: [...COST_PARAM_TYPES],
      totalMissing: row.missingSites * COST_PARAM_TYPES.length,
    })),
    missing: organizations.map((row) => ({
      organizationId: row.orgId,
      name: row.orgName,
      missingTypes: [...COST_PARAM_TYPES],
      totalMissing: row.missingSites * COST_PARAM_TYPES.length,
    })),
  };
}

export async function getPersistentMonitoringRoiByOrg(): Promise<
  Array<{ organizationId: string; gainNetVsBauEur: number }>
> {
  const rows = await queryRows<DbRoiByOrgRow>(
    `
      SELECT
        o.id::text AS org_id,
        o.name AS org_name,
        COALESCE(SUM(pr.gain_net_eur), 0) AS gain_net_vs_bau_eur
      FROM organizations o
      LEFT JOIN proof_records pr
        ON pr.organization_id = o.id
      GROUP BY o.id, o.name
      ORDER BY gain_net_vs_bau_eur DESC, o.name ASC
    `,
    [],
  );

  return rows.map((row) => ({
    organizationId: row.org_id,
    gainNetVsBauEur: toNumber(row.gain_net_vs_bau_eur),
  }));
}

export async function getPersistentAdminOrgMetrics(orgId: string): Promise<{
  orgId: string;
  health: "ok" | "warning" | "critical";
  adoptionRatePct: number;
}> {
  assertOrgId(orgId);

  const [alertsRows, adoptionRows] = await Promise.all([
    queryRows<DbCountRow>(
      `
        SELECT COUNT(*)::bigint AS count
        FROM coverage_alerts
        WHERE organization_id = $1::uuid
          AND status::text IN ('open', 'acknowledged')
      `,
      [orgId],
    ),
    queryRows<DbDecisionsByOrgRow>(
      `
        SELECT
          $1::text AS org_id,
          '' AS org_name,
          COUNT(od.id)::bigint AS total_decisions,
          COUNT(od.id) FILTER (WHERE od.is_override IS FALSE)::bigint AS adopted_decisions,
          COUNT(od.id) FILTER (WHERE od.is_override IS TRUE)::bigint AS override_decisions
        FROM operational_decisions od
        WHERE od.organization_id = $1::uuid
      `,
      [orgId],
    ),
  ]);

  const activeAlerts = toNumber(alertsRows[0]?.count ?? 0);
  const totalDecisions = toNumber(adoptionRows[0]?.total_decisions ?? 0);
  const adoptedDecisions = toNumber(adoptionRows[0]?.adopted_decisions ?? 0);
  const adoptionRatePct = toRoundedPercentage(adoptedDecisions, totalDecisions, 1);

  return {
    orgId,
    health:
      activeAlerts >= 5 ? "critical" : activeAlerts > 0 ? "warning" : "ok",
    adoptionRatePct,
  };
}

export async function getPersistentAdminOrgMirror(orgId: string): Promise<{
  orgId: string;
  totalEmployees: number;
  totalSites: number;
  activeAlerts: number;
  forecastAccuracy: number;
  avgAbsenteeism: number;
  coverageRate: number;
}> {
  assertOrgId(orgId);

  const rows = await queryRows<DbOrgMirrorRow>(
    `
      SELECT
        (SELECT COUNT(*) FROM employees e WHERE e.organization_id = $1::uuid) AS total_employees,
        (SELECT COUNT(*) FROM sites s WHERE s.organization_id = $1::uuid) AS total_sites,
        (
          SELECT COUNT(*)
          FROM coverage_alerts ca
          WHERE ca.organization_id = $1::uuid
            AND ca.status::text IN ('open', 'acknowledged')
        ) AS active_alerts,
        (
          SELECT AVG(fr.accuracy_score)
          FROM forecast_runs fr
          WHERE fr.organization_id = $1::uuid
            AND fr.status::text = 'completed'
            AND fr.accuracy_score IS NOT NULL
        ) AS forecast_accuracy,
        (
          SELECT AVG(
            CASE
              WHEN cr.capacite_plan_h > 0
              THEN COALESCE(cr.abs_h, 0) / cr.capacite_plan_h
              ELSE NULL
            END
          )
          FROM canonical_records cr
          WHERE cr.organization_id = $1::uuid
        ) AS avg_absenteeism,
        (
          SELECT AVG(
            CASE
              WHEN cr.capacite_plan_h > 0
              THEN LEAST(1, GREATEST(0, 1 - (COALESCE(cr.abs_h, 0) / cr.capacite_plan_h)))
              ELSE NULL
            END
          )
          FROM canonical_records cr
          WHERE cr.organization_id = $1::uuid
        ) AS coverage_rate
    `,
    [orgId],
  );

  const row = rows[0];
  return {
    orgId,
    totalEmployees: toNumber(row?.total_employees ?? 0),
    totalSites: toNumber(row?.total_sites ?? 0),
    activeAlerts: toNumber(row?.active_alerts ?? 0),
    forecastAccuracy: Number(toNumber(row?.forecast_accuracy ?? 0).toFixed(3)),
    avgAbsenteeism: Number(toNumber(row?.avg_absenteeism ?? 0).toFixed(3)),
    coverageRate: Number(toNumber(row?.coverage_rate ?? 0).toFixed(3)),
  };
}

export async function getPersistentAdminOrgUsageMetrics(orgId: string): Promise<{
  activeUsers: number;
  totalDatasets: number;
  forecastRuns: number;
  decisionsCount: number;
  lastActivity: string | null;
}> {
  assertOrgId(orgId);

  const rows = await queryRows<DbOrgMetricsRow>(
    `
      SELECT
        (
          SELECT COUNT(*)
          FROM users u
          WHERE u.organization_id = $1::uuid
            AND u.status::text = 'active'
        ) AS active_users,
        (
          SELECT COUNT(*)
          FROM client_datasets cd
          WHERE cd.organization_id = $1::uuid
        ) AS total_datasets,
        (
          SELECT COUNT(*)
          FROM forecast_runs fr
          WHERE fr.organization_id = $1::uuid
        ) AS forecast_runs,
        (
          SELECT COUNT(*)
          FROM decisions d
          WHERE d.organization_id = $1::uuid
        ) AS decisions_count,
        (
          SELECT MAX(u.last_login_at)
          FROM users u
          WHERE u.organization_id = $1::uuid
        ) AS last_activity
    `,
    [orgId],
  );

  const row = rows[0];
  return {
    activeUsers: toNumber(row?.active_users ?? 0),
    totalDatasets: toNumber(row?.total_datasets ?? 0),
    forecastRuns: toNumber(row?.forecast_runs ?? 0),
    decisionsCount: toNumber(row?.decisions_count ?? 0),
    lastActivity: toIsoDateTime(row?.last_activity ?? null),
  };
}
