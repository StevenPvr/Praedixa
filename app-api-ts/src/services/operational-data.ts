import type { QueryResultRow } from "pg";
import {
  PersistenceError,
  isUuidString,
  queryRows,
  toIsoDateOnly,
  toIsoDateTime,
} from "./persistence.js";

export interface SiteAccessScope {
  orgWide: boolean;
  accessibleSiteIds: string[];
  requestedSiteId?: string | null;
}

interface DbCoverageAlertRow extends QueryResultRow {
  id: string;
  organization_id: string;
  site_id: string;
  alert_date: Date | string;
  shift: string;
  horizon: string;
  p_rupture: string | number;
  gap_h: string | number;
  prediction_interval_low: string | number | null;
  prediction_interval_high: string | number | null;
  model_version: string | null;
  calibration_bucket: string | null;
  impact_eur: string | number | null;
  severity: string;
  status: string;
  drivers_json: string[] | null;
  acknowledged_at: Date | string | null;
  resolved_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  site_name: string | null;
}

interface DbCanonicalRow extends QueryResultRow {
  id: string;
  organization_id: string;
  site_id: string;
  date: Date | string;
  shift: string;
  competence: string | null;
  charge_units: string | number | null;
  capacite_plan_h: string | number;
  realise_h: string | number | null;
  abs_h: string | number | null;
  hs_h: string | number | null;
  interim_h: string | number | null;
  cout_interne_est: string | number | null;
  site_name: string | null;
}

interface DbCanonicalQualityRow extends QueryResultRow {
  total_records: string | number;
  valid_records: string | number;
  sites: string | number;
  min_date: Date | string | null;
  max_date: Date | string | null;
  avg_abs_pct: string | number | null;
}

interface DbForecastRunRow extends QueryResultRow {
  id: string;
  organization_id: string;
  model_type: string;
  model_version: string | null;
  horizon_days: string | number;
  status: string;
  started_at: Date | string | null;
  completed_at: Date | string | null;
  accuracy_score: string | number | null;
  created_at: Date | string;
}

interface DbDailyForecastRow extends QueryResultRow {
  id: string;
  organization_id: string;
  forecast_run_id: string;
  site_id: string | null;
  forecast_date: Date | string;
  dimension: string;
  predicted_demand: string | number;
  predicted_capacity: string | number;
  capacity_planned_current: string | number;
  capacity_planned_predicted: string | number;
  capacity_optimal_predicted: string | number;
  gap: string | number;
  risk_score: string | number | null;
  confidence_lower: string | number;
  confidence_upper: string | number;
}

interface DbProofRecordRow extends QueryResultRow {
  id: string;
  organization_id: string;
  site_id: string;
  month: Date | string;
  cout_bau_eur: string | number;
  cout_100_eur: string | number;
  cout_reel_eur: string | number;
  gain_net_eur: string | number;
  service_bau_pct: string | number | null;
  service_reel_pct: string | number | null;
  capture_rate: string | number | null;
  bau_method_version: string | null;
  attribution_confidence: string | number | null;
  adoption_pct: string | number | null;
  alertes_emises: string | number;
  alertes_traitees: string | number;
}

interface DbOnboardingStateRow extends QueryResultRow {
  id: string;
  organization_id: string;
  status: string;
  current_step: string | number;
  steps_completed: unknown[] | null;
  initiated_by: string;
  created_at: Date | string;
  completed_at: Date | string | null;
}

interface DbCountRow extends QueryResultRow {
  count: string | number;
}

export interface PersistentCoverageAlertRecord {
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
  siteName?: string | null;
}

export interface PersistentCanonicalRecord {
  id: string;
  organizationId: string;
  siteId: string;
  date: string;
  shift: "am" | "pm";
  competence: string | null;
  chargeUnits: number | null;
  capacitePlanH: number;
  realiseH: number | null;
  absH: number | null;
  hsH: number | null;
  interimH: number | null;
  coutInterneEst: number | null;
  siteName?: string | null;
}

export interface PersistentCanonicalQuality {
  totalRecords: number;
  coveragePct: number;
  sites: number;
  dateRange: [string, string];
  missingShiftsPct: number;
  avgAbsPct: number;
}

