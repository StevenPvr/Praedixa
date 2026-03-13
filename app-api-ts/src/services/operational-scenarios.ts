import type { QueryResultRow } from "pg";

import type {
  DecisionWorkspace,
  ParetoFrontierResponse,
  ScenarioOption,
} from "@praedixa/shared-types/domain";

import type { SiteAccessScope } from "./operational-data.js";
import { resolvePersistentCoverageAlert } from "./operational-data.js";
import {
  PersistenceError,
  isUuidString,
  queryRows,
  toIsoDateTime,
} from "./persistence.js";

interface DbScenarioOptionRow extends QueryResultRow {
  id: string;
  organization_id: string;
  coverage_alert_id: string;
  cost_parameter_id: string;
  option_type: string;
  label: string;
  cout_total_eur: string | number;
  service_attendu_pct: string | number;
  heures_couvertes: string | number;
  feasibility_score: string | number | null;
  risk_score: string | number | null;
  policy_compliance: boolean;
  dominance_reason: string | null;
  recommendation_policy_version: string | null;
  is_pareto_optimal: boolean;
  is_recommended: boolean;
  contraintes_json: Record<string, unknown> | null;
  created_at: Date | string;
  updated_at: Date | string;
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  return Number.parseFloat(value);
}

function assertIds(organizationId: string, alertId: string): void {
  if (!isUuidString(organizationId)) {
    throw new PersistenceError(
      "Organization id must be a UUID for live scenarios.",
      400,
      "INVALID_ORGANIZATION_ID",
    );
  }

  if (!isUuidString(alertId)) {
    throw new PersistenceError(
      "alertId must be a UUID.",
      400,
      "INVALID_ALERT_ID",
    );
  }
}

function mapScenarioOption(row: DbScenarioOptionRow): ScenarioOption {
  return {
    id: row.id,
    organizationId: row.organization_id,
    createdAt: toIsoDateTime(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIsoDateTime(row.updated_at) ?? new Date().toISOString(),
    coverageAlertId: row.coverage_alert_id,
    costParameterId: row.cost_parameter_id,
    optionType: row.option_type as ScenarioOption["optionType"],
    label: row.label,
    coutTotalEur: toNumber(row.cout_total_eur) ?? 0,
    serviceAttenduPct: toNumber(row.service_attendu_pct) ?? 0,
    heuresCouvertes: toNumber(row.heures_couvertes) ?? 0,
    feasibilityScore: toNumber(row.feasibility_score) ?? undefined,
    riskScore: toNumber(row.risk_score) ?? undefined,
    policyCompliance: row.policy_compliance,
    dominanceReason: row.dominance_reason ?? undefined,
    recommendationPolicyVersion: row.recommendation_policy_version ?? undefined,
    isParetoOptimal: row.is_pareto_optimal,
    isRecommended: row.is_recommended,
    contraintesJson:
      row.contraintes_json && !Array.isArray(row.contraintes_json)
        ? row.contraintes_json
        : {},
  };
}

export async function listPersistentScenarioOptionsForAlert(input: {
  organizationId: string;
  alertId: string;
  scope: SiteAccessScope;
}): Promise<ScenarioOption[]> {
  assertIds(input.organizationId, input.alertId);

  await resolvePersistentCoverageAlert({
    organizationId: input.organizationId,
    alertId: input.alertId,
    scope: input.scope,
  });

  const rows = await queryRows<DbScenarioOptionRow>(
    `
      SELECT
        so.id::text AS id,
        so.organization_id::text AS organization_id,
        so.coverage_alert_id::text AS coverage_alert_id,
        so.cost_parameter_id::text AS cost_parameter_id,
        so.option_type::text AS option_type,
        so.label,
        so.cout_total_eur,
        so.service_attendu_pct,
        so.heures_couvertes,
        so.feasibility_score,
        so.risk_score,
        so.policy_compliance,
        so.dominance_reason,
        so.recommendation_policy_version,
        so.is_pareto_optimal,
        so.is_recommended,
        so.contraintes_json,
        so.created_at,
        so.updated_at
      FROM scenario_options so
      WHERE so.organization_id = $1::uuid
        AND so.coverage_alert_id = $2::uuid
      ORDER BY
        so.is_recommended DESC,
        so.is_pareto_optimal DESC,
        so.cout_total_eur ASC,
        so.service_attendu_pct DESC,
        so.created_at ASC,
        so.id ASC
    `,
    [input.organizationId, input.alertId],
  );

  return rows.map(mapScenarioOption);
}

export async function getPersistentParetoFrontierForAlert(input: {
  organizationId: string;
  alertId: string;
  scope: SiteAccessScope;
}): Promise<ParetoFrontierResponse> {
  const options = await listPersistentScenarioOptionsForAlert(input);

  return {
    alertId: input.alertId,
    options,
    paretoFrontier: options.filter((option) => option.isParetoOptimal),
    recommended: options.find((option) => option.isRecommended) ?? null,
  };
}

export async function getPersistentDecisionWorkspace(input: {
  organizationId: string;
  alertId: string;
  scope: SiteAccessScope;
}): Promise<DecisionWorkspace> {
  const [alert, pareto] = await Promise.all([
    resolvePersistentCoverageAlert({
      organizationId: input.organizationId,
      alertId: input.alertId,
      scope: input.scope,
    }),
    getPersistentParetoFrontierForAlert(input),
  ]);

  return {
    alert,
    options: pareto.options,
    recommendedOptionId: pareto.recommended?.id ?? null,
    diagnostic: {
      topDrivers: alert.driversJson,
    },
  };
}
