import { assertType, describe, expectTypeOf, it } from "vitest";
import type {
  DatasetHealthApiRequest,
  DatasetHealthApiResponse,
} from "../api/dataset-health.js";

describe("dataset-health API types", () => {
  it("accepts filterable dataset health requests", () => {
    assertType<DatasetHealthApiRequest>({
      filter: {
        severities: ["error", "stale"],
        sourceKeys: ["wms"],
      },
      sort: {
        field: "severity",
        direction: "desc",
      },
      groupBy: "source",
    });
  });

  it("exposes grouped dataset health responses", () => {
    expectTypeOf<DatasetHealthApiResponse>().toHaveProperty("summary");
    expectTypeOf<DatasetHealthApiResponse>().toHaveProperty("datasets");
    expectTypeOf<DatasetHealthApiResponse>().toHaveProperty("groups");
  });
});