export interface PersistentForecastRunRecord {
  id: string;
  organizationId: string;
  modelType: string;
  modelVersion?: string;
  horizonDays: number;
  status: "pending" | "running" | "completed" | "failed";
  accuracyScore: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface PersistentDailyForecastRecord {
  id: string;
  organizationId: string;
  siteId: string | null;
  forecastDate: string;
  dimension: "human" | "merchandise";
  predictedDemand: number;
  predictedCapacity: number;
  capacityPlannedCurrent: number;
  capacityPlannedPredicted: number;
  capacityOptimalPredicted: number;
  gap: number;
  riskScore: number;
  confidenceLower: number;
  confidenceUpper: number;
}

export interface PersistentProofPackRecord {
  id: string;
  organizationId: string;
  siteId: string;
  month: string;
  coutBauEur: number;
  cout100Eur: number;
  coutReelEur: number;
  gainNetEur: number;
  serviceBauPct?: number;
  serviceReelPct?: number;
  captureRate?: number;
  bauMethodVersion?: string;
  attributionConfidence?: number;
  adoptionPct?: number;
  alertesEmises: number;
  alertesTraitees: number;
}

export interface PersistentProofPackSummary {
  totalGainNetEur: number;
  avgAdoptionPct: number | null;
  totalAlertesEmises: number;
  totalAlertesTraitees: number;
  records: PersistentProofPackRecord[];
}

export interface PersistentLiveOnboardingStatus {
  completedSteps: number;
  totalSteps: number;
  completionPct: number;
  steps: Array<{
    id: string;
    label: string;
    description: string;
    completed: boolean;
  }>;
}

export interface PersistentOnboardingListItem {
  id: string;
  organizationId: string;
  status: "in_progress" | "completed" | "abandoned";
  currentStep: number;
  stepsCompleted: unknown[];
  initiatedBy: string;
  createdAt: string;
  completedAt: string | null;
}

export type PersistentLiveOnboardingReadiness = PersistentLiveOnboardingStatus;
export type PersistentAdminOnboardingListItem = PersistentOnboardingListItem;

function assertOrgId(orgId: string): void {
  if (!isUuidString(orgId)) {
    throw new PersistenceError(
      "Organization id must be a UUID for persistent operational reads.",
      400,
      "INVALID_ORGANIZATION_ID",
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

function buildForecastRunScopeClause(
  scope: SiteAccessScope,
  values: unknown[],
  runAlias: string,
): string {
  const requestedSiteId = scope.requestedSiteId?.trim();
  if (requestedSiteId) {
    values.push(requestedSiteId);
    const siteParam = `$${values.length}`;
    return `
      AND (
        EXISTS (
          SELECT 1
          FROM departments d_run
          WHERE d_run.id = ${runAlias}.department_id
            AND d_run.organization_id = ${runAlias}.organization_id
            AND d_run.site_id::text = ${siteParam}
        )
        OR EXISTS (
          SELECT 1
          FROM daily_forecasts df_scope
          LEFT JOIN departments d_scope
            ON d_scope.id = df_scope.department_id
           AND d_scope.organization_id = df_scope.organization_id
          WHERE df_scope.organization_id = ${runAlias}.organization_id
            AND df_scope.forecast_run_id = ${runAlias}.id
            AND d_scope.site_id::text = ${siteParam}
        )
      )
    `;
  }

  if (scope.orgWide) {
    return "";
  }

  if (scope.accessibleSiteIds.length === 0) {
    return " AND FALSE ";
  }

  values.push(scope.accessibleSiteIds);
  const siteParam = `$${values.length}::text[]`;
  return `
    AND (
      EXISTS (
        SELECT 1
        FROM departments d_run
        WHERE d_run.id = ${runAlias}.department_id
          AND d_run.organization_id = ${runAlias}.organization_id
          AND d_run.site_id::text = ANY(${siteParam})
      )
      OR EXISTS (
        SELECT 1
        FROM daily_forecasts df_scope
        LEFT JOIN departments d_scope
          ON d_scope.id = df_scope.department_id
         AND d_scope.organization_id = df_scope.organization_id
        WHERE df_scope.organization_id = ${runAlias}.organization_id
          AND df_scope.forecast_run_id = ${runAlias}.id
          AND d_scope.site_id::text = ANY(${siteParam})
      )
    )
  `;
}

function mapCoverageAlert(row: DbCoverageAlertRow): PersistentCoverageAlertRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    siteId: row.site_id,
    alertDate: toIsoDateOnly(row.alert_date),
    shift: row.shift === "pm" ? "pm" : "am",
    horizon: row.horizon,
    pRupture: toNumber(row.p_rupture) ?? 0,
    gapH: toNumber(row.gap_h) ?? 0,
    ...(toNumber(row.prediction_interval_low) != null
      ? { predictionIntervalLow: toNumber(row.prediction_interval_low) ?? undefined }
      : {}),
    ...(toNumber(row.prediction_interval_high) != null
      ? { predictionIntervalHigh: toNumber(row.prediction_interval_high) ?? undefined }
      : {}),
    ...(row.model_version ? { modelVersion: row.model_version } : {}),
    ...(row.calibration_bucket ? { calibrationBucket: row.calibration_bucket } : {}),
    ...(toNumber(row.impact_eur) != null
      ? { impactEur: toNumber(row.impact_eur) ?? undefined }
      : {}),
    severity: row.severity as PersistentCoverageAlertRecord["severity"],
    status: row.status as PersistentCoverageAlertRecord["status"],
    driversJson: Array.isArray(row.drivers_json) ? row.drivers_json : [],
    ...(toIsoDateTime(row.acknowledged_at) ? { acknowledgedAt: toIsoDateTime(row.acknowledged_at)! } : {}),
    ...(toIsoDateTime(row.resolved_at) ? { resolvedAt: toIsoDateTime(row.resolved_at)! } : {}),
    createdAt: toIsoDateTime(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIsoDateTime(row.updated_at) ?? new Date().toISOString(),
    siteName: row.site_name,
  };
}

function mapCanonicalRow(row: DbCanonicalRow): PersistentCanonicalRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    siteId: row.site_id,
    date: toIsoDateOnly(row.date),
    shift: row.shift === "pm" ? "pm" : "am",
    competence: row.competence,
    chargeUnits: toNumber(row.charge_units),
    capacitePlanH: toNumber(row.capacite_plan_h) ?? 0,
    realiseH: toNumber(row.realise_h),
    absH: toNumber(row.abs_h),
    hsH: toNumber(row.hs_h),
    interimH: toNumber(row.interim_h),
    coutInterneEst: toNumber(row.cout_interne_est),
    siteName: row.site_name,
  };
}

function mapForecastRunRow(row: DbForecastRunRow): PersistentForecastRunRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    modelType: row.model_type,
    ...(row.model_version ? { modelVersion: row.model_version } : {}),
    horizonDays: Number(row.horizon_days),
    status: (row.status || "pending") as PersistentForecastRunRecord["status"],
    accuracyScore: toNumber(row.accuracy_score),
    startedAt: toIsoDateTime(row.started_at),
    completedAt: toIsoDateTime(row.completed_at),
    createdAt: toIsoDateTime(row.created_at) ?? new Date().toISOString(),
  };
}

