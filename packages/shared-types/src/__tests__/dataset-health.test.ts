import { describe, expect, it } from "vitest";

import {
  buildDatasetHealthView,
  buildDatasetHealthViews,
  type DatasetHealthInput,
} from "../domain/dataset-health.js";

const EVALUATED_AT = "2026-03-13T12:00:00.000Z";

function makeInput(
  overrides: Partial<DatasetHealthInput> = {},
): DatasetHealthInput {
  return {
    datasetKey: "gold.coverage",
    datasetLabel: "Coverage Gold",
    evaluatedAt: EVALUATED_AT,
    freshness: {
      lastRefreshedAt: "2026-03-13T11:30:00.000Z",
      maxAgeMinutes: 60,
    },
    lineage: {
      upstreamDatasets: ["silver.coverage", "bronze.coverage"],
      missingUpstreamDatasets: [],
      brokenUpstreamDatasets: [],
    },
    processedVolume: {
      processedRows: 1200,
      expectedMinRows: 1000,
    },
    errorRate: {
      failedRuns: 1,
      totalRuns: 100,
    },
    lastSuccessfulRun: {
      completedAt: "2026-03-13T11:20:00.000Z",
      maxAgeMinutes: 90,
      runId: "run-001",
    },
    ...overrides,
  };
}

describe("buildDatasetHealthView", () => {
  it("classifies a healthy dataset as ready", () => {
    const view = buildDatasetHealthView(makeInput());

    expect(view.readiness).toBe("ready");
    expect(view.issues).toEqual([]);
    expect(view.freshness).toMatchObject({
      status: "ready",
      ageMinutes: 30,
      isFresh: true,
    });
    expect(view.lastSuccessfulRun).toMatchObject({
      status: "ready",
      ageMinutes: 40,
      runId: "run-001",
    });
  });

  it("classifies low processed volume as degraded", () => {
    const view = buildDatasetHealthView(
      makeInput({
        processedVolume: {
          processedRows: 850,
          expectedMinRows: 1000,
        },
      }),
    );

    expect(view.readiness).toBe("degraded");
    expect(view.processedVolume).toMatchObject({
      status: "degraded",
      deficitRows: 150,
    });
    expect(view.issues).toEqual([
      {
        code: "processed_volume_low",
        severity: "degraded",
        message: "Processed volume is short by 150 row(s)",
      },
    ]);
  });

  it("classifies stale freshness as stale", () => {
    const view = buildDatasetHealthView(
      makeInput({
        freshness: {
          lastRefreshedAt: "2026-03-13T09:45:00.000Z",
          maxAgeMinutes: 60,
        },
      }),
    );

    expect(view.readiness).toBe("stale");
    expect(view.freshness).toMatchObject({
      status: "stale",
      ageMinutes: 135,
      isFresh: false,
    });
    expect(view.issues[0]).toMatchObject({
      code: "freshness_stale",
      severity: "stale",
    });
  });

  it("classifies missing lineage and missing successful run as error", () => {
    const view = buildDatasetHealthView(
      makeInput({
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

    expect(view.readiness).toBe("error");
    expect(view.lineage).toMatchObject({
      status: "error",
      readyUpstreamCount: 0,
      missingUpstreamDatasets: ["bronze.coverage"],
      brokenUpstreamDatasets: ["silver.coverage"],
    });
    expect(view.issues.map((issue) => issue.code)).toEqual([
      "last_success_missing",
      "lineage_broken_dependencies",
      "lineage_missing_dependencies",
    ]);
  });

  it("normalizes lineage lists and sorts aggregated views deterministically", () => {
    const staleView = makeInput({
      datasetKey: "silver.coverage",
      freshness: {
        lastRefreshedAt: "2026-03-13T09:59:00.000Z",
        maxAgeMinutes: 30,
      },
      lineage: {
        upstreamDatasets: ["bronze.z", "bronze.a", "bronze.a"],
        missingUpstreamDatasets: [],
        brokenUpstreamDatasets: [],
      },
    });
    const readyView = makeInput({
      datasetKey: "gold.coverage",
    });
    const errorView = makeInput({
      datasetKey: "bronze.coverage",
      lineage: {
        upstreamDatasets: ["bronze.z", "bronze.a", "bronze.a"],
        missingUpstreamDatasets: ["bronze.z", "bronze.a"],
        brokenUpstreamDatasets: [],
      },
    });

    const views = buildDatasetHealthViews([readyView, staleView, errorView]);

    expect(views.map((view) => [view.datasetKey, view.readiness])).toEqual([
      ["bronze.coverage", "error"],
      ["silver.coverage", "stale"],
      ["gold.coverage", "ready"],
    ]);
    expect(views[0]?.lineage.upstreamDatasets).toEqual([
      "bronze.a",
      "bronze.z",
    ]);
    expect(views[0]?.lineage.missingUpstreamDatasets).toEqual([
      "bronze.a",
      "bronze.z",
    ]);
  });
});
