import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/persistence.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../services/persistence.js")>();
  return {
    ...actual,
    queryRows: vi.fn(),
  };
});

import {
  listPersistentLatestDailyForecasts,
  listPersistentOnboardings,
  listPersistentProofRecords,
  summarizePersistentProofRecords,
} from "../services/operational-data.js";
import { queryRows } from "../services/persistence.js";

const ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";
const mockedQueryRows = vi.mocked(queryRows);

describe("operational data persistence helpers", () => {
  beforeEach(() => {
    mockedQueryRows.mockReset();
  });

  it("scopes latest daily forecasts by organization and requested site", async () => {
    mockedQueryRows.mockResolvedValueOnce([
      {
        id: "df-1",
        organization_id: ORGANIZATION_ID,
        site_id: "site-lyon",
        forecast_date: "2026-03-07",
        dimension: "human",
        predicted_demand: "120.5",
        predicted_capacity: "112.0",
        capacity_planned_current: "110.0",
        capacity_planned_predicted: "114.0",
        capacity_optimal_predicted: "118.0",
        gap: "8.5",
        risk_score: "0.24",
        confidence_lower: "118.0",
        confidence_upper: "123.0",
      },
    ] as never);

    const result = await listPersistentLatestDailyForecasts({
      organizationId: ORGANIZATION_ID,
      scope: {
        orgWide: false,
        accessibleSiteIds: ["site-lyon"],
        requestedSiteId: "site-lyon",
      },
      dimension: "human",
      dateFrom: "2026-03-07",
      dateTo: "2026-03-14",
    });

    expect(mockedQueryRows).toHaveBeenCalledTimes(1);
    const [sql, values] = mockedQueryRows.mock.calls[0] ?? [];
    expect(sql).toContain("WITH scoped_daily_forecasts AS");
    expect(sql).toContain("latest_run AS");
    expect(sql).toContain("COALESCE(d.site_id::text, '') = $3");
    expect(values).toEqual([
      ORGANIZATION_ID,
      "human",
      "site-lyon",
      "2026-03-07",
      "2026-03-14",
    ]);
    expect(result).toMatchObject([
      {
        id: "df-1",
        organizationId: ORGANIZATION_ID,
        siteId: "site-lyon",
        forecastDate: "2026-03-07",
        dimension: "human",
        predictedDemand: 120.5,
        capacityOptimalPredicted: 118,
      },
    ]);
  });

  it("scopes proof records by accessible site ids for non org-wide access", async () => {
    mockedQueryRows.mockResolvedValueOnce([
      {
        id: "proof-1",
        organization_id: ORGANIZATION_ID,
        site_id: "site-lyon",
        month: "2026-03-01",
        cout_bau_eur: "52000",
        cout_100_eur: "50000",
        cout_reel_eur: "49000",
        gain_net_eur: "3000",
        service_bau_pct: "0.941",
        service_reel_pct: "0.972",
        capture_rate: "0.76",
        bau_method_version: "bau-v2",
        attribution_confidence: "0.88",
        adoption_pct: "0.72",
        alertes_emises: "12",
        alertes_traitees: "10",
      },
    ] as never);

    const result = await listPersistentProofRecords({
      organizationId: ORGANIZATION_ID,
      scope: {
        orgWide: false,
        accessibleSiteIds: ["site-lyon", "site-paris"],
        requestedSiteId: null,
      },
    });

    expect(mockedQueryRows).toHaveBeenCalledTimes(1);
    const [sql, values] = mockedQueryRows.mock.calls[0] ?? [];
    expect(sql).toContain("pr.site_id = ANY");
    expect(values).toEqual([ORGANIZATION_ID, ["site-lyon", "site-paris"]]);
    expect(result[0]).toMatchObject({
      id: "proof-1",
      organizationId: ORGANIZATION_ID,
      siteId: "site-lyon",
      gainNetEur: 3000,
    });
  });

  it("fails closed when the requested site is outside the caller scope", async () => {
    mockedQueryRows.mockResolvedValueOnce([] as never);

    await listPersistentLatestDailyForecasts({
      organizationId: ORGANIZATION_ID,
      scope: {
        orgWide: false,
        accessibleSiteIds: ["site-lyon"],
        requestedSiteId: "site-paris",
      },
      dimension: "human",
      dateFrom: "2026-03-07",
      dateTo: "2026-03-14",
    });

    const [sql, values] = mockedQueryRows.mock.calls[0] ?? [];
    expect(sql).toContain("AND FALSE");
    expect(values).toEqual([
      ORGANIZATION_ID,
      "human",
      "2026-03-07",
      "2026-03-14",
    ]);
  });

  it("summarizes proof packs deterministically", () => {
    const summary = summarizePersistentProofRecords([
      {
        id: "proof-1",
        organizationId: ORGANIZATION_ID,
        siteId: "site-lyon",
        month: "2026-03-01",
        coutBauEur: 52000,
        cout100Eur: 50000,
        coutReelEur: 49000,
        gainNetEur: 3000,
        adoptionPct: 0.72,
        alertesEmises: 12,
        alertesTraitees: 10,
      },
      {
        id: "proof-2",
        organizationId: ORGANIZATION_ID,
        siteId: "site-paris",
        month: "2026-03-01",
        coutBauEur: 41000,
        cout100Eur: 39800,
        coutReelEur: 39000,
        gainNetEur: 2000,
        adoptionPct: 0.54,
        alertesEmises: 8,
        alertesTraitees: 7,
      },
    ]);

    expect(summary).toMatchObject({
      totalGainNetEur: 5000,
      avgAdoptionPct: 0.63,
      totalAlertesEmises: 20,
      totalAlertesTraitees: 17,
    });
    expect(summary.records).toHaveLength(2);
  });

  it("paginates persistent onboarding sessions", async () => {
    mockedQueryRows
      .mockResolvedValueOnce([{ count: "2" }] as never)
      .mockResolvedValueOnce([
        {
          id: "onb-1",
          organization_id: ORGANIZATION_ID,
          status: "completed",
          current_step: 5,
          steps_completed: [{ step: 1 }, { step: 2 }],
          initiated_by: "22222222-2222-4222-8222-222222222222",
          created_at: "2026-03-01T09:00:00.000Z",
          completed_at: "2026-03-05T17:00:00.000Z",
        },
      ] as never);

    const result = await listPersistentOnboardings({
      status: "completed",
      page: 2,
      pageSize: 10,
    });

    expect(mockedQueryRows).toHaveBeenCalledTimes(2);
    expect(mockedQueryRows.mock.calls[1]?.[1]).toEqual(["completed", 10, 10]);
    expect(result).toMatchObject({
      total: 2,
      items: [
        {
          id: "onb-1",
          organizationId: ORGANIZATION_ID,
          status: "completed",
          currentStep: 5,
        },
      ],
    });
  });
});