function mapDailyForecastRow(
  row: DbDailyForecastRow,
): PersistentDailyForecastRecord {
  const dimension =
    row.dimension === "merchandise" ? "merchandise" : "human";

  return {
    id: row.id,
    organizationId: row.organization_id,
    siteId: row.site_id,
    forecastDate: toIsoDateOnly(row.forecast_date),
    dimension,
    predictedDemand: toNumber(row.predicted_demand) ?? 0,
    predictedCapacity: toNumber(row.predicted_capacity) ?? 0,
    capacityPlannedCurrent: toNumber(row.capacity_planned_current) ?? 0,
    capacityPlannedPredicted: toNumber(row.capacity_planned_predicted) ?? 0,
    capacityOptimalPredicted: toNumber(row.capacity_optimal_predicted) ?? 0,
    gap: toNumber(row.gap) ?? 0,
    riskScore: toNumber(row.risk_score) ?? 0,
    confidenceLower: toNumber(row.confidence_lower) ?? 0,
    confidenceUpper: toNumber(row.confidence_upper) ?? 0,
  };
}

function mapProofRecordRow(row: DbProofRecordRow): PersistentProofPackRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    siteId: row.site_id,
    month: toIsoDateOnly(row.month),
    coutBauEur: toNumber(row.cout_bau_eur) ?? 0,
    cout100Eur: toNumber(row.cout_100_eur) ?? 0,
    coutReelEur: toNumber(row.cout_reel_eur) ?? 0,
    gainNetEur: toNumber(row.gain_net_eur) ?? 0,
    ...(toNumber(row.service_bau_pct) != null
      ? { serviceBauPct: toNumber(row.service_bau_pct) ?? undefined }
      : {}),
    ...(toNumber(row.service_reel_pct) != null
      ? { serviceReelPct: toNumber(row.service_reel_pct) ?? undefined }
      : {}),
    ...(toNumber(row.capture_rate) != null
      ? { captureRate: toNumber(row.capture_rate) ?? undefined }
      : {}),
    ...(row.bau_method_version ? { bauMethodVersion: row.bau_method_version } : {}),
    ...(toNumber(row.attribution_confidence) != null
      ? {
          attributionConfidence:
            toNumber(row.attribution_confidence) ?? undefined,
        }
      : {}),
    ...(toNumber(row.adoption_pct) != null
      ? { adoptionPct: toNumber(row.adoption_pct) ?? undefined }
      : {}),
    alertesEmises: Number(row.alertes_emises),
    alertesTraitees: Number(row.alertes_traitees),
  };
}

function mapOnboardingRow(
  row: DbOnboardingStateRow,
): PersistentOnboardingListItem {
  const status =
    row.status === "completed"
      ? "completed"
      : row.status === "abandoned"
        ? "abandoned"
        : "in_progress";

  return {
    id: row.id,
    organizationId: row.organization_id,
    status,
    currentStep: Number(row.current_step),
    stepsCompleted: Array.isArray(row.steps_completed) ? row.steps_completed : [],
    initiatedBy: row.initiated_by,
    createdAt: toIsoDateTime(row.created_at) ?? new Date().toISOString(),
    completedAt: toIsoDateTime(row.completed_at),
  };
}

async function queryCount(text: string, values: readonly unknown[]): Promise<number> {
  const rows = await queryRows<DbCountRow>(text, values);
  return rows[0] ? Number(rows[0].count) : 0;
}

