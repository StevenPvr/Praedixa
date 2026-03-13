import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  DatasetHealthApiRequest as SharedDatasetHealthApiRequest,
  DatasetHealthApiResponse as SharedDatasetHealthApiResponse,
} from "@praedixa/shared-types/api";
import type { DatasetHealthInput } from "@praedixa/shared-types/domain";

import {
  buildDatasetHealthApiResponseFromInputs,
  type DatasetHealthApiRequest,
  type DatasetHealthApiResponse,
} from "../services/dataset-health-api.js";

const inputs: DatasetHealthInput[] = [
  {
    datasetKey: "wms.ops.coverage",
    datasetLabel: "Coverage",
    evaluatedAt: "2026-03-13T10:00:00.000Z",
    freshness: {
      lastRefreshedAt: "2026-03-13T09:00:00.000Z",
      maxAgeMinutes: 120,
    },
    lineage: {
      upstreamDatasets: ["wms.ops.forecast"],
    },
    processedVolume: {
      processedRows: 1200,
      expectedMinRows: 1000,
    },
    errorRate: {
      failedRuns: 0,
      totalRuns: 10,
    },
    lastSuccessfulRun: {
      completedAt: "2026-03-13T09:00:00.000Z",
      runId: "run-1",
      maxAgeMinutes: 120,
    },
  },
  {
    datasetKey: "wms.ops.backlog",
    datasetLabel: "Backlog",
    evaluatedAt: "2026-03-13T10:00:00.000Z",
    freshness: {
      lastRefreshedAt: "2026-03-13T04:00:00.000Z",
      maxAgeMinutes: 120,
    },
    lineage: {
      upstreamDatasets: ["wms.ops.orders"],
      missingUpstreamDatasets: ["wms.ops.orders"],
    },
    processedVolume: {
      processedRows: 120,
      expectedMinRows: 1000,
    },
    errorRate: {
      failedRuns: 3,
      totalRuns: 10,
    },
    lastSuccessfulRun: {
      completedAt: "2026-03-13T04:00:00.000Z",
      runId: "run-2",
      maxAgeMinutes: 120,
    },
  },
];

describe("dataset-health API service", () => {
  it("keeps request and response shapes aligned with shared API types", () => {
    expectTypeOf<DatasetHealthApiRequest>().toMatchTypeOf<SharedDatasetHealthApiRequest>();
    expectTypeOf<DatasetHealthApiResponse>().toMatchTypeOf<SharedDatasetHealthApiResponse>();
  });

  it("builds grouped dataset health responses with severity summaries", () => {
    const response = buildDatasetHealthApiResponseFromInputs(inputs, {
      groupBy: "source",
      sort: {
        field: "severity",
        direction: "desc",
      },
    });

    expect(response.summary).toEqual({
      totalDatasets: 2,
      ready: 1,
      degraded: 0,
      stale: 0,
      error: 1,
      highestSeverity: "error",
    });
    expect(response.datasets[0]?.identity.datasetKey).toBe("wms.ops.backlog");
    expect(
      response.datasets[0]?.recommendedActions.map((action) => action.code),
    ).toEqual([
      "reduceErrorRate",
      "repairLineage",
      "triggerRefresh",
      "reviewProcessedVolume",
    ]);
    expect(response.groups).toHaveLength(1);
    expect(response.groups[0]?.groupKey).toBe("wms");
  });
});
