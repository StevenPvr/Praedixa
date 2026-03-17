import type { PoolClient, QueryResultRow } from "pg";

import type {
  OperationalDecision,
  OverrideStatistics,
  ScenarioOptionType,
} from "@praedixa/shared-types/domain";

import type { SiteAccessScope } from "./operational-data.js";
import { initializePersistentDecisionOpsRuntime } from "./decisionops-runtime.js";
import {
  PersistenceError,
  isUuidString,
  mapPersistenceError,
  queryRows,
  toIsoDateOnly,
  toIsoDateTime,
  withTransaction,
} from "./persistence.js";

interface DbOperationalDecisionRow extends QueryResultRow {
  id: string;
  organization_id: string;
  created_at: Date | string;
  updated_at: Date | string;
  coverage_alert_id: string;
  recommended_option_id: string | null;
  chosen_option_id: string | null;
  site_id: string;
  decision_date: Date | string;
  shift: string;
  horizon: string;
  gap_h: string | number;
  is_override: boolean;
  override_reason: string | null;
  override_category: string | null;
  exogenous_event_tag: string | null;
  recommendation_policy_version: string | null;
  cout_attendu_eur: string | number | null;
  service_attendu_pct: string | number | null;
  cout_observe_eur: string | number | null;
  service_observe_pct: string | number | null;
  decided_by: string;
  comment: string | null;
}

interface DbCountRow extends QueryResultRow {
  count: string | number;
}

interface DbOverrideReasonRow extends QueryResultRow {
  reason: string;
  count: string | number;
}

interface DbAverageRow extends QueryResultRow {
  avg_cost_delta: string | number | null;
}

interface DbCoverageAlertContextRow extends QueryResultRow {
  id: string;
  site_id: string;
  alert_date: Date | string;
  shift: string;
  horizon: string;
  gap_h: string | number;
  impact_eur: string | number | null;
}

interface DbScenarioOptionContextRow extends QueryResultRow {
  id: string;
  coverage_alert_id: string;
  is_recommended: boolean;
  option_type: ScenarioOptionType;
  label: string;
  cout_total_eur: string | number;
  service_attendu_pct: string | number | null;
  recommendation_policy_version: string | null;
}

function assertOrganizationId(organizationId: string): void {
  if (!isUuidString(organizationId)) {
    throw new PersistenceError(
      "Organization id must be a UUID for operational decisions.",
      400,
      "INVALID_ORGANIZATION_ID",
    );
  }
}

function assertPositiveInteger(
  value: number,
  fieldName: string,
  errorCode: string,
): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new PersistenceError(
      `${fieldName} must be a positive integer.`,
      400,
      errorCode,
    );
  }
}

function toNumber(value: string | number | null): number | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  return Number.parseFloat(value);
}

function toRequiredNumber(value: string | number): number {
  return toNumber(value) ?? 0;
}