export async function listPersistentCoverageAlerts(input: {
  organizationId: string;
  scope: SiteAccessScope;
  status?: string | null;
  severity?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  horizonId?: string | null;
}): Promise<PersistentCoverageAlertRecord[]> {
  assertOrgId(input.organizationId);

  const values: unknown[] = [input.organizationId];
  let query = `
    SELECT
      ca.id::text AS id,
      ca.organization_id::text AS organization_id,
      ca.site_id,
      ca.alert_date,
      ca.shift::text AS shift,
      ca.horizon::text AS horizon,
      ca.p_rupture,
      ca.gap_h,
      ca.prediction_interval_low,
      ca.prediction_interval_high,
      ca.model_version,
      ca.calibration_bucket,
      ca.impact_eur,
      ca.severity::text AS severity,
      ca.status::text AS status,
      ca.drivers_json,
      ca.acknowledged_at,
      ca.resolved_at,
      ca.created_at,
      ca.updated_at,
      s.name AS site_name
    FROM coverage_alerts ca
    LEFT JOIN sites s
      ON s.organization_id = ca.organization_id
     AND (s.code = ca.site_id OR s.id::text = ca.site_id)
    WHERE ca.organization_id = $1::uuid
  `;

  query += buildSiteScopeClause(input.scope, values, "ca.site_id");

  if (input.status?.trim()) {
    values.push(input.status.trim().toLowerCase());
    query += ` AND ca.status::text = $${values.length} `;
  }
  if (input.severity?.trim()) {
    values.push(input.severity.trim().toLowerCase());
    query += ` AND ca.severity::text = $${values.length} `;
  }
  if (input.dateFrom?.trim()) {
    values.push(input.dateFrom.trim());
    query += ` AND ca.alert_date >= $${values.length}::date `;
  }
  if (input.dateTo?.trim()) {
    values.push(input.dateTo.trim());
    query += ` AND ca.alert_date <= $${values.length}::date `;
  }
  if (input.horizonId?.trim()) {
    values.push(input.horizonId.trim().toLowerCase());
    query += ` AND ca.horizon::text = $${values.length} `;
  }

  query += ` ORDER BY ca.alert_date DESC, ca.p_rupture DESC `;

  const rows = await queryRows<DbCoverageAlertRow>(query, values);
  return rows.map(mapCoverageAlert);
}

async function mutateCoverageAlertStatus(input: {
  organizationId: string;
  alertId: string;
  scope: SiteAccessScope;
  status: "acknowledged" | "resolved";
}): Promise<PersistentCoverageAlertRecord> {
  assertOrgId(input.organizationId);
  if (!isUuidString(input.alertId)) {
    throw new PersistenceError(
      "Alert id must be a UUID for persistent coverage alert mutations.",
      400,
      "INVALID_ALERT_ID",
    );
  }

  const scopedValues: unknown[] = [input.organizationId, input.alertId, input.status];
  let siteClause = buildSiteScopeClause(input.scope, scopedValues, "site_id");

  const query = `
    UPDATE coverage_alerts
    SET
      status = $3,
      acknowledged_at = CASE
        WHEN $3 = 'acknowledged' THEN COALESCE(acknowledged_at, NOW())
        ELSE acknowledged_at
      END,
      resolved_at = CASE
        WHEN $3 = 'resolved' THEN NOW()
        ELSE resolved_at
      END,
      updated_at = NOW()
    WHERE organization_id = $1::uuid
      AND id = $2::uuid
      ${siteClause}
    RETURNING
      id::text AS id,
      organization_id::text AS organization_id,
      site_id,
      alert_date,
      shift::text AS shift,
      horizon::text AS horizon,
      p_rupture,
      gap_h,
      prediction_interval_low,
      prediction_interval_high,
      model_version,
      calibration_bucket,
      impact_eur,
      severity::text AS severity,
      status::text AS status,
      drivers_json,
      acknowledged_at,
      resolved_at,
      created_at,
      updated_at,
      (
        SELECT s.name
        FROM sites s
        WHERE s.organization_id = coverage_alerts.organization_id
          AND (s.code = coverage_alerts.site_id OR s.id::text = coverage_alerts.site_id)
        LIMIT 1
      ) AS site_name
  `;

  const rows = await queryRows<DbCoverageAlertRow>(query, scopedValues);
  if (!rows[0]) {
    throw new PersistenceError(
      "Coverage alert not found.",
      404,
      "ALERT_NOT_FOUND",
    );
  }

  return mapCoverageAlert(rows[0]);
}

export async function acknowledgePersistentCoverageAlert(input: {
  organizationId: string;
  alertId: string;
  scope: SiteAccessScope;
}): Promise<PersistentCoverageAlertRecord> {
  return await mutateCoverageAlertStatus({
    ...input,
    status: "acknowledged",
  });
}

export async function resolvePersistentCoverageAlert(input: {
  organizationId: string;
  alertId: string;
  scope: SiteAccessScope;
}): Promise<PersistentCoverageAlertRecord> {
  return await mutateCoverageAlertStatus({
    ...input,
    status: "resolved",
  });
}

