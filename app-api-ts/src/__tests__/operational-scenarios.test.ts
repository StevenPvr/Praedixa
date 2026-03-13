import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/operational-data.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../services/operational-data.js")>();
  return {
    ...actual,
    resolvePersistentCoverageAlert: vi.fn(),
  };
});

vi.mock("../services/persistence.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../services/persistence.js")>();
  return {
    ...actual,
    queryRows: vi.fn(),
  };
});

import {
  getPersistentDecisionWorkspace,
  getPersistentParetoFrontierForAlert,
  listPersistentScenarioOptionsForAlert,
} from "../services/operational-scenarios.js";
import { resolvePersistentCoverageAlert } from "../services/operational-data.js";
import { queryRows } from "../services/persistence.js";

const ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";
const ALERT_ID = "22222222-2222-4222-8222-222222222222";

const mockedResolvePersistentCoverageAlert = vi.mocked(
  resolvePersistentCoverageAlert,
);
const mockedQueryRows = vi.mocked(queryRows);

function buildScope() {
  return {
    orgWide: false,
    accessibleSiteIds: ["site-lyon"],
    requestedSiteId: null,
  };
}

describe("operational scenarios persistence helpers", () => {
  beforeEach(() => {
    mockedResolvePersistentCoverageAlert.mockReset();
    mockedQueryRows.mockReset();
  });

  it("lists persisted scenario options for an accessible alert", async () => {
    mockedResolvePersistentCoverageAlert.mockResolvedValue({
      id: ALERT_ID,
      organizationId: ORGANIZATION_ID,
      siteId: "site-lyon",
      alertDate: "2026-03-13",
      shift: "am",
      horizon: "j7",
      pRupture: 0.82,
      gapH: 6,
      driversJson: ["absence", "understaffing"],
      severity: "high",
      status: "open",
      createdAt: "2026-03-13T08:00:00.000Z",
      updatedAt: "2026-03-13T08:00:00.000Z",
    });
    mockedQueryRows.mockResolvedValue([
      {
        id: "scenario-1",
        organization_id: ORGANIZATION_ID,
        coverage_alert_id: ALERT_ID,
        cost_parameter_id: "33333333-3333-4333-8333-333333333333",
        option_type: "hs",
        label: "Heures sup",
        cout_total_eur: "420.50",
        service_attendu_pct: "0.9300",
        heures_couvertes: "5.5",
        feasibility_score: "0.88",
        risk_score: "0.21",
        policy_compliance: true,
        dominance_reason: null,
        recommendation_policy_version: "policy-v2",
        is_pareto_optimal: true,
        is_recommended: true,
        contraintes_json: { cap: "union" },
        created_at: "2026-03-13T08:10:00.000Z",
        updated_at: "2026-03-13T08:11:00.000Z",
      },
    ] as never);

    const result = await listPersistentScenarioOptionsForAlert({
      organizationId: ORGANIZATION_ID,
      alertId: ALERT_ID,
      scope: buildScope(),
    });

    expect(mockedResolvePersistentCoverageAlert).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      alertId: ALERT_ID,
      scope: buildScope(),
    });
    expect(mockedQueryRows).toHaveBeenCalledTimes(1);
    expect(mockedQueryRows.mock.calls[0]?.[0]).toContain(
      "FROM scenario_options so",
    );
    expect(mockedQueryRows.mock.calls[0]?.[1]).toEqual([
      ORGANIZATION_ID,
      ALERT_ID,
    ]);
    expect(result).toEqual([
      expect.objectContaining({
        id: "scenario-1",
        organizationId: ORGANIZATION_ID,
        coverageAlertId: ALERT_ID,
        optionType: "hs",
        coutTotalEur: 420.5,
        serviceAttenduPct: 0.93,
        heuresCouvertes: 5.5,
        isParetoOptimal: true,
        isRecommended: true,
      }),
    ]);
  });

  it("builds a pareto frontier response with recommended option", async () => {
    mockedResolvePersistentCoverageAlert.mockResolvedValue({
      id: ALERT_ID,
      organizationId: ORGANIZATION_ID,
      siteId: "site-lyon",
      alertDate: "2026-03-13",
      shift: "am",
      horizon: "j7",
      pRupture: 0.82,
      gapH: 6,
      driversJson: ["absence"],
      severity: "high",
      status: "open",
      createdAt: "2026-03-13T08:00:00.000Z",
      updatedAt: "2026-03-13T08:00:00.000Z",
    });
    mockedQueryRows.mockResolvedValue([
      {
        id: "scenario-1",
        organization_id: ORGANIZATION_ID,
        coverage_alert_id: ALERT_ID,
        cost_parameter_id: "33333333-3333-4333-8333-333333333333",
        option_type: "hs",
        label: "Heures sup",
        cout_total_eur: "420.50",
        service_attendu_pct: "0.9300",
        heures_couvertes: "5.5",
        feasibility_score: null,
        risk_score: null,
        policy_compliance: true,
        dominance_reason: null,
        recommendation_policy_version: "policy-v2",
        is_pareto_optimal: true,
        is_recommended: true,
        contraintes_json: {},
        created_at: "2026-03-13T08:10:00.000Z",
        updated_at: "2026-03-13T08:11:00.000Z",
      },
      {
        id: "scenario-2",
        organization_id: ORGANIZATION_ID,
        coverage_alert_id: ALERT_ID,
        cost_parameter_id: "44444444-4444-4444-8444-444444444444",
        option_type: "interim",
        label: "Interim",
        cout_total_eur: "510.00",
        service_attendu_pct: "0.9600",
        heures_couvertes: "6.0",
        feasibility_score: "0.66",
        risk_score: "0.19",
        policy_compliance: false,
        dominance_reason: "costlier",
        recommendation_policy_version: "policy-v2",
        is_pareto_optimal: false,
        is_recommended: false,
        contraintes_json: {},
        created_at: "2026-03-13T08:12:00.000Z",
        updated_at: "2026-03-13T08:13:00.000Z",
      },
    ] as never);

    const result = await getPersistentParetoFrontierForAlert({
      organizationId: ORGANIZATION_ID,
      alertId: ALERT_ID,
      scope: buildScope(),
    });

    expect(result.alertId).toBe(ALERT_ID);
    expect(result.options).toHaveLength(2);
    expect(result.paretoFrontier).toHaveLength(1);
    expect(result.recommended?.id).toBe("scenario-1");
  });

  it("builds a decision workspace from persisted alert and options", async () => {
    mockedResolvePersistentCoverageAlert
      .mockResolvedValueOnce({
        id: ALERT_ID,
        organizationId: ORGANIZATION_ID,
        siteId: "site-lyon",
        alertDate: "2026-03-13",
        shift: "am",
        horizon: "j7",
        pRupture: 0.82,
        gapH: 6,
        driversJson: ["absence", "weather"],
        severity: "high",
        status: "open",
        createdAt: "2026-03-13T08:00:00.000Z",
        updatedAt: "2026-03-13T08:00:00.000Z",
      })
      .mockResolvedValueOnce({
        id: ALERT_ID,
        organizationId: ORGANIZATION_ID,
        siteId: "site-lyon",
        alertDate: "2026-03-13",
        shift: "am",
        horizon: "j7",
        pRupture: 0.82,
        gapH: 6,
        driversJson: ["absence", "weather"],
        severity: "high",
        status: "open",
        createdAt: "2026-03-13T08:00:00.000Z",
        updatedAt: "2026-03-13T08:00:00.000Z",
      });
    mockedQueryRows.mockResolvedValue([
      {
        id: "scenario-1",
        organization_id: ORGANIZATION_ID,
        coverage_alert_id: ALERT_ID,
        cost_parameter_id: "33333333-3333-4333-8333-333333333333",
        option_type: "hs",
        label: "Heures sup",
        cout_total_eur: "420.50",
        service_attendu_pct: "0.9300",
        heures_couvertes: "5.5",
        feasibility_score: "0.88",
        risk_score: "0.21",
        policy_compliance: true,
        dominance_reason: null,
        recommendation_policy_version: "policy-v2",
        is_pareto_optimal: true,
        is_recommended: true,
        contraintes_json: {},
        created_at: "2026-03-13T08:10:00.000Z",
        updated_at: "2026-03-13T08:11:00.000Z",
      },
    ] as never);

    const result = await getPersistentDecisionWorkspace({
      organizationId: ORGANIZATION_ID,
      alertId: ALERT_ID,
      scope: buildScope(),
    });

    expect(result.alert.id).toBe(ALERT_ID);
    expect(result.options).toHaveLength(1);
    expect(result.recommendedOptionId).toBe("scenario-1");
    expect(result.diagnostic).toEqual({
      topDrivers: ["absence", "weather"],
    });
  });
});
