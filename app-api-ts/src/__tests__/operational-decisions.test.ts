import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/decisionops-runtime.js", () => ({
  initializePersistentDecisionOpsRuntime: vi.fn(),
}));

vi.mock("../services/persistence.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../services/persistence.js")>();
  return {
    ...actual,
    queryRows: vi.fn(),
    withTransaction: vi.fn(),
  };
});

import {
  createPersistentOperationalDecision,
  getPersistentOperationalDecisionOverrideStats,
  listPersistentOperationalDecisions,
} from "../services/operational-decisions.js";
import {
  PersistenceError,
  queryRows,
  withTransaction,
} from "../services/persistence.js";
import { initializePersistentDecisionOpsRuntime } from "../services/decisionops-runtime.js";

const ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";
const ALERT_ID = "22222222-2222-4222-8222-222222222222";
const RECOMMENDED_OPTION_ID = "33333333-3333-4333-8333-333333333333";
const CHOSEN_OPTION_ID = "44444444-4444-4444-8444-444444444444";
const USER_ID = "55555555-5555-4555-8555-555555555555";

const mockedQueryRows = vi.mocked(queryRows);
const mockedWithTransaction = vi.mocked(withTransaction);
const mockedInitializePersistentDecisionOpsRuntime = vi.mocked(
  initializePersistentDecisionOpsRuntime,
);

function buildScope(requestedSiteId: string | null = "site-lyon") {
  return {
    orgWide: false,
    accessibleSiteIds: ["site-lyon", "site-paris"],
    requestedSiteId,
  };
}

function buildFakeClient(query: ReturnType<typeof vi.fn>): PoolClient {
  return { query } as unknown as PoolClient;
}