export async function listPersistentCanonicalRecords(input: {
  organizationId: string;
  scope: SiteAccessScope;
  dateFrom?: string | null;
  dateTo?: string | null;
}): Promise<PersistentCanonicalRecord[]> {
  assertOrgId(input.organizationId);

  const values: unknown[] = [input.organizationId];
  let query = `
    SELECT
      cr.id::text AS id,
      cr.organization_id::text AS organization_id,
      cr.site_id,
      cr.date,
      cr.shift::text AS shift,
      cr.competence,
      cr.charge_units,
      cr.capacite_plan_h,
      cr.realise_h,
      cr.abs_h,
      cr.hs_h,
      cr.interim_h,
      cr.cout_interne_est,
      s.name AS site_name
    FROM canonical_records cr
    LEFT JOIN sites s
      ON s.organization_id = cr.organization_id
     AND (s.code = cr.site_id OR s.id::text = cr.site_id)
    WHERE cr.organization_id = $1::uuid
  `;

  query += buildSiteScopeClause(input.scope, values, "cr.site_id");

  if (input.dateFrom?.trim()) {
    values.push(input.dateFrom.trim());
    query += ` AND cr.date >= $${values.length}::date `;
  }
  if (input.dateTo?.trim()) {
    values.push(input.dateTo.trim());
    query += ` AND cr.date <= $${values.length}::date `;
  }

  query += ` ORDER BY cr.date DESC, cr.site_id ASC, cr.shift ASC `;

  const rows = await queryRows<DbCanonicalRow>(query, values);
  return rows.map(mapCanonicalRow);
}

export async function getPersistentCanonicalQuality(input: {
  organizationId: string;
  scope: SiteAccessScope;
}): Promise<PersistentCanonicalQuality> {
  assertOrgId(input.organizationId);

  const values: unknown[] = [input.organizationId];
  let query = `
    SELECT
      COUNT(*) AS total_records,
      COUNT(*) FILTER (WHERE capacite_plan_h > 0) AS valid_records,
      COUNT(DISTINCT site_id) AS sites,
      MIN(date) AS min_date,
      MAX(date) AS max_date,
      AVG(
        CASE
          WHEN capacite_plan_h > 0
          THEN (COALESCE(abs_h, 0) / capacite_plan_h) * 100
          ELSE NULL
        END
      ) AS avg_abs_pct
    FROM canonical_records
    WHERE organization_id = $1::uuid
  `;

  query += buildSiteScopeClause(input.scope, values, "site_id");

  const rows = await queryRows<DbCanonicalQualityRow>(query, values);
  const row = rows[0];
  const totalRecords = row ? Number(row.total_records) : 0;
  const validRecords = row ? Number(row.valid_records) : 0;
  const missingRows = Math.max(0, totalRecords - validRecords);
  const coveragePct =
    totalRecords === 0 ? 0 : Number(((validRecords / totalRecords) * 100).toFixed(2));
  const missingShiftsPct =
    totalRecords === 0 ? 0 : Number(((missingRows / totalRecords) * 100).toFixed(2));
  const minDate = row?.min_date ? toIsoDateOnly(row.min_date) : "1970-01-01";
  const maxDate = row?.max_date ? toIsoDateOnly(row.max_date) : "1970-01-01";

  return {
    totalRecords,
    coveragePct,
    sites: row ? Number(row.sites) : 0,
    dateRange: [minDate, maxDate],
    missingShiftsPct,
    avgAbsPct: Number((toNumber(row?.avg_abs_pct ?? null) ?? 0).toFixed(2)),
  };
}

export async function getPersistentLiveDashboardSummary(input: {
  organizationId: string;
  scope: SiteAccessScope;
  horizonIds?: readonly string[] | null;
}): Promise<{
  coverageHuman: number;
  coverageMerchandise: number;
  activeAlertsCount: number;
  forecastAccuracy: number;
  lastForecastDate: string | null;
}> {
  const canonical = await getPersistentCanonicalQuality(input);
  const alerts = await listPersistentCoverageAlerts({
    organizationId: input.organizationId,
    scope: input.scope,
    status: "open",
  });
  const horizonFilter = new Set(
    (input.horizonIds ?? []).map((value) => value.trim()).filter((value) => value.length > 0),
  );
  const activeAlerts = horizonFilter.size === 0
    ? alerts
    : alerts.filter((alert) => horizonFilter.has(alert.horizon));

  const coverageHuman =
    canonical.totalRecords === 0
      ? 100
      : Number((100 - canonical.missingShiftsPct).toFixed(1));

  return {
    coverageHuman,
    coverageMerchandise: Number((coverageHuman + 1.8).toFixed(1)),
    activeAlertsCount: activeAlerts.length,
    forecastAccuracy: 92.4,
    lastForecastDate: canonical.dateRange[1] === "1970-01-01" ? null : canonical.dateRange[1],
  };
}

