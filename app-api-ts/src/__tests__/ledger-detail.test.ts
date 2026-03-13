import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  LedgerDetailRequest as SharedLedgerDetailRequest,
  LedgerDetailResponse as SharedLedgerDetailResponse,
} from "@praedixa/shared-types/api";
import type { LedgerEntry } from "@praedixa/shared-types/domain";

import {
  LedgerDetailError,
  resolveLedgerDetail,
  type LedgerDetailRequest,
  type LedgerDetailResponse,
} from "../services/ledger-detail.js";

const history: LedgerEntry[] = [
  {
    kind: "LedgerEntry",
    schemaVersion: "1.0.0",
    ledgerId: "11111111-1111-1111-1111-111111111111",
    contractId: "coverage-core",
    contractVersion: 2,
    recommendationId: "22222222-2222-2222-2222-222222222222",
    status: "closed",
    revision: 1,
    scope: {
      entityType: "site",
      selector: { mode: "ids", ids: ["site-lyon"] },
      horizonId: "j7",
    },
    baseline: {
      recordedAt: "2026-03-13T08:00:00.000Z",
      values: { labor_hours: 100, service_level_pct: 94 },
    },
    recommended: {
      recordedAt: "2026-03-13T08:05:00.000Z",
      actionSummary: "Shift optimization",
      values: { labor_hours: 96, service_level_pct: 96 },
    },
    approvals: [],
    action: {
      actionId: "33333333-3333-3333-3333-333333333333",
      status: "acknowledged",
      destination: "wfm.shift",
    },
    actual: {
      recordedAt: "2026-03-13T18:00:00.000Z",
      values: { labor_hours: 97, service_level_pct: 95 },
    },
    counterfactual: {
      method: "baseline-v1",
    },
    roi: {
      currency: "EUR",
      estimatedValue: 180,
      realizedValue: 150,
      validationStatus: "validated",
      components: [
        {
          key: "labor_delta",
          label: "Labor delta",
          kind: "benefit",
          value: 150,
          validationStatus: "validated",
        },
      ],
    },
    explanation: {
      topDrivers: ["coverage_gap_h"],
      bindingConstraints: ["legal_rest"],
    },
    openedAt: "2026-03-13T08:00:00.000Z",
    closedAt: "2026-03-13T18:00:00.000Z",
  },
  {
    kind: "LedgerEntry",
    schemaVersion: "1.0.0",
    ledgerId: "11111111-1111-1111-1111-111111111111",
    contractId: "coverage-core",
    contractVersion: 2,
    recommendationId: "22222222-2222-2222-2222-222222222222",
    status: "recalculated",
    revision: 2,
    scope: {
      entityType: "site",
      selector: { mode: "ids", ids: ["site-lyon"] },
      horizonId: "j7",
    },
    baseline: {
      recordedAt: "2026-03-13T08:00:00.000Z",
      values: { labor_hours: 100, service_level_pct: 94 },
    },
    recommended: {
      recordedAt: "2026-03-13T08:05:00.000Z",
      actionSummary: "Shift optimization",
      values: { labor_hours: 96, service_level_pct: 96 },
    },
    approvals: [],
    action: {
      actionId: "33333333-3333-3333-3333-333333333333",
      status: "acknowledged",
      destination: "wfm.shift",
    },
    actual: {
      recordedAt: "2026-03-14T18:00:00.000Z",
      values: { labor_hours: 95, service_level_pct: 97 },
    },
    counterfactual: {
      method: "baseline-v1",
    },
    roi: {
      currency: "EUR",
      estimatedValue: 220,
      realizedValue: 210,
      validationStatus: "validated",
      components: [
        {
          key: "labor_delta",
          label: "Labor delta",
          kind: "benefit",
          value: 210,
          validationStatus: "validated",
        },
      ],
    },
    explanation: {
      topDrivers: ["coverage_gap_h"],
      bindingConstraints: ["legal_rest"],
    },
    openedAt: "2026-03-13T08:00:00.000Z",
    closedAt: "2026-03-14T18:00:00.000Z",
    supersedes: {
      ledgerId: "11111111-1111-1111-1111-111111111111",
      revision: 1,
    },
  },
];

describe("ledger-detail service", () => {
  it("keeps request and response shapes aligned with shared API types", () => {
    expectTypeOf<LedgerDetailRequest>().toMatchTypeOf<SharedLedgerDetailRequest>();
    expectTypeOf<LedgerDetailResponse>().toMatchTypeOf<SharedLedgerDetailResponse>();
  });

  it("resolves a finance-grade ledger detail with revision lineage", () => {
    const detail = resolveLedgerDetail(history, {
      ledgerId: "11111111-1111-1111-1111-111111111111",
      revision: 2,
      requiredComponentKeys: ["labor_delta"],
      exportFormats: ["csv", "json"],
    });

    expect(detail.selectedRevision).toBe(2);
    expect(detail.latestRevision).toBe(2);
    expect(detail.validationBanner.status).toBe("validated");
    expect(detail.exportReadiness).toEqual([
      {
        format: "csv",
        status: "ready",
        blockers: [],
      },
      {
        format: "json",
        status: "ready",
        blockers: [],
      },
    ]);
    expect(detail.revisionLineage).toHaveLength(2);
    expect(
      detail.deltaSummary.metrics.find(
        (metric) => metric.key === "labor_hours",
      ),
    ).toMatchObject({
      baselineValue: 100,
      recommendedValue: 96,
      actualValue: 95,
    });
  });

  it("fails closed when a required ROI component is missing", () => {
    expect(() =>
      resolveLedgerDetail(history, {
        ledgerId: "11111111-1111-1111-1111-111111111111",
        requiredComponentKeys: ["missing_component"],
      }),
    ).toThrow(LedgerDetailError);
  });
});
