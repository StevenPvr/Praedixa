import { describe, expect, it } from "vitest";

import {
  aggregateDatasetHealth,
  aggregateDatasetHealthList,
  type DatasetHealthInput,
} from "../services/data-health.js";

const EVALUATED_AT = "2026-03-13T12:00:00.000Z";

function makeSnapshot(
  overrides: Partial<DatasetHealthInput> = {},
): DatasetHealthInput {
  return {
    datasetKey: "gold.coverage",
    datasetLabel: "Coverage Gold",
    evaluatedAt: EVALUATED_AT,
    freshness: {
      lastRefreshedAt: "2026-03-13T11:35:00.000Z",
      maxAgeMinutes: 60,
    },
    lineage: {
      upstreamDatasets: ["silver.coverage", "bronze.coverage"],
      missingUpstreamDatasets: [],
      brokenUpstreamDatasets: [],
    },
    processedVolume: {
      processedRows: 1500,
      expectedMinRows: 1000,
    },
    errorRate: {
      failedRuns: 1,
      totalRuns: 50,
    },
    lastSuccessfulRun: {
      completedAt: "2026-03-13T11:20:00.000Z",
      maxAgeMinutes: 90,
      runId: "run-123",
    },
    ...overrides,
  };
}

describe("aggregateDatasetHealth", () => {
  it("returns a ready aggregate when all signals are healthy", () => {
    const aggregate = aggregateDatasetHealth(makeSnapshot());

    expect(aggregate.readiness).toBe("ready");
    expect(aggregate.issues).toEqual([]);
    expect(aggregate.freshness.ageMinutes).toBe(25);
    expect(aggregate.lastSuccessfulRun.ageMinutes).toBe(40);
  });

  it("returns degraded for elevated error rate or low processed volume", () => {
    const aggregate = aggregateDatasetHealth(
      makeSnapshot({
        processedVolume: {
          processedRows: 900,
          expectedMinRows: 1000,
        },
        errorRate: {
          failedRuns: 3,
          totalRuns: 30,
        },
      }),
    );

    expect(aggregate.readiness).toBe("degraded");
    expect(aggregate.errorRate).toMatchObject({
      status: "degraded",
      errorRatePct: 10,
    });
    expect(aggregate.processedVolume).toMatchObject({
      status: "degraded",
      deficitRows: 100,
    });
    expect(aggregate.issues.map((issue) => issue.code)).toEqual([
      "error_rate_elevated",
      "processed_volume_low",
    ]);
  });

  it("returns stale for stale freshness even when other signals are healthy", () => {
    const aggregate = aggregateDatasetHealth(
      makeSnapshot({
        freshness: {
          lastRefreshedAt: "2026-03-13T09:00:00.000Z",
          maxAgeMinutes: 60,
        },
      }),
    );

    expect(aggregate.readiness).toBe("stale");
    expect(aggregate.freshness).toMatchObject({
      status: "stale",
      ageMinutes: 180,
    });
    expect(aggregate.issues).toEqual([
      {
        code: "freshness_stale",
        severity: "stale",
        message: "The dataset freshness exceeds the allowed age",
      },
    ]);
  });

  it("returns error for broken lineage or missing successful run", () => {
    const aggregate = aggregateDatasetHealth(
      makeSnapshot({
        lineage: {
          upstreamDatasets: ["silver.coverage", "bronze.coverage"],
          missingUpstreamDatasets: ["bronze.coverage"],
          brokenUpstreamDatasets: ["silver.coverage"],
        },
        lastSuccessfulRun: {
          completedAt: null,
          maxAgeMinutes: 90,
          runId: null,
        },
      }),
    );

    expect(aggregate.readiness).toBe("error");
    expect(aggregate.lineage.status).toBe("error");
    expect(aggregate.issues.map((issue) => issue.code)).toEqual([
      "last_success_missing",
      "lineage_broken_dependencies",
      "lineage_missing_dependencies",
    ]);
  });
});

describe("aggregateDatasetHealthList", () => {
  it("sorts aggregates deterministically by readiness then dataset key", () => {
    const aggregates = aggregateDatasetHealthList([
      makeSnapshot({ datasetKey: "zeta.ready" }),
      makeSnapshot({
        datasetKey: "beta.error",
        errorRate: {
          failedRuns: 4,
          totalRuns: 10,
        },
        lineage: {
          upstreamDatasets: ["bronze.z", "bronze.a", "bronze.a"],
          missingUpstreamDatasets: ["bronze.z", "bronze.a"],
          brokenUpstreamDatasets: [],
        },
      }),
      makeSnapshot({
        datasetKey: "alpha.stale",
        freshness: {
          lastRefreshedAt: "2026-03-13T08:30:00.000Z",
          maxAgeMinutes: 60,
        },
        lineage: {
          upstreamDatasets: ["bronze.z", "bronze.a", "bronze.a"],
          missingUpstreamDatasets: [],
          brokenUpstreamDatasets: [],
        },
      }),
    ]);

    expect(aggregates.map((aggregate) => aggregate.datasetKey)).toEqual([
      "beta.error",
      "alpha.stale",
      "zeta.ready",
    ]);
    expect(aggregates[0]?.lineage.upstreamDatasets).toEqual([
      "bronze.a",
      "bronze.z",
    ]);
    expect(aggregates[0]?.lineage.missingUpstreamDatasets).toEqual([
      "bronze.a",
      "bronze.z",
    ]);
  });
});