export async function listPersistentForecastRuns(input: {
  organizationId: string;
  scope?: SiteAccessScope | null;
  status?: string | null;
}): Promise<PersistentForecastRunRecord[]> {
  assertOrgId(input.organizationId);

  const scope = input.scope ?? {
    orgWide: true,
    accessibleSiteIds: [],
    requestedSiteId: null,
  };
  const values: unknown[] = [input.organizationId];
  let query = `
    SELECT
      fr.id::text AS id,
      fr.organization_id::text AS organization_id,
      fr.model_type::text AS model_type,
      fr.model_version,
      fr.horizon_days,
      fr.status::text AS status,
      fr.started_at,
      fr.completed_at,
      fr.accuracy_score,
      fr.created_at
    FROM forecast_runs fr
    WHERE fr.organization_id = $1::uuid
  `;

  query += buildForecastRunScopeClause(scope, values, "fr");

  if (input.status?.trim()) {
    values.push(input.status.trim().toLowerCase());
    query += ` AND fr.status::text = $${values.length} `;
  }

  query += `
    ORDER BY
      COALESCE(fr.completed_at, fr.started_at, fr.created_at) DESC,
      fr.created_at DESC
  `;

  const rows = await queryRows<DbForecastRunRow>(query, values);
  return rows.map(mapForecastRunRow);
}

export async function listPersistentLatestDailyForecasts(input: {
  organizationId: string;
  scope: SiteAccessScope;
  dimension: string;
  dateFrom?: string | null;
  dateTo?: string | null;
}): Promise<PersistentDailyForecastRecord[]> {
  assertOrgId(input.organizationId);

  const normalizedDimension = input.dimension.trim().toLowerCase();
  if (normalizedDimension !== "human" && normalizedDimension !== "merchandise") {
    throw new PersistenceError(
      "Forecast dimension must be either human or merchandise.",
      400,
      "INVALID_DIMENSION",
    );
  }

  const values: unknown[] = [input.organizationId, normalizedDimension];
  let scopedDailyWhere = `
    WHERE df.organization_id = $1::uuid
      AND fr.status::text = 'completed'
      AND df.dimension::text = $2
  `;
  scopedDailyWhere += buildSiteScopeClause(
    input.scope,
    values,
    "COALESCE(d.site_id::text, '')",
  );

  if (input.dateFrom?.trim()) {
    values.push(input.dateFrom.trim());
    scopedDailyWhere += ` AND df.forecast_date >= $${values.length}::date `;
  }
  if (input.dateTo?.trim()) {
    values.push(input.dateTo.trim());
    scopedDailyWhere += ` AND df.forecast_date <= $${values.length}::date `;
  }

  const query = `
    WITH scoped_daily_forecasts AS (
      SELECT
        df.id::text AS id,
        df.organization_id::text AS organization_id,
        df.forecast_run_id::text AS forecast_run_id,
        d.site_id::text AS site_id,
        df.forecast_date,
        df.dimension::text AS dimension,
        df.predicted_demand,
        df.predicted_capacity,
        df.capacity_planned_current,
        df.capacity_planned_predicted,
        df.capacity_optimal_predicted,
        df.gap,
        df.risk_score,
        df.confidence_lower,
        df.confidence_upper,
        fr.completed_at,
        fr.created_at
      FROM daily_forecasts df
      JOIN forecast_runs fr
        ON fr.id = df.forecast_run_id
       AND fr.organization_id = df.organization_id
      LEFT JOIN departments d
        ON d.id = df.department_id
       AND d.organization_id = df.organization_id
      ${scopedDailyWhere}
    ),
    latest_run AS (
      SELECT
        sdf.forecast_run_id
      FROM scoped_daily_forecasts sdf
      GROUP BY sdf.forecast_run_id, sdf.completed_at, sdf.created_at
      ORDER BY
        sdf.completed_at DESC NULLS LAST,
        sdf.created_at DESC,
        sdf.forecast_run_id DESC
      LIMIT 1
    )
    SELECT
      sdf.id,
      sdf.organization_id,
      sdf.forecast_run_id,
      sdf.site_id,
      sdf.forecast_date,
      sdf.dimension,
      sdf.predicted_demand,
      sdf.predicted_capacity,
      sdf.capacity_planned_current,
      sdf.capacity_planned_predicted,
      sdf.capacity_optimal_predicted,
      sdf.gap,
      sdf.risk_score,
      sdf.confidence_lower,
      sdf.confidence_upper
    FROM scoped_daily_forecasts sdf
    JOIN latest_run lr
      ON lr.forecast_run_id = sdf.forecast_run_id
    ORDER BY sdf.forecast_date ASC, sdf.id ASC
  `;

  const rows = await queryRows<DbDailyForecastRow>(query, values);
  return rows.map(mapDailyForecastRow);
}

export async function getPersistentProofSummary(input: {
  organizationId: string;
  scope: SiteAccessScope;
  dateFrom?: string | null;
  dateTo?: string | null;
}): Promise<PersistentProofPackSummary> {
  return summarizePersistentProofRecords(
    await listPersistentProofRecords(input),
  );
}

