import type { QueryResultRow } from "pg";

import {
  PersistenceError,
  isUuidString,
  queryRows,
  toIsoDateOnly,
} from "./persistence.js";
import type { SiteAccessScope } from "./operational-data.js";

interface DbGoldRow extends QueryResultRow {
  client_slug: string;
  site_id: string;
  site_code: string | null;
  date: Date | string;
  shift: string;
  model_version: string | null;
  load_hours: string | number | null;
  capacity_hours: string | number;
  abs_h: string | number | null;
  hs_h: string | number | null;
  interim_h: string | number | null;
  gap_h: string | number | null;
  risk_score: string | number | null;
  has_alert: boolean | null;
}

export interface PersistentGoldRow {
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
}

export interface PersistentGoldSchema {
  revision: string;
  loadedAt: string;
  totalRows: number;
  totalColumns: number;
  columns: Array<{
    name: string;
    dtype: "string" | "date" | "number" | "boolean";
    nullable: boolean;
    sample: string | number | boolean;
  }>;
}

export interface PersistentGoldCoverage {
  totalColumns: number;
  explorerExposedColumns: number;
  businessMappedColumns: number;
  totalRows: number;
  columns: Array<{
    name: string;
    exposedInExplorer: boolean;
    usedInBusinessViews: boolean;
    mappedViews: string[];
  }>;
}

export interface PersistentGoldProvenance {
  revision: string;
  loadedAt: string;
  sourcePath: string;
  scopedRows: number;
  totalRows: number;
  totalColumns: number;
  policy: {
    allowedMockDomains: string[];
    forecastMockColumns: string[];
    nonForecastMockColumns: string[];
    strictDataPolicyOk: boolean;
  };
  qualityReports: {
    silverQualityAvailable: boolean;
    goldFeatureQualityAvailable: boolean;
    lastRunSummaryAvailable: boolean;
    lastRunAt: string | null;
    lastRunGoldRows: number;
  };
}

