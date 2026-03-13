import {
  getPublicOpenApiCompatibilityPolicy,
  hasPublicOpenApiSchema,
  listLoosePublicResponseSchemas,
  listLooseMutatingRequestOperations,
  listPublicOpenApiOperations,
} from "@praedixa/shared-types/public-contract-node";
import { describe, expect, it } from "vitest";

describe("public OpenAPI quality gates", () => {
  it("documents only the public and product-facing API surface", () => {
    const paths = new Set(
      listPublicOpenApiOperations().map((operation) => operation.path),
    );

    expect([...paths].some((path) => path.includes("/api/v1/admin/"))).toBe(
      false,
    );
    expect(paths.has("/api/v1/public/contact-requests")).toBe(true);
    expect(paths.has("/api/v1/live/dashboard/summary")).toBe(true);
    expect(paths.has("/api/v1/organizations/me")).toBe(true);
    expect(paths.has("/api/v1/forecasts/{forecastId}/summary")).toBe(true);
    expect(paths.has("/api/v1/decisions/{decisionId}/review")).toBe(true);
    expect(paths.has("/api/v1/datasets/{datasetId}/ingestion-log")).toBe(true);
    expect(paths.has("/api/v1/operational-decisions")).toBe(true);
    expect(paths.has("/api/v1/conversations/{convId}/messages")).toBe(true);
    expect(paths.has("/api/v1/support-thread/messages")).toBe(true);
  });

  it("publishes a compatibility and deprecation policy instead of implicit legacy behavior", () => {
    expect(getPublicOpenApiCompatibilityPolicy()).toEqual({
      additiveChangesWithinMajorOnly: true,
      breakingChangesRequireNewMajor: true,
      minDeprecationNoticeDays: 90,
      deprecationHeader: "Deprecation",
      sunsetHeader: "Sunset",
      replacementRequiredBeforeRemoval: true,
    });
  });

  it("keeps mutating request payload contracts explicit and reusable", () => {
    const operations = listPublicOpenApiOperations();

    expect(operations.length).toBeGreaterThan(0);
    expect(
      operations.every(
        (operation) =>
          !operation.hasRequestBody || operation.requestSchemaRef !== null,
      ),
    ).toBe(true);
  });

  it("assigns a stable operationId to every public operation", () => {
    const operationIds = listPublicOpenApiOperations().map(
      (operation) => operation.operationId,
    );

    expect(operationIds.length).toBeGreaterThan(0);
    expect(new Set(operationIds).size).toBe(operationIds.length);
    expect(
      operationIds.every((operationId) =>
        /^[A-Za-z][A-Za-z0-9]+$/.test(operationId),
      ),
    ).toBe(true);
  });

  it("uses named component schemas for every mutating request payload", () => {
    const operations = listPublicOpenApiOperations().filter(
      (operation) => operation.hasRequestBody,
    );

    expect(listLooseMutatingRequestOperations()).toEqual([]);
    expect(
      operations.every((operation) => {
        if (operation.requestSchemaRef == null) {
          return false;
        }

        const schemaName = operation.requestSchemaRef.replace(
          "#/components/schemas/",
          "",
        );
        return hasPublicOpenApiSchema(schemaName);
      }),
    ).toBe(true);
  });

  it("uses named strict component schemas for every published response payload", () => {
    const operations = listPublicOpenApiOperations();

    expect(
      operations.every(
        (operation) =>
          operation.responseSchemaRef?.startsWith("#/components/schemas/") ===
          true,
      ),
    ).toBe(true);
    expect(
      operations.every((operation) => {
        if (operation.responseSchemaRef == null) {
          return false;
        }

        const schemaName = operation.responseSchemaRef.replace(
          "#/components/schemas/",
          "",
        );
        return hasPublicOpenApiSchema(schemaName);
      }),
    ).toBe(true);
    expect(listLoosePublicResponseSchemas()).toEqual([]);
  });
});