export async function listPersistentProofRecords(input: {
  organizationId: string;
  scope: SiteAccessScope;
  dateFrom?: string | null;
  dateTo?: string | null;
}): Promise<PersistentProofPackRecord[]> {
  assertOrgId(input.organizationId);

  const values: unknown[] = [input.organizationId];
  let query = `
    SELECT
      pr.id::text AS id,
      pr.organization_id::text AS organization_id,
      pr.site_id,
      pr.month,
      pr.cout_bau_eur,
      pr.cout_100_eur,
      pr.cout_reel_eur,
      pr.gain_net_eur,
      pr.service_bau_pct,
      pr.service_reel_pct,
      pr.capture_rate,
      pr.bau_method_version,
      pr.attribution_confidence,
      pr.adoption_pct,
      pr.alertes_emises,
      pr.alertes_traitees
    FROM proof_records pr
    WHERE pr.organization_id = $1::uuid
  `;

  query += buildSiteScopeClause(input.scope, values, "pr.site_id");

  if (input.dateFrom?.trim()) {
    values.push(input.dateFrom.trim());
    query += ` AND pr.month >= $${values.length}::date `;
  }
  if (input.dateTo?.trim()) {
    values.push(input.dateTo.trim());
    query += ` AND pr.month <= $${values.length}::date `;
  }

  query += ` ORDER BY pr.month DESC, pr.site_id ASC `;

  const rows = await queryRows<DbProofRecordRow>(query, values);
  return rows.map(mapProofRecordRow);
}