describe("operational decisions persistence helpers", () => {
  beforeEach(() => {
    mockedQueryRows.mockReset();
    mockedWithTransaction.mockReset();
    mockedInitializePersistentDecisionOpsRuntime.mockReset();
  });

  it("lists persisted operational decisions with scoped filters and pagination", async () => {
    mockedQueryRows
      .mockResolvedValueOnce([{ count: "1" }] as never)
      .mockResolvedValueOnce([
        {
          id: "decision-1",
          organization_id: ORGANIZATION_ID,
          created_at: "2026-03-13T09:00:00.000Z",
          updated_at: "2026-03-13T09:05:00.000Z",
          coverage_alert_id: ALERT_ID,
          recommended_option_id: RECOMMENDED_OPTION_ID,
          chosen_option_id: CHOSEN_OPTION_ID,
          site_id: "site-lyon",
          decision_date: "2026-03-13",
          shift: "am",
          horizon: "j7",
          gap_h: "6.5",
          is_override: true,
          override_reason: "Terrain constraints",
          override_category: "terrain",
          exogenous_event_tag: null,
          recommendation_policy_version: "policy-v1",
          cout_attendu_eur: "340.50",
          service_attendu_pct: "0.9200",
          cout_observe_eur: "380.50",
          service_observe_pct: "0.9100",
          decided_by: USER_ID,
          comment: "Need extra operator on site",
        },
      ] as never);

    const result = await listPersistentOperationalDecisions({
      organizationId: ORGANIZATION_ID,
      scope: buildScope(),
      dateFrom: "2026-03-01",
      dateTo: "2026-03-31",
      isOverride: true,
      horizon: "J7",
      page: 2,
      pageSize: 25,
    });

    expect(mockedQueryRows).toHaveBeenCalledTimes(2);

    const [countSql, countValues] = mockedQueryRows.mock.calls[0] ?? [];
    expect(countSql).toContain("SELECT COUNT(*)::bigint AS count");
    expect(countSql).toContain("od.site_id = $2");
    expect(countSql).toContain("od.decision_date >= $3::date");
    expect(countSql).toContain("od.decision_date <= $4::date");
    expect(countSql).toContain("od.is_override = $5");
    expect(countSql).toContain("od.horizon::text = $6");
    expect(countValues).toEqual([
      ORGANIZATION_ID,
      "site-lyon",
      "2026-03-01",
      "2026-03-31",
      true,
      "j7",
    ]);

    const [rowsSql, rowValues] = mockedQueryRows.mock.calls[1] ?? [];
    expect(rowsSql).toContain("ORDER BY od.decision_date DESC");
    expect(rowsSql).toContain("OFFSET $7::int");
    expect(rowsSql).toContain("LIMIT $8::int");
    expect(rowValues).toEqual([
      ORGANIZATION_ID,
      "site-lyon",
      "2026-03-01",
      "2026-03-31",
      true,
      "j7",
      25,
      25,
    ]);

    expect(result).toEqual({
      total: 1,
      items: [
        expect.objectContaining({
          id: "decision-1",
          organizationId: ORGANIZATION_ID,
          isOverride: true,
          gapH: 6.5,
          overrideReason: "Terrain constraints",
          recommendationPolicyVersion: "policy-v1",
          decidedBy: USER_ID,
        }),
      ],
    });
  });

  it("rejects invalid date filters before querying the database", async () => {
    await expect(
      listPersistentOperationalDecisions({
        organizationId: ORGANIZATION_ID,
        scope: buildScope(),
        dateFrom: "2026-02-31",
        page: 1,
        pageSize: 20,
      }),
    ).rejects.toMatchObject({
      code: "INVALID_DATE_FROM",
      statusCode: 400,
    } satisfies Partial<PersistenceError>);

    expect(mockedQueryRows).not.toHaveBeenCalled();
  });

  it("computes override statistics from persisted decisions", async () => {
    mockedQueryRows
      .mockResolvedValueOnce([{ count: "10" }] as never)
      .mockResolvedValueOnce([{ count: "4" }] as never)
      .mockResolvedValueOnce([
        { reason: "Safety margin", count: "2" },
        { reason: "Local event", count: "1" },
      ] as never)
      .mockResolvedValueOnce([{ avg_cost_delta: "42.125" }] as never);

    const result = await getPersistentOperationalDecisionOverrideStats({
      organizationId: ORGANIZATION_ID,
      scope: buildScope(null),
    });

    expect(mockedQueryRows).toHaveBeenCalledTimes(4);
    expect(result).toEqual({
      totalDecisions: 10,
      overrideCount: 4,
      overridePct: 40,
      topOverrideReasons: [
        { reason: "Safety margin", count: 2 },
        { reason: "Local event", count: 1 },
      ],
      avgCostDelta: 42.13,
    });
  });

  it("creates an operational decision from persisted alert context", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            id: ALERT_ID,
            site_id: "site-lyon",
            alert_date: "2026-03-13",
            shift: "am",
            horizon: "j7",
            gap_h: "4.5",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: RECOMMENDED_OPTION_ID,
            coverage_alert_id: ALERT_ID,
            is_recommended: true,
            cout_total_eur: "320.00",
            service_attendu_pct: "0.9400",
            recommendation_policy_version: "policy-v2",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "decision-1",
            organization_id: ORGANIZATION_ID,
            created_at: "2026-03-13T09:00:00.000Z",
            updated_at: "2026-03-13T09:00:00.000Z",
            coverage_alert_id: ALERT_ID,
            recommended_option_id: RECOMMENDED_OPTION_ID,
            chosen_option_id: RECOMMENDED_OPTION_ID,
            site_id: "site-lyon",
            decision_date: "2026-03-13",
            shift: "am",
            horizon: "j7",
            gap_h: "4.5",
            is_override: false,
            override_reason: null,
            override_category: null,
            exogenous_event_tag: null,
            recommendation_policy_version: "policy-v2",
            cout_attendu_eur: "320.00",
            service_attendu_pct: "0.9400",
            cout_observe_eur: null,
            service_observe_pct: null,
            decided_by: USER_ID,
            comment: "Validated with recommended option",
          },
        ],
      });

    mockedWithTransaction.mockImplementation(async (fn) =>
      fn(buildFakeClient(query)),
    );
    mockedInitializePersistentDecisionOpsRuntime.mockResolvedValue(undefined);

    const result = await createPersistentOperationalDecision({
      organizationId: ORGANIZATION_ID,
      scope: buildScope(),
      alertId: ALERT_ID,
      notes: "Validated with recommended option",
      decidedBy: USER_ID,
    });

    expect(mockedWithTransaction).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(3);
    expect(mockedInitializePersistentDecisionOpsRuntime).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        organizationId: ORGANIZATION_ID,
        recommendationId: "decision-1",
        chosenOptionId: RECOMMENDED_OPTION_ID,
        requestedByActorId: USER_ID,
      }),
    );
    expect(query.mock.calls[0]?.[0]).toContain("FROM coverage_alerts ca");
    expect(query.mock.calls[1]?.[0]).toContain("FROM scenario_options so");
    expect(query.mock.calls[2]?.[0]).toContain(
      "INSERT INTO operational_decisions",
    );
    expect(query.mock.calls[2]?.[1]).toEqual([
      ORGANIZATION_ID,
      ALERT_ID,
      RECOMMENDED_OPTION_ID,
      RECOMMENDED_OPTION_ID,
      "site-lyon",
      "2026-03-13",
      "am",
      "j7",
      4.5,
      false,
      null,
      320,
      0.94,
      USER_ID,
      "Validated with recommended option",
      "policy-v2",
    ]);
    expect(result).toMatchObject({
      id: "decision-1",
      organizationId: ORGANIZATION_ID,
      isOverride: false,
      chosenOptionId: RECOMMENDED_OPTION_ID,
    });
  });

  it("requires notes when overriding the recommended option", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            id: ALERT_ID,
            site_id: "site-lyon",
            alert_date: "2026-03-13",
            shift: "am",
            horizon: "j7",
            gap_h: "4.5",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: RECOMMENDED_OPTION_ID,
            coverage_alert_id: ALERT_ID,
            is_recommended: true,
            cout_total_eur: "320.00",
            service_attendu_pct: "0.9400",
            recommendation_policy_version: "policy-v2",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: CHOSEN_OPTION_ID,
            coverage_alert_id: ALERT_ID,
            is_recommended: false,
            cout_total_eur: "410.00",
            service_attendu_pct: "0.9100",
            recommendation_policy_version: "policy-v2",
          },
        ],
      });

    mockedWithTransaction.mockImplementation(async (fn) =>
      fn(buildFakeClient(query)),
    );

    await expect(
      createPersistentOperationalDecision({
        organizationId: ORGANIZATION_ID,
        scope: buildScope(),
        alertId: ALERT_ID,
        optionId: CHOSEN_OPTION_ID,
        decidedBy: USER_ID,
      }),
    ).rejects.toMatchObject({
      code: "OVERRIDE_REASON_REQUIRED",
      statusCode: 422,
    } satisfies Partial<PersistenceError>);

    expect(query).toHaveBeenCalledTimes(3);
  });
});