function assertOrgId(orgId: string): void {
  if (!isUuidString(orgId)) {
    throw new PersistenceError(
      "Organization id must be a UUID for persistent Gold reads.",
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

function buildSiteScopeClause(
  scope: SiteAccessScope,
  values: unknown[],
  columnName: string,
): string {
  const requestedSiteId = scope.requestedSiteId?.trim();
  if (requestedSiteId) {
    values.push(requestedSiteId);
    return ` AND ${columnName} = $${values.length} `;
  }

  if (scope.orgWide) {
    return "";
  }

  if (scope.accessibleSiteIds.length === 0) {
    return " AND FALSE ";
  }

  values.push(scope.accessibleSiteIds);
  return ` AND ${columnName} = ANY($${values.length}::text[]) `;
}

function mapGoldRow(row: DbGoldRow): PersistentGoldRow {
  return {
    client_slug: row.client_slug,
    site_id: row.site_id,
    site_code: row.site_code ?? row.site_id,
    date: toIsoDateOnly(row.date),
    shift: row.shift === "pm" ? "pm" : "am",
    model_version: row.model_version ?? "persistent-canonical-v1",
    load_hours: toNumber(row.load_hours),
    capacity_hours: toNumber(row.capacity_hours),
    abs_h: toNumber(row.abs_h),
    hs_h: toNumber(row.hs_h),
    interim_h: toNumber(row.interim_h),
    gap_h: toNumber(row.gap_h),
    risk_score: toNumber(row.risk_score),
    has_alert: Boolean(row.has_alert),
  };
}

export async function listPersistentGoldRows(input: {
  organizationId: string;
  scope: SiteAccessScope;
  dateFrom?: string | null;
  dateTo?: string | null;
}): Promise<PersistentGoldRow[]> {
  assertOrgId(input.organizationId);

  const values: unknown[] = [input.organizationId];
  let canonicalWhere = `
    WHERE cr.organization_id = $1::uuid
  `;
  canonicalWhere += buildSiteScopeClause(input.scope, values, "cr.site_id");

  if (input.dateFrom?.trim()) {
    values.push(input.dateFrom.trim());
    canonicalWhere += ` AND cr.date >= $${values.length}::date `;
  }
  if (input.dateTo?.trim()) {
    values.push(input.dateTo.trim());
    canonicalWhere += ` AND cr.date <= $${values.length}::date `;
  }

  const query = `
    WITH aggregated_alerts AS (
      SELECT
        ca.organization_id,
        ca.site_id,
        ca.alert_date,
        ca.shift::text AS shift,
        MAX(ca.gap_h) AS gap_h,
        MAX(ca.p_rupture) AS risk_score,
        BOOL_OR(ca.status::text IN ('open', 'acknowledged')) AS has_alert,
        MAX(ca.model_version) FILTER (WHERE ca.model_version IS NOT NULL) AS model_version
      FROM coverage_alerts ca
      WHERE ca.organization_id = $1::uuid
      GROUP BY ca.organization_id, ca.site_id, ca.alert_date, ca.shift
    )
    SELECT
      o.slug AS client_slug,
      cr.site_id,
      s.code AS site_code,
      cr.date,
      cr.shift::text AS shift,
      COALESCE(aa.model_version, 'persistent-canonical-v1') AS model_version,
      COALESCE(cr.charge_units, 0) AS load_hours,
      cr.capacite_plan_h AS capacity_hours,
      COALESCE(cr.abs_h, 0) AS abs_h,
      COALESCE(cr.hs_h, 0) AS hs_h,
      COALESCE(cr.interim_h, 0) AS interim_h,
      COALESCE(
        aa.gap_h,
        GREATEST(COALESCE(cr.charge_units, 0) - cr.capacite_plan_h, 0)
      ) AS gap_h,
      COALESCE(
        aa.risk_score,
        CASE
          WHEN COALESCE(cr.charge_units, 0) <= 0 THEN 0
          ELSE LEAST(
            1,
            GREATEST(
              0,
              (COALESCE(cr.charge_units, 0) - cr.capacite_plan_h) /
              NULLIF(COALESCE(cr.charge_units, 0), 0)
            )
          )
        END
      ) AS risk_score,
      COALESCE(aa.has_alert, FALSE) AS has_alert
    FROM canonical_records cr
    JOIN organizations o
      ON o.id = cr.organization_id
    LEFT JOIN sites s
      ON s.organization_id = cr.organization_id
     AND (s.code = cr.site_id OR s.id::text = cr.site_id)
    LEFT JOIN aggregated_alerts aa
      ON aa.organization_id = cr.organization_id
     AND aa.site_id = cr.site_id
     AND aa.alert_date = cr.date
     AND aa.shift = cr.shift::text
    ${canonicalWhere}
    ORDER BY cr.date DESC, cr.site_id ASC, cr.shift ASC
  `;

  const rows = await queryRows<DbGoldRow>(query, values);
  return rows.map(mapGoldRow);
}

export async function getPersistentGoldSchema(input: {
  organizationId: string;
  scope: SiteAccessScope;
}): Promise<PersistentGoldSchema> {
  const rows = await listPersistentGoldRows(input);
  const sample = rows[0];
  const columns = [
    {
      name: "client_slug",
      dtype: "string" as const,
      nullable: false,
      sample: sample?.client_slug ?? "praedixa",
    },
    {
      name: "site_id",
      dtype: "string" as const,
      nullable: false,
      sample: sample?.site_id ?? "site-lyon",
    },
    {
      name: "site_code",
      dtype: "string" as const,
      nullable: false,
      sample: sample?.site_code ?? "LYN",
    },
    {
      name: "date",
      dtype: "date" as const,
      nullable: false,
      sample: sample?.date ?? "1970-01-01",
    },
    {
      name: "shift",
      dtype: "string" as const,
      nullable: false,
      sample: sample?.shift ?? "am",
    },
    {
      name: "model_version",
      dtype: "string" as const,
      nullable: false,
      sample: sample?.model_version ?? "persistent-canonical-v1",
    },
    {
      name: "load_hours",
      dtype: "number" as const,
      nullable: false,
      sample: sample?.load_hours ?? 0,
    },
    {
      name: "capacity_hours",
      dtype: "number" as const,
      nullable: false,
      sample: sample?.capacity_hours ?? 0,
    },
    {
      name: "gap_h",
      dtype: "number" as const,
      nullable: false,
      sample: sample?.gap_h ?? 0,
    },
    {
      name: "risk_score",
      dtype: "number" as const,
      nullable: false,
      sample: sample?.risk_score ?? 0,
    },
    {
      name: "has_alert",
      dtype: "boolean" as const,
      nullable: false,
      sample: sample?.has_alert ?? false,
    },
  ];

  return {
    revision: "postgres-gold-v1",
    loadedAt: new Date().toISOString(),
    totalRows: rows.length,
    totalColumns: columns.length,
    columns,
  };
}

export async function getPersistentGoldCoverage(input: {
  organizationId: string;
  scope: SiteAccessScope;
}): Promise<PersistentGoldCoverage> {
  const rows = await listPersistentGoldRows(input);
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
  ];

  return {
    totalColumns: columns.length,
    explorerExposedColumns: columns.filter((item) => item.exposedInExplorer).length,
    businessMappedColumns: columns.filter((item) => item.usedInBusinessViews).length,
    totalRows: rows.length,
    columns,
  };
}

export async function getPersistentGoldProvenance(input: {
  organizationId: string;
  scope: SiteAccessScope;
}): Promise<PersistentGoldProvenance> {
  const rows = await listPersistentGoldRows(input);

  return {
    revision: "postgres-gold-v1",
    loadedAt: new Date().toISOString(),
    sourcePath: "postgresql://public.canonical_records+coverage_alerts",
    scopedRows: rows.length,
    totalRows: rows.length,
    totalColumns: 11,
    policy: {
      allowedMockDomains: [],
      forecastMockColumns: [],
      nonForecastMockColumns: [],
      strictDataPolicyOk: true,
    },
    qualityReports: {
      silverQualityAvailable: false,
      goldFeatureQualityAvailable: false,
      lastRunSummaryAvailable: false,
      lastRunAt: null,
      lastRunGoldRows: rows.length,
    },
  };
}