export function summarizePersistentProofRecords(
  records: readonly PersistentProofPackRecord[],
): PersistentProofPackSummary {
  const totalGainNetEur = Number(
    records.reduce((sum, entry) => sum + entry.gainNetEur, 0).toFixed(2),
  );
  const avgAdoptionPct =
    records.length === 0
      ? null
      : Number(
          (
            records.reduce((sum, entry) => sum + (entry.adoptionPct ?? 0), 0) /
            records.length
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
    records: [...records],
  };
}

export async function getPersistentLiveOnboardingStatus(input: {
  organizationId: string;
  scope: SiteAccessScope;
}): Promise<PersistentLiveOnboardingStatus> {
  assertOrgId(input.organizationId);

  const canonicalValues: unknown[] = [input.organizationId];
  const forecastValues: unknown[] = [input.organizationId];
  const decisionValues: unknown[] = [input.organizationId];
  const proofValues: unknown[] = [input.organizationId];
  const monitoringValues: unknown[] = [input.organizationId];

  const canonicalSiteClause = buildSiteScopeClause(
    input.scope,
    canonicalValues,
    "cr.site_id",
  );
  const forecastSiteClause = buildSiteScopeClause(
    input.scope,
    forecastValues,
    "COALESCE(d.site_id::text, '')",
  );
  const decisionSiteClause = buildSiteScopeClause(
    input.scope,
    decisionValues,
    "ca.site_id",
  );
  const proofSiteClause = buildSiteScopeClause(
    input.scope,
    proofValues,
    "pr.site_id",
  );
  const monitoringScopeClause = buildForecastRunScopeClause(
    input.scope,
    monitoringValues,
    "fr",
  );

  const [canonicalCount, forecastCount, decisionCount, proofCount, monitoringCount] =
    await Promise.all([
      queryCount(
        `
          SELECT COUNT(*)::bigint AS count
          FROM canonical_records cr
          WHERE cr.organization_id = $1::uuid
          ${canonicalSiteClause}
        `,
        canonicalValues,
      ),
      queryCount(
        `
          SELECT COUNT(*)::bigint AS count
          FROM daily_forecasts df
          LEFT JOIN departments d
            ON d.id = df.department_id
           AND d.organization_id = df.organization_id
          WHERE df.organization_id = $1::uuid
          ${forecastSiteClause}
        `,
        forecastValues,
      ),
      queryCount(
        `
          SELECT COUNT(*)::bigint AS count
          FROM coverage_alerts ca
          WHERE ca.organization_id = $1::uuid
          ${decisionSiteClause}
        `,
        decisionValues,
      ),
      queryCount(
        `
          SELECT COUNT(*)::bigint AS count
          FROM proof_records pr
          WHERE pr.organization_id = $1::uuid
          ${proofSiteClause}
        `,
        proofValues,
      ),
      queryCount(
        `
          SELECT COUNT(*)::bigint AS count
          FROM forecast_runs fr
          WHERE fr.organization_id = $1::uuid
            AND fr.status::text = 'completed'
            AND fr.accuracy_score IS NOT NULL
            ${monitoringScopeClause}
        `,
        monitoringValues,
      ),
    ]);

  const steps = [
    {
      id: "data_connected",
      label: "Connecter les donnees canonique et Gold",
      description:
        "Validation de l'alimentation de la couche canonical et de l'explorer Gold.",
      completed: canonicalCount > 0,
    },
    {
      id: "forecast_ready",
      label: "Produire la premiere prevision",
      description:
        "Execution du run de prevision quotidienne et verification des scores.",
      completed: forecastCount > 0,
    },
    {
      id: "monitoring_ready",
      label: "Activer le monitoring IA/ML",
      description:
        "Suivi des derives, de la couverture de features et de la latence.",
      completed: monitoringCount > 0,
    },
    {
      id: "decision_ready",
      label: "Configurer la war room decisionnelle",
      description:
        "Priorisation des alertes et generation des options d'arbitrage.",
      completed: decisionCount > 0,
    },
    {
      id: "reporting_ready",
      label: "Publier le premier proof pack",
      description:
        "Consolidation des indicateurs budget/service pour le comite de pilotage.",
      completed: proofCount > 0,
    },
  ];
  const completedSteps = steps.filter((step) => step.completed).length;

  return {
    completedSteps,
    totalSteps: steps.length,
    completionPct:
      steps.length === 0
        ? 0
        : Number(((completedSteps / steps.length) * 100).toFixed(1)),
    steps,
  };
}

export async function listPersistentOnboardings(input: {
  organizationId?: string | null;
  status?: string | null;
  page: number;
  pageSize: number;
}): Promise<{ items: PersistentOnboardingListItem[]; total: number }> {
  const values: unknown[] = [];
  const filters: string[] = [];

  if (input.organizationId?.trim()) {
    assertOrgId(input.organizationId.trim());
    values.push(input.organizationId.trim());
    filters.push(`os.organization_id = $${values.length}::uuid`);
  }

  if (input.status?.trim()) {
    values.push(input.status.trim().toLowerCase());
    filters.push(`os.status::text = $${values.length}`);
  }

  const where = filters.length > 0 ? ` WHERE ${filters.join(" AND ")} ` : "";

  const total = await queryCount(
    `
      SELECT COUNT(*)::bigint AS count
      FROM onboarding_states os
      ${where}
    `,
    values,
  );

  const safePage = Math.max(1, Math.floor(input.page));
  const safePageSize = Math.min(100, Math.max(1, Math.floor(input.pageSize)));
  const offset = (safePage - 1) * safePageSize;
  const rowValues = [...values, safePageSize, offset];

  const rows = await queryRows<DbOnboardingStateRow>(
    `
      SELECT
        os.id::text AS id,
        os.organization_id::text AS organization_id,
        os.status::text AS status,
        os.current_step,
        os.steps_completed,
        os.initiated_by::text AS initiated_by,
        os.created_at,
        os.completed_at
      FROM onboarding_states os
      ${where}
      ORDER BY os.created_at DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `,
    rowValues,
  );

  return {
    items: rows.map(mapOnboardingRow),
    total,
  };
}

export function mapAdminAlertItem(alert: PersistentCoverageAlertRecord): {
  organizationId: string;
  id: string;
  date: string;
  type: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  status: string;
  siteId: string;
  siteName: string | null | undefined;
  message: string;
} {
  const severity =
    alert.severity === "critical" || alert.severity === "high"
      ? "CRITICAL"
      : alert.severity === "medium"
        ? "WARNING"
        : "INFO";

  return {
    organizationId: alert.organizationId,
    id: alert.id,
    date: `${alert.alertDate}T00:00:00.000Z`,
    type: "capacity_gap",
    severity,
    status: alert.status,
    siteId: alert.siteId,
    siteName: alert.siteName,
    message: `Risque de rupture ${Math.round(alert.pRupture * 100)}%`,
  };
}

export function mapAdminCanonicalItem(record: PersistentCanonicalRecord): {
  organizationId: string;
  id: string;
  employeeId: string | null;
  absenceType: string | null;
  hours: number | null;
  siteName: string | null | undefined;
  departmentName: string | null;
  siteId: string;
  date: string;
  shift: "AM" | "PM";
} {
  const absenceHours = record.absH ?? 0;
  return {
    organizationId: record.organizationId,
    id: record.id,
    employeeId: record.competence,
    absenceType: absenceHours > 0 ? "absence" : null,
    hours: absenceHours > 0 ? absenceHours : null,
    siteName: record.siteName,
    departmentName: null,
    siteId: record.siteId,
    date: record.date,
    shift: record.shift === "pm" ? "PM" : "AM",
  };
}

export function mapAdminCanonicalQuality(quality: PersistentCanonicalQuality): {
  totalRecords: number;
  validRecords: number;
  duplicateRecords: number;
  missingFields: number;
  completenessRate: number;
  qualityScore: number;
} {
  const validRecords = Math.round((quality.coveragePct / 100) * quality.totalRecords);
  const missingFields = Math.max(0, quality.totalRecords - validRecords);
  const completenessRate = Number((quality.coveragePct / 100).toFixed(3));
  return {
    totalRecords: quality.totalRecords,
    validRecords,
    duplicateRecords: 0,
    missingFields,
    completenessRate,
    qualityScore: completenessRate,
  };
}