function buildSiteScopeClause(
  scope: SiteAccessScope,
  values: unknown[],
  columnName: string,
): string {
  const requestedSiteId = scope.requestedSiteId?.trim();
  if (requestedSiteId) {
    if (!scope.orgWide && !scope.accessibleSiteIds.includes(requestedSiteId)) {
      return " AND FALSE ";
    }

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

function normalizeDateFilter(
  value: string | null | undefined,
  fieldName: "dateFrom" | "dateTo",
  errorCode: "INVALID_DATE_FROM" | "INVALID_DATE_TO",
): string | null {
  const normalized = value?.trim() ?? "";
  if (normalized.length === 0) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new PersistenceError(
      `${fieldName} must use YYYY-MM-DD format.`,
      400,
      errorCode,
    );
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || toIsoDateOnly(parsed) !== normalized) {
    throw new PersistenceError(
      `${fieldName} must be a valid calendar date.`,
      400,
      errorCode,
    );
  }

  return normalized;
}

function appendOperationalDecisionFilters(
  values: unknown[],
  input: {
    dateFrom?: string | null;
    dateTo?: string | null;
    isOverride?: boolean;
    horizon?: string | null;
  },
): string {
  let query = "";

  const dateFrom = normalizeDateFilter(
    input.dateFrom,
    "dateFrom",
    "INVALID_DATE_FROM",
  );
  if (dateFrom) {
    values.push(dateFrom);
    query += ` AND od.decision_date >= $${values.length}::date `;
  }

  const dateTo = normalizeDateFilter(input.dateTo, "dateTo", "INVALID_DATE_TO");
  if (dateTo) {
    values.push(dateTo);
    query += ` AND od.decision_date <= $${values.length}::date `;
  }

  if (input.isOverride != null) {
    values.push(input.isOverride);
    query += ` AND od.is_override = $${values.length} `;
  }

  const normalizedHorizon = input.horizon?.trim().toLowerCase() ?? "";
  if (normalizedHorizon.length > 0) {
    values.push(normalizedHorizon);
    query += ` AND od.horizon::text = $${values.length} `;
  }

  return query;
}

function mapOperationalDecisionRow(
  row: DbOperationalDecisionRow,
): OperationalDecision {
  return {
    id: row.id,
    organizationId: row.organization_id,
    createdAt: toIsoDateTime(row.created_at)!,
    updatedAt: toIsoDateTime(row.updated_at)!,
    coverageAlertId: row.coverage_alert_id,
    recommendedOptionId: row.recommended_option_id ?? undefined,
    chosenOptionId: row.chosen_option_id ?? undefined,
    siteId: row.site_id,
    decisionDate: toIsoDateOnly(row.decision_date),
    shift: row.shift as OperationalDecision["shift"],
    horizon: row.horizon as OperationalDecision["horizon"],
    gapH: toRequiredNumber(row.gap_h),
    isOverride: row.is_override,
    overrideReason: row.override_reason ?? undefined,
    overrideCategory: row.override_category ?? undefined,
    exogenousEventTag: row.exogenous_event_tag ?? undefined,
    recommendationPolicyVersion: row.recommendation_policy_version ?? undefined,
    coutAttenduEur: toNumber(row.cout_attendu_eur) ?? undefined,
    serviceAttenduPct: toNumber(row.service_attendu_pct) ?? undefined,
    coutObserveEur: toNumber(row.cout_observe_eur) ?? undefined,
    serviceObservePct: toNumber(row.service_observe_pct) ?? undefined,
    decidedBy: row.decided_by,
    comment: row.comment ?? undefined,
  };
}

function normalizeNotes(notes: string | null | undefined): string | null {
  const normalized = notes?.trim() ?? "";
  if (normalized.length === 0) {
    return null;
  }

  if (normalized.length > 1000) {
    throw new PersistenceError(
      "notes must be 1000 characters or fewer.",
      400,
      "INVALID_NOTES",
    );
  }

  return normalized;
}

export async function listPersistentOperationalDecisions(input: {
  organizationId: string;
  scope: SiteAccessScope;
  dateFrom?: string | null;
  dateTo?: string | null;
  isOverride?: boolean;
  horizon?: string | null;
  page: number;
  pageSize: number;
}): Promise<{ items: OperationalDecision[]; total: number }> {
  assertOrganizationId(input.organizationId);
  assertPositiveInteger(input.page, "page", "INVALID_PAGE");
  assertPositiveInteger(input.pageSize, "pageSize", "INVALID_PAGE_SIZE");

  const countValues: unknown[] = [input.organizationId];
  let countQuery = `
    SELECT COUNT(*)::bigint AS count
    FROM operational_decisions od
    WHERE od.organization_id = $1::uuid
  `;
  countQuery += buildSiteScopeClause(input.scope, countValues, "od.site_id");
  countQuery += appendOperationalDecisionFilters(countValues, input);

  const totalRows = await queryRows<DbCountRow>(countQuery, countValues);

  const rowValues: unknown[] = [input.organizationId];
  let rowQuery = `
      SELECT
        od.id::text AS id,
        od.organization_id::text AS organization_id,
        od.created_at,
        od.updated_at,
        od.coverage_alert_id::text AS coverage_alert_id,
        od.recommended_option_id::text AS recommended_option_id,
        od.chosen_option_id::text AS chosen_option_id,
        od.site_id,
        od.decision_date,
        od.shift::text AS shift,
        od.horizon::text AS horizon,
        od.gap_h,
        od.is_override,
        od.override_reason,
        od.override_category,
        od.exogenous_event_tag,
        od.recommendation_policy_version,
        od.cout_attendu_eur,
        od.service_attendu_pct,
        od.cout_observe_eur,
        od.service_observe_pct,
        od.decided_by::text AS decided_by,
        od.comment
      FROM operational_decisions od
      WHERE od.organization_id = $1::uuid
  `;
  rowQuery += buildSiteScopeClause(input.scope, rowValues, "od.site_id");
  rowQuery += appendOperationalDecisionFilters(rowValues, input);

  rowValues.push((input.page - 1) * input.pageSize);
  const offsetIndex = rowValues.length;
  rowValues.push(input.pageSize);
  const limitIndex = rowValues.length;

  rowQuery += `
      ORDER BY od.decision_date DESC, od.created_at DESC, od.id DESC
      OFFSET $${offsetIndex}::int
      LIMIT $${limitIndex}::int
    `;

  const rows = await queryRows<DbOperationalDecisionRow>(rowQuery, rowValues);

  return {
    items: rows.map(mapOperationalDecisionRow),
    total: toRequiredNumber(totalRows[0]?.count ?? 0),
  };
}

export async function getPersistentOperationalDecisionOverrideStats(input: {
  organizationId: string;
  scope: SiteAccessScope;
}): Promise<OverrideStatistics> {
  assertOrganizationId(input.organizationId);

  const totalValues: unknown[] = [input.organizationId];
  const overrideValues: unknown[] = [input.organizationId];
  const reasonsValues: unknown[] = [input.organizationId];
  const deltaValues: unknown[] = [input.organizationId];
  const totalSiteClause = buildSiteScopeClause(
    input.scope,
    totalValues,
    "od.site_id",
  );
  const overrideSiteClause = buildSiteScopeClause(
    input.scope,
    overrideValues,
    "od.site_id",
  );
  const reasonsSiteClause = buildSiteScopeClause(
    input.scope,
    reasonsValues,
    "od.site_id",
  );
  const deltaSiteClause = buildSiteScopeClause(
    input.scope,
    deltaValues,
    "od.site_id",
  );

  const [totalRows, overrideRows, reasonsRows, averageRows] = await Promise.all(
    [
      queryRows<DbCountRow>(
        `
        SELECT COUNT(*)::bigint AS count
        FROM operational_decisions od
        WHERE od.organization_id = $1::uuid
        ${totalSiteClause}
      `,
        totalValues,
      ),
      queryRows<DbCountRow>(
        `
        SELECT COUNT(*)::bigint AS count
        FROM operational_decisions od
        WHERE od.organization_id = $1::uuid
          AND od.is_override IS TRUE
          ${overrideSiteClause}
      `,
        overrideValues,
      ),
      queryRows<DbOverrideReasonRow>(
        `
        SELECT
          od.override_reason AS reason,
          COUNT(*)::bigint AS count
        FROM operational_decisions od
        WHERE od.organization_id = $1::uuid
          AND od.is_override IS TRUE
          AND od.override_reason IS NOT NULL
          ${reasonsSiteClause}
        GROUP BY od.override_reason
        ORDER BY COUNT(*) DESC, od.override_reason ASC
        LIMIT 5
      `,
        reasonsValues,
      ),
      queryRows<DbAverageRow>(
        `
        SELECT
          AVG(od.cout_observe_eur - od.cout_attendu_eur) AS avg_cost_delta
        FROM operational_decisions od
        WHERE od.organization_id = $1::uuid
          AND od.is_override IS TRUE
          AND od.cout_observe_eur IS NOT NULL
          AND od.cout_attendu_eur IS NOT NULL
          ${deltaSiteClause}
      `,
        deltaValues,
      ),
    ],
  );

  const totalDecisions = toRequiredNumber(totalRows[0]?.count ?? 0);
  const overrideCount = toRequiredNumber(overrideRows[0]?.count ?? 0);

  return {
    totalDecisions,
    overrideCount,
    overridePct:
      totalDecisions === 0
        ? 0
        : Number(((overrideCount / totalDecisions) * 100).toFixed(2)),
    topOverrideReasons: reasonsRows.map((row) => ({
      reason: row.reason,
      count: toRequiredNumber(row.count),
    })),
    avgCostDelta: Number(
      (toNumber(averageRows[0]?.avg_cost_delta ?? null) ?? 0).toFixed(2),
    ),
  };
}

async function getCoverageAlertContext(
  client: PoolClient,
  input: {
    organizationId: string;
    alertId: string;
    scope: SiteAccessScope;
  },
): Promise<DbCoverageAlertContextRow> {
  const values: unknown[] = [input.organizationId, input.alertId];
  const siteClause = buildSiteScopeClause(input.scope, values, "ca.site_id");
  const result = await client.query<DbCoverageAlertContextRow>(
    `
      SELECT
        ca.id::text AS id,
        ca.site_id,
        ca.alert_date,
        ca.shift::text AS shift,
        ca.horizon::text AS horizon,
        ca.gap_h,
        ca.impact_eur
      FROM coverage_alerts ca
      WHERE ca.organization_id = $1::uuid
        AND ca.id = $2::uuid
        ${siteClause}
      LIMIT 1
    `,
    values,
  );

  const row = result.rows[0];
  if (!row) {
    throw new PersistenceError(
      "Coverage alert not found.",
      404,
      "ALERT_NOT_FOUND",
    );
  }

  return row;
}

async function getRecommendedScenarioOption(
  client: PoolClient,
  input: { organizationId: string; alertId: string },
): Promise<DbScenarioOptionContextRow | null> {
  const result = await client.query<DbScenarioOptionContextRow>(
    `
      SELECT
        so.id::text AS id,
        so.coverage_alert_id::text AS coverage_alert_id,
        so.is_recommended,
        so.option_type::text AS option_type,
        so.label,
        so.cout_total_eur,
        so.service_attendu_pct,
        so.recommendation_policy_version
      FROM scenario_options so
      WHERE so.organization_id = $1::uuid
        AND so.coverage_alert_id = $2::uuid
        AND so.is_recommended IS TRUE
      ORDER BY so.created_at DESC, so.id DESC
      LIMIT 1
    `,
    [input.organizationId, input.alertId],
  );

  return result.rows[0] ?? null;
}

async function getChosenScenarioOption(
  client: PoolClient,
  input: {
    organizationId: string;
    alertId: string;
    optionId: string;
  },
): Promise<DbScenarioOptionContextRow> {
  const result = await client.query<DbScenarioOptionContextRow>(
    `
      SELECT
        so.id::text AS id,
        so.coverage_alert_id::text AS coverage_alert_id,
        so.is_recommended,
        so.option_type::text AS option_type,
        so.label,
        so.cout_total_eur,
        so.service_attendu_pct,
        so.recommendation_policy_version
      FROM scenario_options so
      WHERE so.organization_id = $1::uuid
        AND so.coverage_alert_id = $2::uuid
        AND so.id = $3::uuid
      LIMIT 1
    `,
    [input.organizationId, input.alertId, input.optionId],
  );

  const row = result.rows[0];
  if (!row) {
    throw new PersistenceError(
      "Scenario option not found for this alert.",
      404,
      "OPTION_NOT_FOUND",
    );
  }

  return row;
}

export async function createPersistentOperationalDecision(input: {
  organizationId: string;
  scope: SiteAccessScope;
  alertId: string;
  optionId?: string | null;
  notes?: string | null;
  decidedBy: string;
  decidedByRole?: string | null;
}): Promise<OperationalDecision> {
  assertOrganizationId(input.organizationId);
  if (!isUuidString(input.alertId)) {
    throw new PersistenceError(
      "alertId must be a UUID.",
      400,
      "INVALID_ALERT_ID",
    );
  }
  if (input.optionId != null && !isUuidString(input.optionId)) {
    throw new PersistenceError(
      "optionId must be a UUID.",
      400,
      "INVALID_OPTION_ID",
    );
  }
  if (!isUuidString(input.decidedBy)) {
    throw new PersistenceError(
      "Authenticated user id must be a UUID.",
      400,
      "INVALID_DECIDED_BY",
    );
  }

  const notes = normalizeNotes(input.notes);

  return withTransaction(async (client) => {
    try {
      const alert = await getCoverageAlertContext(client, input);
      const recommended = await getRecommendedScenarioOption(client, input);
      const chosen =
        input.optionId == null
          ? recommended
          : await getChosenScenarioOption(client, {
              organizationId: input.organizationId,
              alertId: input.alertId,
              optionId: input.optionId,
            });

      if (!chosen) {
        throw new PersistenceError(
          "optionId is required when no recommended option exists for this alert.",
          422,
          "OPTION_REQUIRED",
        );
      }

      const isOverride = recommended != null && chosen.id !== recommended.id;
      if (isOverride && notes == null) {
        throw new PersistenceError(
          "Override decisions require notes.",
          422,
          "OVERRIDE_REASON_REQUIRED",
        );
      }

      const insertResult = await client.query<DbOperationalDecisionRow>(
        `
          INSERT INTO operational_decisions (
            organization_id,
            coverage_alert_id,
            recommended_option_id,
            chosen_option_id,
            site_id,
            decision_date,
            shift,
            horizon,
            gap_h,
            is_override,
            override_reason,
            cout_attendu_eur,
            service_attendu_pct,
            decided_by,
            comment,
            recommendation_policy_version
          )
          VALUES (
            $1::uuid,
            $2::uuid,
            $3::uuid,
            $4::uuid,
            $5,
            $6::date,
            $7::shifttype,
            $8::horizon,
            $9::numeric,
            $10,
            $11,
            $12::numeric,
            $13::numeric,
            $14::uuid,
            $15,
            $16
          )
          RETURNING
            id::text AS id,
            organization_id::text AS organization_id,
            created_at,
            updated_at,
            coverage_alert_id::text AS coverage_alert_id,
            recommended_option_id::text AS recommended_option_id,
            chosen_option_id::text AS chosen_option_id,
            site_id,
            decision_date,
            shift::text AS shift,
            horizon::text AS horizon,
            gap_h,
            is_override,
            override_reason,
            override_category,
            exogenous_event_tag,
            recommendation_policy_version,
            cout_attendu_eur,
            service_attendu_pct,
            cout_observe_eur,
            service_observe_pct,
            decided_by::text AS decided_by,
            comment
        `,
        [
          input.organizationId,
          input.alertId,
          recommended?.id ?? null,
          chosen.id,
          alert.site_id,
          toIsoDateOnly(alert.alert_date),
          alert.shift,
          alert.horizon,
          toRequiredNumber(alert.gap_h),
          isOverride,
          isOverride ? notes : null,
          toNumber(chosen.cout_total_eur),
          toNumber(chosen.service_attendu_pct),
          input.decidedBy,
          notes,
          chosen.recommendation_policy_version ?? null,
        ],
      );

      const row = insertResult.rows[0];
      if (!row) {
        throw new PersistenceError(
          "Operational decision could not be created.",
          500,
          "OPERATIONAL_DECISION_CREATE_FAILED",
        );
      }

      await initializePersistentDecisionOpsRuntime(client, {
        organizationId: input.organizationId,
        recommendationId: row.id,
        siteId: alert.site_id,
        decisionDate: alert.alert_date,
        requestedAt: row.created_at,
        horizon: alert.horizon,
        gapHours: toRequiredNumber(alert.gap_h),
        predictedImpactEur: toNumber(alert.impact_eur),
        chosenOptionId: chosen.id,
        chosenOptionLabel: chosen.label,
        chosenOptionType: chosen.option_type,
        chosenCostEur: toRequiredNumber(chosen.cout_total_eur),
        chosenServicePct: toNumber(chosen.service_attendu_pct),
        requestedByActorId: input.decidedBy,
        requestedByActorRole: input.decidedByRole ?? null,
        notes,
      });

      return mapOperationalDecisionRow(row);
    } catch (error) {
      throw mapPersistenceError(
        error,
        "OPERATIONAL_DECISION_ERROR",
        "Operational decision persistence failed.",
      );
    }
  });
}
